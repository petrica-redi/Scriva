"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import type { ConnectionStatus, ConsultationMode, LiveTranscriptItem } from "@/types";

/**
 * Audio Recorder with Deepgram Nova 3 Medical Transcription
 *
 * Supports two modes:
 *
 * 1. In-Person Mode (single mic):
 *    - Records mono audio from the microphone
 *    - Sends to Deepgram with diarize=true for speaker separation
 *    - Echo cancellation/noise suppression DISABLED for better diarization
 *
 * 2. Remote Mode (video call — dual capture):
 *    - Captures doctor's microphone via getUserMedia
 *    - Captures patient's audio from the video call tab via getDisplayMedia
 *    - Merges into stereo: Channel 0 (Left) = Doctor, Channel 1 (Right) = Patient
 *    - Sends to Deepgram with multichannel=true for perfect speaker separation
 *    - Falls back to single-mic diarization if getDisplayMedia is unavailable
 *
 * Flow:
 * 1. Records audio locally using MediaRecorder (WebM/Opus)
 * 2. Shows live audio level visualization
 * 3. On stop, sends audio to /api/deepgram/transcribe (server-side)
 * 4. Server sends audio to Deepgram REST API with proper auth headers
 * 5. Returns transcript with speaker diarization or multichannel separation
 */

interface UseAudioRecorderOptions {
  mode?: ConsultationMode;
  language?: string;
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
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<void>;
  pauseRecording: () => void;
  resumeRecording: () => void;
  error: string | null;
}

