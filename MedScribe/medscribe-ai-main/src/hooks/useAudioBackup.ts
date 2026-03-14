"use client";

import { useState, useEffect, useCallback } from "react";
import type { LiveTranscriptItem } from "@/types";
import {
  type AudioBackupRecord,
  listPendingBackups,
  pruneExpiredBackups,
  deleteAudioBackup,
  markBackupTranscribed,
  getAudioBackup,
} from "@/lib/audioBackup";

export type { AudioBackupRecord };

export interface UseAudioBackupReturn {
  /** Backups with status='saved' — transcription was not confirmed for these. */
  pendingBackups: AudioBackupRecord[];
  /** Whether the initial IDB load is in progress. */
  isLoading: boolean;
  /**
   * Re-attempt transcription for a backup.
   * On success, marks it transcribed + removes from pendingBackups.
   * Returns the transcript items so the caller can display them.
   */
  retranscribe: (
    id: string,
    onProgress?: (msg: string) => void
  ) => Promise<LiveTranscriptItem[] | null>;
  /**
   * Permanently delete a backup record without transcribing.
   * Use when the doctor decides the recording is not needed.
   */
  dismiss: (id: string) => Promise<void>;
  /** Download the raw audio blob (e.g. as a fallback). */
  downloadAudio: (id: string) => Promise<void>;
  /** Refresh the pending list (call after manual changes). */
  refresh: () => Promise<void>;
}

export function useAudioBackup(): UseAudioBackupReturn {
  const [pendingBackups, setPendingBackups] = useState<AudioBackupRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const pending = await listPendingBackups();
      setPendingBackups(pending);
    } catch {
      // IDB unavailable — silently ignore
    }
  }, []);

  // On mount: prune old records, then load pending list
  useEffect(() => {
    let cancelled = false;

    (async () => {
      await pruneExpiredBackups();
      if (!cancelled) {
        await refresh();
        setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [refresh]);

  const retranscribe = useCallback(
    async (
      id: string,
      onProgress?: (msg: string) => void
    ): Promise<LiveTranscriptItem[] | null> => {
      const record = await getAudioBackup(id);
      if (!record) return null;

      onProgress?.("Retranscribing recording…");

      try {
        const headers: Record<string, string> = {
          "Content-Type": record.mimeType || "audio/webm",
          "X-Audio-Language": record.language,
        };
        if (record.isMultichannel) headers["X-Audio-Mode"] = "multichannel";

        const response = await fetch("/api/deepgram/transcribe", {
          method: "POST",
          headers,
          body: record.audioBlob,
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(
            (errData as { error?: string }).error ||
              `Transcription failed (${response.status})`
          );
        }

        const result = (await response.json()) as {
          segments?: Array<{
            speaker: number;
            text: string;
            start_time: number;
            confidence: number;
          }>;
        };

        const items: LiveTranscriptItem[] = (result.segments ?? []).map(
          (seg) => ({
            speaker: seg.speaker,
            text: seg.text,
            timestamp: seg.start_time,
            isFinal: true,
            confidence: seg.confidence,
          })
        );

        // Mark transcribed and remove from the pending list
        await markBackupTranscribed(id);
        setPendingBackups((prev) => prev.filter((b) => b.id !== id));
        onProgress?.("Transcription complete.");
        return items;
      } catch (err) {
        onProgress?.(
          `Retry failed: ${err instanceof Error ? err.message : "unknown error"}`
        );
        return null;
      }
    },
    []
  );

  const dismiss = useCallback(async (id: string) => {
    await deleteAudioBackup(id);
    setPendingBackups((prev) => prev.filter((b) => b.id !== id));
  }, []);

  const downloadAudio = useCallback(async (id: string) => {
    const record = await getAudioBackup(id);
    if (!record) return;

    const url = URL.createObjectURL(record.audioBlob);
    const a = document.createElement("a");
    a.href = url;
    // Format: medscribe-<consultationId-short>-<date>.webm
    const dateStr = new Date(record.startedAt).toISOString().slice(0, 10);
    a.download = `medscribe-${record.consultationId.slice(0, 8)}-${dateStr}.webm`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, []);

  return {
    pendingBackups,
    isLoading,
    retranscribe,
    dismiss,
    downloadAudio,
    refresh,
  };
}
