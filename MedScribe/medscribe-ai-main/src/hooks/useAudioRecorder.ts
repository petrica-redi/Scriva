"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import type {
  ConnectionStatus,
  ConsultationMode,
  LiveTranscriptItem,
} from "@/types";
import {
  saveAudioBackup,
  markBackupTranscribed,
} from "@/lib/audioBackup";

interface UseAudioRecorderOptions {
  mode?: ConsultationMode;
  /** Primary language (doctor's language). Use "multi" for Deepgram multilingual mode. */
  language?: string;
  /**
   * When set and different from `language`, opens a SECOND Deepgram WebSocket
   * for this language in parallel. Audio is sent to both connections; the
   * connection with higher confidence per utterance wins (which also identifies
   * the speaker: language → speaker 0, patientLanguage → speaker 1).
   * This gives full accuracy for both languages simultaneously, bypassing the
   * limitations of Deepgram's `language=multi` mode (which e.g. excludes Romanian).
   */
  patientLanguage?: string;
  streaming?: boolean;
  /**
   * Provide the consultation ID to enable local audio backup via IndexedDB.
   * When set, the assembled audio blob is saved to IDB before the transcription
   * API call. On success the record is marked 'transcribed'. On failure it
   * remains as 'saved', visible to the recovery UI in useAudioBackup.
   */
  consultationId?: string;
  onTranscriptUpdate?: (items: LiveTranscriptItem[]) => void;
  onError?: (error: string) => void;
}

interface UseAudioRecorderReturn {
  isRecording: boolean;
  isPaused: boolean;
  duration: number;
  audioLevel: number;
  connectionStatus: ConnectionStatus;
  transcript: LiveTranscriptItem[];
  isTranscribing: boolean;
  captureMode: ConsultationMode;
  isMultichannel: boolean;
  streamingActive: boolean;
  streamingStatus: string;
  remoteVideoStream: MediaStream | null;
  /** IDB record ID of the local backup written before batch transcription. */
  backupId: string | null;
  startRecording: () => Promise<void>;
  /**
   * Stops the recorder and runs any necessary batch transcription.
   * Resolves with the final transcript items so the caller doesn't have to
   * read the (potentially stale) React state after awaiting this function.
   */
  stopRecording: () => Promise<LiveTranscriptItem[]>;
  pauseRecording: () => void;
  resumeRecording: () => void;
  /** Download the raw audio recorded so far (during or after recording) */
  downloadCurrentAudio: () => void;
  error: string | null;
}

