import { create } from "zustand";
import type { ConnectionStatus, LiveTranscriptItem } from "@/types";

interface RecordingState {
  isRecording: boolean;
  isPaused: boolean;
  duration: number;
  audioLevel: number;
  connectionStatus: ConnectionStatus;
  transcript: LiveTranscriptItem[];
  consultationId: string | null;

  setRecording: (isRecording: boolean) => void;
  setPaused: (isPaused: boolean) => void;
  setDuration: (duration: number) => void;
  setAudioLevel: (level: number) => void;
  setConnectionStatus: (status: ConnectionStatus) => void;
  setTranscript: (transcript: LiveTranscriptItem[]) => void;
  addTranscriptItem: (item: LiveTranscriptItem) => void;
  setConsultationId: (id: string | null) => void;
  reset: () => void;
}

export const useRecordingStore = create<RecordingState>((set) => ({
  isRecording: false,
  isPaused: false,
  duration: 0,
  audioLevel: 0,
  connectionStatus: "disconnected",
  transcript: [],
  consultationId: null,

  setRecording: (isRecording) => set({ isRecording }),
  setPaused: (isPaused) => set({ isPaused }),
  setDuration: (duration) => set({ duration }),
  setAudioLevel: (audioLevel) => set({ audioLevel }),
  setConnectionStatus: (connectionStatus) => set({ connectionStatus }),
  setTranscript: (transcript) => set({ transcript }),
  addTranscriptItem: (item) =>
    set((state) => ({ transcript: [...state.transcript, item] })),
  setConsultationId: (consultationId) => set({ consultationId }),
  reset: () =>
    set({
      isRecording: false,
      isPaused: false,
      duration: 0,
      audioLevel: 0,
      connectionStatus: "disconnected",
      transcript: [],
      consultationId: null,
    }),
}));
