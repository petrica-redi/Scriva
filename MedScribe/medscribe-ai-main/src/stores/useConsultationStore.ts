import { create } from "zustand";
import type { Consultation, ClinicalNote, Transcript } from "@/types";

interface ConsultationState {
  activeConsultation: Consultation | null;
  activeNote: ClinicalNote | null;
  activeTranscript: Transcript | null;

  setActiveConsultation: (consultation: Consultation | null) => void;
  setActiveNote: (note: ClinicalNote | null) => void;
  setActiveTranscript: (transcript: Transcript | null) => void;
  clear: () => void;
}

export const useConsultationStore = create<ConsultationState>((set) => ({
  activeConsultation: null,
  activeNote: null,
  activeTranscript: null,

  setActiveConsultation: (activeConsultation) => set({ activeConsultation }),
  setActiveNote: (activeNote) => set({ activeNote }),
  setActiveTranscript: (activeTranscript) => set({ activeTranscript }),
  clear: () =>
    set({
      activeConsultation: null,
      activeNote: null,
      activeTranscript: null,
    }),
}));