export function useAudioRecorder({
  mode = "in-person",
  language = "en",
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
  // Track whether we actually achieved multichannel capture
  const [isMultichannel, setIsMultichannel] = useState(false);

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

  // Cleanup function — releases all audio resources (HIPAA compliance)
  const cleanup = useCallback(() => {
    // Stop media recorder
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      try {
        mediaRecorderRef.current.stop();
      } catch {
        // Already stopped
      }
    }
    mediaRecorderRef.current = null;

    // Release microphone
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((track) => track.stop());
      micStreamRef.current = null;
    }

    // Release tab audio (stops the screen/tab share indicator)
    if (tabStreamRef.current) {
      tabStreamRef.current.getTracks().forEach((track) => track.stop());
      tabStreamRef.current = null;
    }

    // Close audio context
    if (audioContextRef.current?.state !== "closed") {
      audioContextRef.current?.close();
    }
    audioContextRef.current = null;
    analyserRef.current = null;

    // Clear timers
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }
    if (levelAnimationRef.current) {
      cancelAnimationFrame(levelAnimationRef.current);
      levelAnimationRef.current = null;
    }

    setAudioLevel(0);
  }, []);

  // Cleanup on unmount — HIPAA: ensure no audio persists
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  // Audio level monitoring
  const startLevelMonitoring = useCallback(() => {
    if (!analyserRef.current) return;
    const analyser = analyserRef.current;
    const dataArray = new Uint8Array(analyser.frequencyBinCount);

    const updateLevel = () => {
      analyser.getByteFrequencyData(dataArray);
      const avg =
        dataArray.reduce((sum, val) => sum + val, 0) / dataArray.length;
      setAudioLevel(avg / 255); // Normalize to 0-1
      levelAnimationRef.current = requestAnimationFrame(updateLevel);
    };
    updateLevel();
  }, []);

  /**
   * Start recording in single-mic mode (in-person consultations).
   * Echo cancellation and noise suppression are DISABLED to preserve
   * distinct voice characteristics for better Deepgram diarization.
   */
  const startInPersonRecording = useCallback(async (): Promise<MediaStream> => {
    console.log("[Recorder] Starting in-person (single mic) recording...");
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: true,
        sampleRate: 16000,
      },
    });
    micStreamRef.current = stream;
    isMultichannelRef.current = false;
    setIsMultichannel(false);
    return stream;
  }, []);

  /**
   * Start recording in remote mode (video call — dual capture).
   * Captures mic (doctor) + tab audio (patient) and merges them into
   * a stereo stream for Deepgram multichannel transcription.
   *
   * Falls back to single-mic diarization if:
   * - getDisplayMedia is not supported
   * - User cancels the tab share prompt
   * - Tab audio stream has no audio tracks
   */
  const startRemoteRecording = useCallback(async (): Promise<MediaStream> => {
    console.log("[Recorder] Starting remote (dual capture) recording...");

    // 1. Capture doctor's microphone
    const micStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        sampleRate: 16000,
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: true,
      },
    });
    micStreamRef.current = micStream;

    // 2. Attempt to capture tab/system audio (patient from video call)
    let tabStream: MediaStream | null = null;

    if (!navigator.mediaDevices.getDisplayMedia) {
      console.warn(
        "[Recorder] getDisplayMedia not supported — falling back to single-mic diarization"
      );
      isMultichannelRef.current = false;
      setIsMultichannel(false);
      return micStream;
    }

    try {
      tabStream = await navigator.mediaDevices.getDisplayMedia({
        audio: true,
        video: false,
      });
    } catch (err) {
      // User cancelled the tab share prompt or browser blocked it
      console.warn(
        "[Recorder] Tab audio capture failed or was cancelled — falling back to single-mic diarization:",
        err
      );
      isMultichannelRef.current = false;
      setIsMultichannel(false);
      return micStream;
    }

    // Check that we actually got an audio track from the tab
    const tabAudioTracks = tabStream.getAudioTracks();
    if (tabAudioTracks.length === 0) {
      console.warn(
        "[Recorder] No audio tracks from tab share — falling back to single-mic diarization"
      );
      tabStream.getTracks().forEach((t) => t.stop());
      isMultichannelRef.current = false;
      setIsMultichannel(false);
      return micStream;
    }

    // Stop any video tracks from getDisplayMedia (we only need audio)
    tabStream.getVideoTracks().forEach((track) => track.stop());

    tabStreamRef.current = tabStream;
    console.log("[Recorder] Tab audio captured successfully");

    // 3. Combine mic + tab into stereo using Web Audio API
    const audioCtx = new AudioContext({ sampleRate: 16000 });
    audioContextRef.current = audioCtx;

    const micSource = audioCtx.createMediaStreamSource(micStream);
    const tabSource = audioCtx.createMediaStreamSource(tabStream);

    // Create a channel merger: 2 input channels -> stereo output
    const merger = audioCtx.createChannelMerger(2);
    micSource.connect(merger, 0, 0); // Mic -> Left channel (Doctor)
    tabSource.connect(merger, 0, 1); // Tab -> Right channel (Patient)

    // Create destination stream for MediaRecorder
    const dest = audioCtx.createMediaStreamDestination();
    merger.connect(dest);

    // Also set up analyser on the mic source for level monitoring
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 256;
    micSource.connect(analyser);
    analyserRef.current = analyser;

    // Handle tab share ending (user clicks "Stop sharing" in browser)
    tabAudioTracks[0].onended = () => {
      console.log("[Recorder] Tab audio share ended by user");
      // The recording continues with mic-only; multichannel flag stays
      // because the audio already recorded was stereo
    };

    isMultichannelRef.current = true;
    setIsMultichannel(true);
    console.log("[Recorder] Stereo stream created: Ch0=Doctor(mic), Ch1=Patient(tab)");

    return dest.stream;
  }, []);

  const startRecording = useCallback(async () => {
    setError(null);
    chunksRef.current = [];

    try {
      console.log(`[Recorder] Requesting audio in "${mode}" mode, language: "${language}"...`);
      languageRef.current = language;

      let recordingStream: MediaStream;

      if (mode === "remote") {
        recordingStream = await startRemoteRecording();
      } else {
        recordingStream = await startInPersonRecording();
      }

      // Set up audio analysis for waveform visualization
      // (only if not already set up by remote mode)
      if (!audioContextRef.current) {
        const audioContext = new AudioContext();
        audioContextRef.current = audioContext;
        const source = audioContext.createMediaStreamSource(recordingStream);
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);
        analyserRef.current = analyser;
      }
      startLevelMonitoring();

      // Set up MediaRecorder
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";

      const mediaRecorder = new MediaRecorder(recordingStream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      // Start recording — collect chunks every second
      mediaRecorder.start(1000);
      setIsRecording(true);
      setIsPaused(false);
      setDuration(0);
      setConnectionStatus("connected");
      pausedDurationRef.current = 0;
      recordingStartRef.current = Date.now();

      console.log(
        `[Recorder] Recording started, mimeType: ${mimeType}, multichannel: ${isMultichannelRef.current}`
      );

      // Duration timer
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
      onError?.(message);
    }
  }, [
    mode,
    language,
    cleanup,
    startLevelMonitoring,
    startInPersonRecording,
    startRemoteRecording,
    onError,
  ]);

  const stopRecording = useCallback(async () => {
    console.log("[Recorder] Stopping recording...");

    return new Promise<void>((resolve) => {
      if (
        !mediaRecorderRef.current ||
        mediaRecorderRef.current.state === "inactive"
      ) {
        setIsRecording(false);
        cleanup();
        resolve();
        return;
      }

      const recorder = mediaRecorderRef.current;
      const wasMultichannel = isMultichannelRef.current;
      const recordingLanguage = languageRef.current;

      recorder.onstop = async () => {
        setIsRecording(false);
        setConnectionStatus("disconnected");

        // Build audio blob from recorded chunks
        const audioBlob = new Blob(chunksRef.current, {
          type: recorder.mimeType,
        });

        console.log(
          `[Recorder] Audio captured: ${(audioBlob.size / 1024).toFixed(1)}KB, multichannel: ${wasMultichannel}`
        );

        if (audioBlob.size === 0) {
          setError("No audio was captured");
          onError?.("No audio was captured");
          cleanup();
          resolve();
          return;
        }

        // Transcribe via server-side API
        setIsTranscribing(true);
        try {
          console.log(
            "[Recorder] Sending audio to Deepgram for transcription..."
          );

          const headers: Record<string, string> = {
            "Content-Type": recorder.mimeType || "audio/webm",
            "X-Audio-Language": recordingLanguage,
          };

          // Tell the server if this is multichannel audio
          if (wasMultichannel) {
            headers["X-Audio-Mode"] = "multichannel";
          }

          const response = await fetch("/api/deepgram/transcribe", {
            method: "POST",
            headers,
            body: audioBlob,
          });

          if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(
              errData.error || `Transcription failed (${response.status})`
            );
          }

          const result = await response.json();
          console.log(
            "[Recorder] Transcription complete:",
            result.segments?.length,
            "segments, model:",
            result.model,
            "multichannel:",
            result.multichannel ?? false
          );

          // Convert segments to LiveTranscriptItem format
          const items: LiveTranscriptItem[] = (result.segments || []).map(
            (seg: {
              speaker: number;
              text: string;
              start_time: number;
              confidence: number;
            }) => ({
              speaker: seg.speaker,
              text: seg.text,
              timestamp: seg.start_time,
              isFinal: true,
              confidence: seg.confidence,
            })
          );

          setTranscript(items);
          onTranscriptUpdate?.(items);
        } catch (err) {
          const message =
            err instanceof Error ? err.message : "Transcription failed";
          console.error("[Recorder] Transcription error:", err);
          setError(message);
          onError?.(message);
        } finally {
          setIsTranscribing(false);
        }

        cleanup();
        resolve();
      };

      // Trigger stop — the onstop handler will fire
      recorder.stop();
    });
  }, [cleanup, onTranscriptUpdate, onError]);

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
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    error,
  };
}