export function useAudioRecorder({
  mode = "in-person",
  language = "en",
  patientLanguage,
  streaming = true,
  consultationId,
  onTranscriptUpdate,
  onError,
}: UseAudioRecorderOptions): UseAudioRecorderReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [duration, setDuration] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);
  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus>("disconnected");
  const [transcript, setTranscript] = useState<LiveTranscriptItem[]>([]);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isMultichannel, setIsMultichannel] = useState(false);
  const [streamingActive, setStreamingActive] = useState(false);
  const [streamingStatus, setStreamingStatus] = useState("idle");
  const [remoteVideoStream, setRemoteVideoStream] = useState<MediaStream | null>(null);
  const [backupId, setBackupId] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const micStreamRef = useRef<MediaStream | null>(null);
  const tabStreamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const durationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null
  );
  const levelAnimationRef = useRef<number | null>(null);
  const pausedDurationRef = useRef(0);
  const recordingStartRef = useRef(0);
  const isMultichannelRef = useRef(false);
  const languageRef = useRef("en");

  const wsRef = useRef<WebSocket | null>(null);
  /** Second WebSocket for patient language (dual-lang mode) */
  const wsPatientRef = useRef<WebSocket | null>(null);
  const streamingRef = useRef(false);
  const transcriptRef = useRef<LiveTranscriptItem[]>([]);
  const chunksSentRef = useRef(0);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);

  /**
   * Pending utterances when in dual-WS mode. Keyed by rounded timestamp (50ms
   * buckets).  Each entry accumulates one result from each WebSocket; once both
   * sides have fired we pick the winner by confidence.
   */
  type PendingSide = { text: string; confidence: number; isFinal: boolean; lang: string };
  const pendingDualRef = useRef<Map<number, { doctor?: PendingSide; patient?: PendingSide; settled?: true }>>(new Map());

  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intentionalCloseRef = useRef(false);
  const dgKeyRef = useRef<string | null>(null);
  /** "bearer" when using a temporary JWT, "token" when using a raw API key */
  const dgAuthTypeRef = useRef<"bearer" | "token">("bearer");
  const wsParamsRef = useRef<string>("");
  const MAX_RECONNECT_ATTEMPTS = 5;

  // ── Periodic batch fallback (fires when all WS reconnect attempts fail) ───
  const periodicFlushIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const periodicFlushActiveRef = useRef(false);
  const inPeriodicFlushRef = useRef(false);
  // Captured mimeType so the flush callback doesn't close over a stale value
  const mimeTypeRef = useRef("audio/webm");

  /**
   * Send ALL accumulated chunks to the batch transcription API and replace the
   * current transcript with the result.  Sending the full audio each time
   * (rather than a delta) gives the STT model full context and produces better
   * speaker-diarization results.  The transcript "refreshes" every 10 s, which
   * is acceptable — the doctor is not supposed to edit mid-recording.
   */
  const doPeriodicFlush = useCallback(async () => {
    if (inPeriodicFlushRef.current || chunksRef.current.length === 0) return;

    inPeriodicFlushRef.current = true;
    setStreamingStatus("updating transcript…");

    try {
      const audioBlob = new Blob(chunksRef.current, { type: mimeTypeRef.current });
      const headers: Record<string, string> = {
        "Content-Type": mimeTypeRef.current || "audio/webm",
        "X-Audio-Language": languageRef.current,
      };
      if (isMultichannelRef.current) headers["X-Audio-Mode"] = "multichannel";

      const response = await fetch("/api/deepgram/transcribe", {
        method: "POST",
        headers,
        body: audioBlob,
      });

      if (!response.ok) throw new Error(`${response.status}`);

      const result = await response.json();
      const items: LiveTranscriptItem[] = (
        (result as { segments?: Array<{ speaker: number; text: string; start_time: number; confidence: number }> }).segments ?? []
      ).map((seg) => ({
        speaker: seg.speaker,
        text: seg.text,
        timestamp: seg.start_time,
        isFinal: true,
        confidence: seg.confidence,
      }));

      if (items.length > 0) {
        setTranscript(items);
        transcriptRef.current = items;
        onTranscriptUpdate?.(items);
      }

      setStreamingStatus("recording locally · transcript updated");
    } catch {
      setStreamingStatus("recording locally · transcript update failed, retrying…");
    } finally {
      inPeriodicFlushRef.current = false;
    }
  }, [onTranscriptUpdate]);

  const reconnectWebSocket = useCallback(() => {
    // Always bail on intentional close or missing credentials
    if (intentionalCloseRef.current || !dgKeyRef.current || !wsParamsRef.current) {
      return;
    }

    // All reconnect attempts exhausted → switch to periodic batch fallback
    if (reconnectAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS) {
      setStreamingActive(false);
      setConnectionStatus("connected"); // mic is still active
      setStreamingStatus(
        "Deepgram unavailable — recording locally, transcript updates every 10 s"
      );
      mimeTypeRef.current = mediaRecorderRef.current?.mimeType ?? "audio/webm";
      periodicFlushActiveRef.current = true;

      if (!periodicFlushIntervalRef.current) {
        // First update after 5 s (give the final failed WS attempt time to settle)
        setTimeout(() => {
          if (periodicFlushActiveRef.current) void doPeriodicFlush();
        }, 5_000);
        periodicFlushIntervalRef.current = setInterval(
          () => void doPeriodicFlush(),
          10_000
        );
      }
      return;
    }

    const attempt = ++reconnectAttemptsRef.current;
    const delay = Math.min(1000 * Math.pow(2, attempt - 1), 16000);
    setStreamingStatus(`reconnecting (attempt ${attempt}/${MAX_RECONNECT_ATTEMPTS})...`);

    reconnectTimeoutRef.current = setTimeout(() => {
      if (intentionalCloseRef.current) return;

      const wsUrl = `wss://api.deepgram.com/v1/listen?${wsParamsRef.current}`;
      const ws = new WebSocket(wsUrl, [dgAuthTypeRef.current, dgKeyRef.current as string]);
      ws.binaryType = "arraybuffer";

      const useMultichannel = isMultichannelRef.current;
      const timeout = setTimeout(() => {
        ws.close();
        reconnectWebSocket();
      }, 8000);

      ws.onopen = () => {
        clearTimeout(timeout);
        wsRef.current = ws;
        streamingRef.current = true;
        setStreamingActive(true);
        setStreamingStatus("streaming live (reconnected)");
        setConnectionStatus("connected");
        reconnectAttemptsRef.current = 0;
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(
            typeof event.data === "string"
              ? event.data
              : new TextDecoder().decode(event.data)
          );
          if (data.type === "Results" && data.channel) {
            const alt = data.channel.alternatives?.[0];
            if (!alt || !alt.transcript) return;
            const speaker = useMultichannel
              ? (data.channel_index?.[0] ?? 0)
              : (alt.words?.[0]?.speaker ?? 0);
            const isFinal = data.is_final === true;

            const detectedLanguage =
              alt.languages?.[0] ??
              alt.words?.[0]?.language ??
              data.channel?.detected_language ??
              undefined;

            const item: LiveTranscriptItem = {
              speaker,
              text: alt.transcript,
              timestamp: data.start ?? 0,
              isFinal,
              confidence: alt.confidence ?? 0,
              detectedLanguage,
            };
            if (!alt.transcript.trim()) return;
            setTranscript((prev) => {
              const last = prev[prev.length - 1];
              const lastIsInterim = last && !last.isFinal;
              let next: LiveTranscriptItem[];
              if (isFinal) {
                next = lastIsInterim ? [...prev.slice(0, -1), item] : [...prev, item];
              } else {
                next = lastIsInterim ? [...prev.slice(0, -1), item] : [...prev, item];
              }
              transcriptRef.current = next;
              onTranscriptUpdate?.(next);
              return next;
            });
          }
        } catch { /* ignore */ }
      };

      ws.onerror = () => {
        clearTimeout(timeout);
      };

      ws.onclose = () => {
        streamingRef.current = false;
        setStreamingActive(false);
        if (!intentionalCloseRef.current) {
          reconnectWebSocket();
        }
      };
    }, delay);
  }, [onTranscriptUpdate, doPeriodicFlush]);

  const cleanup = useCallback(() => {
    intentionalCloseRef.current = true;

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    reconnectAttemptsRef.current = 0;

    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      try {
        mediaRecorderRef.current.stop();
      } catch {
        /* already stopped */
      }
    }
    mediaRecorderRef.current = null;

    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((track) => track.stop());
      micStreamRef.current = null;
    }
    if (tabStreamRef.current) {
      tabStreamRef.current.getTracks().forEach((track) => track.stop());
      tabStreamRef.current = null;
    }
    setRemoteVideoStream(null);
    if (wsRef.current) {
      try {
        if (wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({ type: "CloseStream" }));
          wsRef.current.close();
        }
      } catch { /* ignore */ }
      wsRef.current = null;
    }
    if (wsPatientRef.current) {
      try {
        if (wsPatientRef.current.readyState === WebSocket.OPEN) {
          wsPatientRef.current.send(JSON.stringify({ type: "CloseStream" }));
          wsPatientRef.current.close();
        }
      } catch { /* ignore */ }
      wsPatientRef.current = null;
    }
    pendingDualRef.current.clear();
    streamingRef.current = false;

    if (workletNodeRef.current) {
      workletNodeRef.current.disconnect();
      workletNodeRef.current = null;
    }

    if (audioContextRef.current?.state !== "closed") {
      audioContextRef.current?.close();
    }
    audioContextRef.current = null;
    analyserRef.current = null;

    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }
    if (levelAnimationRef.current) {
      cancelAnimationFrame(levelAnimationRef.current);
      levelAnimationRef.current = null;
    }

    if (periodicFlushIntervalRef.current) {
      clearInterval(periodicFlushIntervalRef.current);
      periodicFlushIntervalRef.current = null;
    }
    periodicFlushActiveRef.current = false;
    inPeriodicFlushRef.current = false;

    setAudioLevel(0);
    setStreamingActive(false);
    dgKeyRef.current = null;
  }, []);

  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  const startLevelMonitoring = useCallback(() => {
    if (!analyserRef.current) return;
    const analyser = analyserRef.current;
    const dataArray = new Uint8Array(analyser.frequencyBinCount);

    const updateLevel = () => {
      analyser.getByteFrequencyData(dataArray);
      const avg =
        dataArray.reduce((sum, val) => sum + val, 0) / dataArray.length;
      setAudioLevel(avg / 255);
      levelAnimationRef.current = requestAnimationFrame(updateLevel);
    };
    updateLevel();
  }, []);

  const startInPersonRecording =
    useCallback(async (): Promise<MediaStream> => {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: true,
        },
      });
      micStreamRef.current = stream;
      isMultichannelRef.current = false;
      setIsMultichannel(false);
      return stream;
    }, []);

  const startRemoteRecording = useCallback(async (): Promise<MediaStream> => {
    // Channel 0 = Doctor's microphone (echoCancellation ON for clean voice)
    // Channel 1 = Patient's audio captured from the Google Meet browser tab
    const micStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });
    micStreamRef.current = micStream;

    if (!navigator.mediaDevices.getDisplayMedia) {
      isMultichannelRef.current = false;
      setIsMultichannel(false);
      return micStream;
    }

    let tabStream: MediaStream | null = null;
    try {
      tabStream = await navigator.mediaDevices.getDisplayMedia({
        audio: true,
        video: true,
      });
    } catch {
      // User cancelled tab sharing — fall back to mic-only with diarization
      isMultichannelRef.current = false;
      setIsMultichannel(false);
      return micStream;
    }

    // Show the shared tab's video (Google Meet) in the consultation UI
    const videoTracks = tabStream.getVideoTracks();
    if (videoTracks.length > 0) {
      setRemoteVideoStream(new MediaStream(videoTracks));
    }

    const tabAudioTracks = tabStream.getAudioTracks();
    if (tabAudioTracks.length === 0) {
      // Tab shared without audio — clean up video-only tab stream
      tabStream.getTracks().forEach((t) => t.stop());
      isMultichannelRef.current = false;
      setIsMultichannel(false);
      return micStream;
    }

    tabStreamRef.current = tabStream;

    const audioCtx = new AudioContext();
    audioContextRef.current = audioCtx;

    const micSource = audioCtx.createMediaStreamSource(micStream);
    const tabSource = audioCtx.createMediaStreamSource(
      new MediaStream(tabAudioTracks)
    );

    const merger = audioCtx.createChannelMerger(2);
    micSource.connect(merger, 0, 0);
    tabSource.connect(merger, 0, 1);

    const dest = audioCtx.createMediaStreamDestination();
    merger.connect(dest);

    // Use AudioWorkletNode for interleaved Int16 PCM → Deepgram multichannel
    try {
      await audioCtx.audioWorklet.addModule("/audio-interleaver.js");
      const workletNode = new AudioWorkletNode(audioCtx, "interleaver-processor", {
        numberOfInputs: 1,
        numberOfOutputs: 0,
        channelCount: 2,
        channelCountMode: "explicit",
        channelInterpretation: "discrete",
      });

      workletNode.port.onmessage = (event) => {
        if (!streamingRef.current || wsRef.current?.readyState !== WebSocket.OPEN) return;
        wsRef.current.send(event.data);
      };

      merger.connect(workletNode);
      workletNodeRef.current = workletNode;
    } catch {
      // AudioWorklet unavailable — fallback to ScriptProcessorNode
      const scriptProcessor = audioCtx.createScriptProcessor(4096, 2, 2);
      merger.connect(scriptProcessor);
      const silentGain = audioCtx.createGain();
      silentGain.gain.value = 0;
      scriptProcessor.connect(silentGain);
      silentGain.connect(audioCtx.destination);

      scriptProcessor.onaudioprocess = (event) => {
        if (!streamingRef.current || wsRef.current?.readyState !== WebSocket.OPEN) return;
        const ch0 = event.inputBuffer.getChannelData(0);
        const ch1 = event.inputBuffer.getChannelData(1);
        const length = ch0.length;
        const interleaved = new Int16Array(length * 2);
        for (let i = 0; i < length; i++) {
          interleaved[i * 2] = Math.max(-32768, Math.min(32767, Math.round(ch0[i] * 32767)));
          interleaved[i * 2 + 1] = Math.max(-32768, Math.min(32767, Math.round(ch1[i] * 32767)));
        }
        wsRef.current!.send(interleaved.buffer);
      };
      workletNodeRef.current = scriptProcessor as unknown as AudioWorkletNode;
    }

    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 256;
    micSource.connect(analyser);
    analyserRef.current = analyser;

    isMultichannelRef.current = true;
    setIsMultichannel(true);
    return dest.stream;
  }, []);

  const startRecording = useCallback(async () => {
    setError(null);
    setTranscript([]);
    transcriptRef.current = [];
    chunksRef.current = [];
    chunksSentRef.current = 0;
    intentionalCloseRef.current = false;
    reconnectAttemptsRef.current = 0;
    // Clear any periodic flush left over from a previous recording
    if (periodicFlushIntervalRef.current) {
      clearInterval(periodicFlushIntervalRef.current);
      periodicFlushIntervalRef.current = null;
    }
    periodicFlushActiveRef.current = false;
    inPeriodicFlushRef.current = false;
    setStreamingStatus("starting");

    try {
      languageRef.current = language;

      let recordingStream: MediaStream;
      if (mode === "remote") {
        recordingStream = await startRemoteRecording();
      } else {
        recordingStream = await startInPersonRecording();
      }

      if (!audioContextRef.current) {
        const audioContext = new AudioContext();
        audioContextRef.current = audioContext;
      }

      const audioCtx = audioContextRef.current;
      if (audioCtx.state === "suspended") {
        await audioCtx.resume();
      }

      const source = audioCtx.createMediaStreamSource(recordingStream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;
      startLevelMonitoring();

      // --- Step 1: Get the Deepgram API key ---
      let dgKey: string | null = null;
      if (streaming) {
        setStreamingStatus("fetching key...");
        setConnectionStatus("connecting");
        try {
          const keyRes = await fetch("/api/deepgram/stream-key", {
            method: "POST",
          });
          const keyData = await keyRes.json();
          if (keyRes.ok && keyData.streaming_available && keyData.key) {
            dgKey = keyData.key.trim();
            dgKeyRef.current = dgKey;
            dgAuthTypeRef.current = keyData.auth_type === "token" ? "token" : "bearer";
            setStreamingStatus("key obtained");
          } else {
            setStreamingStatus(
              `key failed: HTTP ${keyRes.status} — ${keyData.error || "no key in response"}`
            );
          }
        } catch (err) {
          setStreamingStatus(
            `key fetch failed: ${err instanceof Error ? err.message : "unknown"}`
          );
        }
      }

      // --- Step 2: Open WebSocket(s) to Deepgram ---
      let wsConnected = false;

      // Dual-language mode: open one WS per language for full accuracy.
      // When patientLanguage is set and different from the doctor language, we
      // open two parallel connections.  The connection with higher confidence per
      // utterance wins — this also determines the speaker (0 = doctor, 1 = patient).
      const dualLang = patientLanguage && patientLanguage !== language && !isMultichannelRef.current;

      /** Build Deepgram URLSearchParams for a given language code */
      const buildWsParams = (lang: string) => {
        const useMultichannel = isMultichannelRef.current;
        const sampleRate = audioContextRef.current?.sampleRate || 48000;
        const isEnglish = lang === "en" || lang.startsWith("en-");
        return new URLSearchParams({
          model: isEnglish ? "nova-3-medical" : "nova-3",
          language: lang,
          smart_format: "true",
          punctuate: "true",
          interim_results: "true",
          endpointing: "200",
          utterance_end_ms: "1000",
          ...(useMultichannel
            ? { multichannel: "true", channels: "2", encoding: "linear16", sample_rate: String(sampleRate) }
            : { diarize: "true" }),
        });
      };

      /**
       * In dual-lang mode, record both WS results for the same timestamp bucket
       * and emit the winner once both sides have fired (or after a short timeout).
       */
      const settleDual = (bucket: number) => {
        const entry = pendingDualRef.current.get(bucket);
        if (!entry || entry.settled) return;

        const { doctor, patient } = entry;
        if (!doctor && !patient) return;

        const useDoctor =
          !patient ||
          (doctor && (doctor.confidence ?? 0) >= (patient.confidence ?? 0));
        const winner = useDoctor ? doctor! : patient!;
        const speakerIdx = useDoctor ? 0 : 1;

        entry.settled = true;
        pendingDualRef.current.delete(bucket);

        if (!winner.text.trim()) return;

        const item: LiveTranscriptItem = {
          speaker: speakerIdx,
          text: winner.text,
          timestamp: bucket / 100,
          isFinal: winner.isFinal,
          confidence: winner.confidence,
          detectedLanguage: winner.lang,
        };

        setTranscript((prev) => {
          const last = prev[prev.length - 1];
          const lastIsInterim = last && !last.isFinal;
          const next = lastIsInterim ? [...prev.slice(0, -1), item] : [...prev, item];
          transcriptRef.current = next;
          onTranscriptUpdate?.(next);
          return next;
        });
      };

      /** Attach onmessage for a single-language (non-dual) WebSocket */
      const attachSingleMessage = (ws: WebSocket) => {
        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(
              typeof event.data === "string"
                ? event.data
                : new TextDecoder().decode(event.data)
            );

            if (data.type === "Results" && data.channel) {
              const alt = data.channel.alternatives?.[0];
              if (!alt || !alt.transcript?.trim()) return;

              const useMultichannel = isMultichannelRef.current;
              const speaker = useMultichannel
                ? (data.channel_index?.[0] ?? 0)
                : (alt.words?.[0]?.speaker ?? 0);
              const isFinal = data.is_final === true;
              const detectedLanguage =
                alt.languages?.[0] ?? alt.words?.[0]?.language ?? undefined;

              const item: LiveTranscriptItem = {
                speaker,
                text: alt.transcript,
                timestamp: data.start ?? 0,
                isFinal,
                confidence: alt.confidence ?? 0,
                detectedLanguage,
              };

              setTranscript((prev) => {
                const last = prev[prev.length - 1];
                const lastIsInterim = last && !last.isFinal;
                const next = lastIsInterim ? [...prev.slice(0, -1), item] : [...prev, item];
                transcriptRef.current = next;
                onTranscriptUpdate?.(next);
                return next;
              });
            }
          } catch { /* ignore parse errors */ }
        };
      };

      /** Attach onmessage for a dual-language WebSocket side ("doctor" | "patient") */
      const attachDualMessage = (ws: WebSocket, side: "doctor" | "patient", lang: string) => {
        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(
              typeof event.data === "string"
                ? event.data
                : new TextDecoder().decode(event.data)
            );

            if (data.type === "Results" && data.channel) {
              const alt = data.channel.alternatives?.[0];
              if (!alt || !alt.transcript?.trim()) return;

              const isFinal = data.is_final === true;
              // Round to 100ms buckets so both sides can match the same utterance
              const bucket = Math.round((data.start ?? 0) * 100);

              const sideData = {
                text: alt.transcript,
                confidence: alt.confidence ?? 0,
                isFinal,
                lang,
              };

              const entry = pendingDualRef.current.get(bucket) ?? {};
              entry[side] = sideData;
              pendingDualRef.current.set(bucket, entry);

              if (isFinal) {
                // If both sides have fired, settle immediately
                if (entry.doctor && entry.patient) {
                  settleDual(bucket);
                } else {
                  // Otherwise wait up to 300ms for the other side, then settle anyway
                  setTimeout(() => settleDual(bucket), 300);
                }
              } else {
                // Interim: show live preview from whichever side fires
                const speakerIdx = side === "doctor" ? 0 : 1;
                const item: LiveTranscriptItem = {
                  speaker: speakerIdx,
                  text: alt.transcript,
                  timestamp: data.start ?? 0,
                  isFinal: false,
                  confidence: alt.confidence ?? 0,
                  detectedLanguage: lang,
                };
                setTranscript((prev) => {
                  const last = prev[prev.length - 1];
                  const lastIsInterim = last && !last.isFinal;
                  return lastIsInterim ? [...prev.slice(0, -1), item] : [...prev, item];
                });
              }
            }
          } catch { /* ignore parse errors */ }
        };
      };

      if (dgKey) {
        setStreamingStatus("connecting WebSocket...");

        if (dualLang) {
          // ── Dual-language mode: open two WebSockets in parallel ────────────
          const paramsDoctor = buildWsParams(language);
          const paramsPatient = buildWsParams(patientLanguage!);
          wsParamsRef.current = paramsDoctor.toString();

          const urlDoctor = `wss://api.deepgram.com/v1/listen?${paramsDoctor}`;
          const urlPatient = `wss://api.deepgram.com/v1/listen?${paramsPatient}`;

          pendingDualRef.current.clear();

          const wsProtocol: [string, string] = [dgAuthTypeRef.current, dgKey];
          const wsDoctor = new WebSocket(urlDoctor, wsProtocol);
          wsDoctor.binaryType = "arraybuffer";
          attachDualMessage(wsDoctor, "doctor", language);

          const wsPatient = new WebSocket(urlPatient, wsProtocol);
          wsPatient.binaryType = "arraybuffer";
          attachDualMessage(wsPatient, "patient", patientLanguage!);

          wsConnected = await new Promise<boolean>((resolve) => {
            const timeout = setTimeout(() => {
              setStreamingStatus("WebSocket timed out (8s)");
              wsDoctor.close();
              wsPatient.close();
              resolve(false);
            }, 8000);

            let doctorOpen = false;
            let patientOpen = false;

            const onOpen = () => {
              if (doctorOpen && patientOpen) {
                clearTimeout(timeout);
                wsRef.current = wsDoctor;
                wsPatientRef.current = wsPatient;
                streamingRef.current = true;
                setStreamingActive(true);
                setStreamingStatus(`streaming live · ${language.toUpperCase()} + ${patientLanguage!.toUpperCase()}`);
                setConnectionStatus("connected");
                resolve(true);
              }
            };

            wsDoctor.onopen = () => { doctorOpen = true; onOpen(); };
            wsPatient.onopen = () => { patientOpen = true; onOpen(); };

            wsDoctor.onerror = () => { clearTimeout(timeout); wsDoctor.close(); wsPatient.close(); resolve(false); };
            wsPatient.onerror = () => { clearTimeout(timeout); wsDoctor.close(); wsPatient.close(); resolve(false); };

            wsDoctor.onclose = (e) => {
              streamingRef.current = false;
              setStreamingActive(false);
              if (!intentionalCloseRef.current && e.code !== 1000) reconnectWebSocket();
            };
            wsPatient.onclose = () => {
              // Patient WS closed — just log it; reconnect via doctor's onclose
            };
          });
        } else {
          // ── Single-language mode (original path) ──────────────────────────
          const wsParams = buildWsParams(language);
          wsParamsRef.current = wsParams.toString();
          const wsUrl = `wss://api.deepgram.com/v1/listen?${wsParams}`;

          try {
            wsConnected = await new Promise<boolean>((resolve) => {
              const ws = new WebSocket(wsUrl, [dgAuthTypeRef.current, dgKey]);
              ws.binaryType = "arraybuffer";

              const timeout = setTimeout(() => {
                setStreamingStatus("WebSocket timed out (8s)");
                ws.close();
                resolve(false);
              }, 8000);

              ws.onopen = () => {
                clearTimeout(timeout);
                wsRef.current = ws;
                streamingRef.current = true;
                setStreamingActive(true);
                setStreamingStatus("streaming live");
                setConnectionStatus("connected");
                resolve(true);
              };

              attachSingleMessage(ws);

              ws.onerror = (e) => {
                clearTimeout(timeout);
                setStreamingStatus(`WebSocket error: ${(e as ErrorEvent).message || "connection failed"}`);
                streamingRef.current = false;
                setStreamingActive(false);
                resolve(false);
              };

              ws.onclose = (e) => {
                streamingRef.current = false;
                setStreamingActive(false);
                if (!wsConnected) {
                  setStreamingStatus(`WebSocket closed: code=${e.code} reason=${e.reason || "none"}`);
                } else if (!intentionalCloseRef.current && e.code !== 1000) {
                  setStreamingStatus("connection lost, reconnecting...");
                  reconnectWebSocket();
                }
              };
            });
          } catch (err) {
            setStreamingStatus(
              `WS error: ${err instanceof Error ? err.message : "unknown"}`
            );
          }
        } // end single-language mode
      } // end if (dgKey)

      if (!wsConnected) {
        setConnectionStatus("connected");
        if (streaming) {
          setStreamingStatus((prev) =>
            prev.startsWith("WebSocket") || prev.startsWith("WS")
              ? `${prev} — using batch mode`
              : "unavailable — using batch mode"
          );
        }
      }

      // --- Step 3: Start MediaRecorder ---
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";

      const mediaRecorder = new MediaRecorder(recordingStream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);

          // In multichannel mode, raw PCM is sent via ScriptProcessorNode;
          // MediaRecorder chunks are only sent for single-channel (diarize) mode.
          if (!isMultichannelRef.current && streamingRef.current) {
            if (wsRef.current?.readyState === WebSocket.OPEN) {
              chunksSentRef.current++;
              wsRef.current.send(event.data);
            }
            // Dual-lang mode: also send to the patient WebSocket
            if (wsPatientRef.current?.readyState === WebSocket.OPEN) {
              wsPatientRef.current.send(event.data);
            }
          }
        }
      };

      const timeslice = wsConnected ? 100 : 1000;
      mediaRecorder.start(timeslice);

      setIsRecording(true);
      setIsPaused(false);
      setDuration(0);
      pausedDurationRef.current = 0;
      recordingStartRef.current = Date.now();

      durationIntervalRef.current = setInterval(() => {
        if (
          !mediaRecorderRef.current ||
          mediaRecorderRef.current.state === "paused"
        )
          return;
        const elapsed = Math.floor(
          (Date.now() -
            recordingStartRef.current -
            pausedDurationRef.current) /
            1000
        );
        setDuration(elapsed);
      }, 1000);
    } catch (err) {
      cleanup();
      const message =
        err instanceof DOMException && err.name === "NotAllowedError"
          ? "Microphone permission denied. Please allow microphone access."
          : err instanceof Error
            ? err.message
            : "Failed to start recording";
      setError(message);
      setStreamingStatus(`error: ${message}`);
      onError?.(message);
    }
  }, [
    mode,
    language,
    patientLanguage,
    streaming,
    cleanup,
    startLevelMonitoring,
    startInPersonRecording,
    startRemoteRecording,
    onError,
    onTranscriptUpdate,
    reconnectWebSocket,
  ]);

  const stopRecording = useCallback(async () => {
    return new Promise<LiveTranscriptItem[]>((resolve) => {
      intentionalCloseRef.current = true;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        try {
          wsRef.current.send(JSON.stringify({ type: "CloseStream" }));
          setTimeout(() => { wsRef.current?.close(); wsRef.current = null; }, 1500);
        } catch {
          wsRef.current?.close();
          wsRef.current = null;
        }
      }
      if (wsPatientRef.current?.readyState === WebSocket.OPEN) {
        try {
          wsPatientRef.current.send(JSON.stringify({ type: "CloseStream" }));
          setTimeout(() => { wsPatientRef.current?.close(); wsPatientRef.current = null; }, 1500);
        } catch {
          wsPatientRef.current?.close();
          wsPatientRef.current = null;
        }
      }
      pendingDualRef.current.clear();
      streamingRef.current = false;

      if (
        !mediaRecorderRef.current ||
        mediaRecorderRef.current.state === "inactive"
      ) {
        setIsRecording(false);
        cleanup();
        resolve(transcriptRef.current);
        return;
      }

      const recorder = mediaRecorderRef.current;
      // Snapshot: did live streaming produce any transcript items?
      const hadLiveStreamingTranscript = transcriptRef.current.length > 0;
      // Snapshot: was the periodic batch fallback active during this recording?
      const wasPeriodicFallback = periodicFlushActiveRef.current;
      const wasMultichannel = isMultichannelRef.current;
      const recordingLanguage = languageRef.current;

      // Stop the periodic flush now — we'll do one definitive final batch below
      if (periodicFlushIntervalRef.current) {
        clearInterval(periodicFlushIntervalRef.current);
        periodicFlushIntervalRef.current = null;
      }
      periodicFlushActiveRef.current = false;

      recorder.onstop = async () => {
        setIsRecording(false);
        setConnectionStatus("disconnected");

        // Only skip the final batch when Deepgram streamed cleanly the entire
        // session and the periodic fallback was never needed.  If streaming
        // partially failed mid-recording (wasPeriodicFallback), we always run
        // a final complete batch to capture any trailing audio.
        if (hadLiveStreamingTranscript && !wasPeriodicFallback) {
          setStreamingStatus("completed (live)");
          const finalItems = transcriptRef.current;
          cleanup();
          resolve(finalItems);
          return;
        }

        // ── Drain any in-flight periodic flush ────────────────────────────────
        // If doPeriodicFlush is mid-request when the recorder stops, we must
        // wait for it to finish before running the definitive final batch.
        // Without this guard the two concurrent setTranscript() calls race and
        // the flush's partial result can overwrite the complete batch result
        // (or vice versa), leaving the transcript in an indeterminate state.
        if (inPeriodicFlushRef.current) {
          setStreamingStatus("waiting for in-progress transcript update…");
          await new Promise<void>((res) => {
            const poll = setInterval(() => {
              if (!inPeriodicFlushRef.current) {
                clearInterval(poll);
                res();
              }
            }, 50);
          });
        }

        setStreamingStatus(
          wasPeriodicFallback
            ? "finalising transcript (complete audio)…"
            : "running batch transcription..."
        );
        const audioBlob = new Blob(chunksRef.current, {
          type: recorder.mimeType,
        });

        if (audioBlob.size === 0) {
          setError("No audio was captured");
          onError?.("No audio was captured");
          cleanup();
          resolve([]);
          return;
        }

        // ── Local backup: write to IndexedDB *before* the network call ──────
        // If the transcription API fails or the browser crashes mid-request,
        // the audio is already persisted and the recovery UI can offer a retry.
        const recordId = consultationId ?? crypto.randomUUID();
        setStreamingStatus("saving local backup...");
        await saveAudioBackup({
          id: recordId,
          consultationId: consultationId ?? recordId,
          audioBlob,
          mimeType: recorder.mimeType || "audio/webm",
          language: recordingLanguage,
          isMultichannel: wasMultichannel,
          durationSeconds: Math.floor(
            (Date.now() - recordingStartRef.current) / 1000
          ),
          startedAt: recordingStartRef.current,
        });
        setBackupId(recordId);
        setStreamingStatus("running batch transcription...");
        // ─────────────────────────────────────────────────────────────────────

        setIsTranscribing(true);
        let transcriptionSucceeded = false;
        let finalItems: LiveTranscriptItem[] = transcriptRef.current;
        try {
          const headers: Record<string, string> = {
            "Content-Type": recorder.mimeType || "audio/webm",
            "X-Audio-Language": recordingLanguage,
          };
          if (wasMultichannel) headers["X-Audio-Mode"] = "multichannel";

          const response = await fetch("/api/deepgram/transcribe", {
            method: "POST",
            headers,
            body: audioBlob,
          });

          if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(
              (errData as { error?: string }).error ||
                `Transcription failed (${response.status})`
            );
          }

          const result = await response.json();
          const items: LiveTranscriptItem[] = (
            (result as { segments?: Array<{ speaker: number; text: string; start_time: number; confidence: number }> }).segments ?? []
          ).map((seg) => ({
            speaker: seg.speaker,
            text: seg.text,
            timestamp: seg.start_time,
            isFinal: true,
            confidence: seg.confidence,
          }));

          setTranscript(items);
          transcriptRef.current = items;
          finalItems = items;
          onTranscriptUpdate?.(items);
          setStreamingStatus(
            wasPeriodicFallback ? "completed (live + batch fallback)" : "completed (batch)"
          );
          transcriptionSucceeded = true;
        } catch (err) {
          const message =
            err instanceof Error ? err.message : "Transcription failed";
          setError(message);
          onError?.(message);
          // backupId remains 'saved' — recovery UI will surface it
        } finally {
          setIsTranscribing(false);
        }

        // Mark the backup transcribed so the recovery UI doesn't resurface it
        if (transcriptionSucceeded) {
          await markBackupTranscribed(recordId);
          setBackupId(null);
        }

        cleanup();
        // Resolve with the final items so callers don't need to read stale
        // React state — the state update (setTranscript) is batched and won't
        // be reflected in the caller's closure until after a re-render.
        resolve(finalItems);
      };

      recorder.stop();
    });
  }, [cleanup, onTranscriptUpdate, onError, consultationId]);

  const pauseRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
    }
  }, []);

  const resumeRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === "paused") {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
    }
  }, []);

  // Download the raw audio blob accumulated so far
  const downloadCurrentAudio = useCallback(() => {
    if (chunksRef.current.length === 0) return;
    const mimeType = mediaRecorderRef.current?.mimeType ?? "audio/webm";
    const blob = new Blob(chunksRef.current, { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const ext = mimeType.includes("webm") ? "webm" : "ogg";
    a.download = `recording-${new Date().toISOString().replace(/[:.]/g, "-")}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  return {
    isRecording,
    isPaused,
    duration,
    audioLevel,
    connectionStatus,
    transcript,
    isTranscribing,
    captureMode: mode,
    isMultichannel,
    streamingActive,
    streamingStatus,
    remoteVideoStream,
    backupId,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    downloadCurrentAudio,
    error,
  };
}
