"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import type {
  ConnectionStatus,
  ConsultationMode,
  LiveTranscriptItem,
} from "@/types";

interface UseAudioRecorderOptions {
  mode?: ConsultationMode;
  language?: string;
  streaming?: boolean;
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
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<void>;
  pauseRecording: () => void;
  resumeRecording: () => void;
  error: string | null;
}

export function useAudioRecorder({
  mode = "in-person",
  language = "en",
  streaming = true,
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
  const streamingRef = useRef(false);
  const transcriptRef = useRef<LiveTranscriptItem[]>([]);
  const chunksSentRef = useRef(0);

  const cleanup = useCallback(() => {
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

    if (wsRef.current) {
      try {
        if (wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({ type: "CloseStream" }));
          wsRef.current.close();
        }
      } catch {
        /* ignore */
      }
      wsRef.current = null;
    }
    streamingRef.current = false;

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

    setAudioLevel(0);
    setStreamingActive(false);
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
    const micStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: false,
        noiseSuppression: false,
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
        video: false,
      });
    } catch {
      isMultichannelRef.current = false;
      setIsMultichannel(false);
      return micStream;
    }

    const tabAudioTracks = tabStream.getAudioTracks();
    if (tabAudioTracks.length === 0) {
      tabStream.getTracks().forEach((t) => t.stop());
      isMultichannelRef.current = false;
      setIsMultichannel(false);
      return micStream;
    }

    tabStream.getVideoTracks().forEach((track) => track.stop());
    tabStreamRef.current = tabStream;

    const audioCtx = new AudioContext();
    audioContextRef.current = audioCtx;

    const micSource = audioCtx.createMediaStreamSource(micStream);
    const tabSource = audioCtx.createMediaStreamSource(tabStream);
    const merger = audioCtx.createChannelMerger(2);
    micSource.connect(merger, 0, 0);
    tabSource.connect(merger, 0, 1);

    const dest = audioCtx.createMediaStreamDestination();
    merger.connect(dest);

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
          if (keyRes.ok) {
            const keyData = await keyRes.json();
            if (keyData.streaming_available && keyData.key) {
              dgKey = keyData.key.trim();
              setStreamingStatus("key obtained");
            } else {
              setStreamingStatus("key unavailable");
            }
          } else {
            setStreamingStatus(`key API error: ${keyRes.status}`);
          }
        } catch (err) {
          setStreamingStatus(
            `key fetch failed: ${err instanceof Error ? err.message : "unknown"}`
          );
        }
      }

      // --- Step 2: Open WebSocket to Deepgram ---
      let wsConnected = false;
      if (dgKey) {
        setStreamingStatus("connecting WebSocket...");

        const useDiarize = !isMultichannelRef.current;
        const wsParams = new URLSearchParams({
          model: language === "en" ? "nova-2" : "nova-2",
          language,
          smart_format: "true",
          punctuate: "true",
          interim_results: "true",
          endpointing: "300",
          utterance_end_ms: "1000",
          ...(useDiarize ? { diarize: "true" } : {}),
        });

        const wsUrl = `wss://api.deepgram.com/v1/listen?${wsParams}`;

        try {
          wsConnected = await new Promise<boolean>((resolve) => {
            const ws = new WebSocket(wsUrl, ["token", dgKey as string]);
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

                  const speaker = useDiarize
                    ? (alt.words?.[0]?.speaker ?? 0)
                    : (data.channel_index?.[0] ?? 0);
                  const isFinal = data.is_final === true;

                  const item: LiveTranscriptItem = {
                    speaker,
                    text: alt.transcript,
                    timestamp: data.start ?? 0,
                    isFinal,
                    confidence: alt.confidence ?? 0,
                  };

                  if (isFinal && alt.transcript.trim()) {
                    setTranscript((prev) => {
                      const next = [...prev, item];
                      transcriptRef.current = next;
                      onTranscriptUpdate?.(next);
                      return next;
                    });
                  }
                }
              } catch {
                /* ignore parse errors */
              }
            };

            ws.onerror = (e) => {
              clearTimeout(timeout);
              setStreamingStatus(
                `WebSocket error: ${(e as ErrorEvent).message || "connection failed"}`
              );
              streamingRef.current = false;
              setStreamingActive(false);
              resolve(false);
            };

            ws.onclose = (e) => {
              streamingRef.current = false;
              setStreamingActive(false);
              if (!wsConnected) {
                setStreamingStatus(
                  `WebSocket closed: code=${e.code} reason=${e.reason || "none"}`
                );
              }
            };
          });
        } catch (err) {
          setStreamingStatus(
            `WS error: ${err instanceof Error ? err.message : "unknown"}`
          );
        }
      }

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

          if (
            streamingRef.current &&
            wsRef.current?.readyState === WebSocket.OPEN
          ) {
            chunksSentRef.current++;
            wsRef.current.send(event.data);
          }
        }
      };

      const timeslice = wsConnected ? 250 : 1000;
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
    streaming,
    cleanup,
    startLevelMonitoring,
    startInPersonRecording,
    startRemoteRecording,
    onError,
    onTranscriptUpdate,
  ]);

  const stopRecording = useCallback(async () => {
    return new Promise<void>((resolve) => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        try {
          wsRef.current.send(JSON.stringify({ type: "CloseStream" }));
          setTimeout(() => {
            wsRef.current?.close();
            wsRef.current = null;
          }, 1500);
        } catch {
          wsRef.current?.close();
          wsRef.current = null;
        }
      }
      streamingRef.current = false;

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
      const hadStreamingTranscript = transcriptRef.current.length > 0;
      const wasMultichannel = isMultichannelRef.current;
      const recordingLanguage = languageRef.current;

      recorder.onstop = async () => {
        setIsRecording(false);
        setConnectionStatus("disconnected");

        if (hadStreamingTranscript) {
          setStreamingStatus("completed (live)");
          cleanup();
          resolve();
          return;
        }

        setStreamingStatus("running batch transcription...");
        const audioBlob = new Blob(chunksRef.current, {
          type: recorder.mimeType,
        });

        if (audioBlob.size === 0) {
          setError("No audio was captured");
          onError?.("No audio was captured");
          cleanup();
          resolve();
          return;
        }

        setIsTranscribing(true);
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
              errData.error || `Transcription failed (${response.status})`
            );
          }

          const result = await response.json();
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
          transcriptRef.current = items;
          onTranscriptUpdate?.(items);
          setStreamingStatus("completed (batch)");
        } catch (err) {
          const message =
            err instanceof Error ? err.message : "Transcription failed";
          setError(message);
          onError?.(message);
        } finally {
          setIsTranscribing(false);
        }

        cleanup();
        resolve();
      };

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
    streamingActive,
    streamingStatus,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    error,
  };
}
