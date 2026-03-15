"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";
import { useAudioBackup } from "@/hooks/useAudioBackup";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatDuration } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n/context";
import { translateVisitType } from "@/lib/i18n/visitTypes";
import { AudioVisualizer } from "@/components/consultation/AudioVisualizer";
import { AIAssistantPanel } from "@/components/consultation/AIAssistantPanel";
import { GoogleMeetEmbed } from "@/components/consultation/GoogleMeetEmbed";
import { ClinicalDecisionSupport, CriteriaTracker } from "@/components/features";
import { NetworkStatusBanner } from "@/components/ui/NetworkStatusBanner";
import { PreVisitBrief } from "@/components/features/PreVisitBrief";
import { IdentityVerification, type VerificationData } from "@/components/consultation/IdentityVerification";
import { ProblemTracker, type TrackedProblem } from "@/components/consultation/ProblemTracker";
import type { ConsultationMode, ConsultationWithRelations, LiveTranscriptItem } from "@/types";

type RecordingPhase = "pre" | "recording" | "post";

const TEMPLATES = [
  { value: "SOAP Note", label: "SOAP Note" },
  { value: "Referral Letter", label: "Referral Letter" },
  { value: "Discharge Summary", label: "Discharge Summary" },
  { value: "Progress Note", label: "Progress Note" },
  { value: "Patient Handout", label: "Patient Handout" },
  { value: "Specialist Consultation", label: "Specialist Consultation" },
];

const LANGUAGES = [
  { value: "en", label: "English" },
  { value: "ro", label: "Romanian" },
  { value: "de", label: "German" },
  { value: "fr", label: "French" },
  { value: "es", label: "Spanish" },
  { value: "it", label: "Italian" },
  { value: "pt", label: "Portuguese" },
  { value: "nl", label: "Dutch" },
  { value: "pl", label: "Polish" },
  { value: "hu", label: "Hungarian" },
  { value: "bg", label: "Bulgarian" },
  { value: "cs", label: "Czech" },
  { value: "ru", label: "Russian" },
  { value: "tr", label: "Turkish" },
  { value: "hi", label: "Hindi" },
  { value: "ja", label: "Japanese" },
  { value: "ko", label: "Korean" },
  { value: "ar", label: "Arabic" },
  { value: "zh", label: "Chinese" },
  { value: "uk", label: "Ukrainian" },
  { value: "el", label: "Greek" },
  { value: "sv", label: "Swedish" },
  { value: "hr", label: "Croatian" },
];

const LANG_LABELS: Record<string, string> = Object.fromEntries(
  LANGUAGES.map((l) => [l.value, l.label])
);

export default function ConsultationRecordPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const supabase = createClient();
  const { t } = useTranslation();
  const consultationId = params?.id;
  const transcriptEndRef = useRef<HTMLDivElement>(null);

  const [phase, setPhase] = useState<RecordingPhase>("pre");
  const [consentGiven, setConsentGiven] = useState(false);
  const [isLoadingConsultation, setIsLoadingConsultation] = useState(true);
  const [consultationData, setConsultationData] = useState<ConsultationWithRelations | null>(null);
  const [error, setError] = useState("");
  const [consultationMode, setConsultationMode] = useState<ConsultationMode>("in-person");
  const [doctorLang, setDoctorLang] = useState("en");
  const [patientLang, setPatientLang] = useState("en");
  const isMultilingual = doctorLang !== patientLang;
  const [selectedTemplate, setSelectedTemplate] = useState(TEMPLATES[0].value);
  const [isGeneratingNote, setIsGeneratingNote] = useState(false);
  const [sessionNotes, setSessionNotes] = useState("");
  const [restoredTranscript, setRestoredTranscript] = useState<LiveTranscriptItem[]>([]);
  const [savedDuration, setSavedDuration] = useState(0);
  const [identityVerified, setIdentityVerified] = useState(false);
  const [trackedProblems, setTrackedProblems] = useState<TrackedProblem[]>([]);

  const patientName: string | undefined =
    typeof consultationData?.metadata?.patient_name === "string"
      ? consultationData.metadata.patient_name
      : undefined;

  const {
    isRecording,
    isPaused,
    duration,
    audioLevel,
    connectionStatus,
    transcript,
    isTranscribing,
    isMultichannel,
    streamingActive,
    streamingStatus,
    remoteVideoStream,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    error: recordingError,
  // Language strategy for Deepgram:
  // - Same language: pass that language directly (best accuracy)
  // - Different languages: pass the patient's language (the speech that needs
  //   most accuracy). Deepgram handles code-switching for the doctor's language
  //   (typically English/French) within a single-language model better than
  //   "multi" mode handles low-resource languages like Romanian or Arabic.
  } = useAudioRecorder({
    mode: consultationMode,
    language: doctorLang,
    patientLanguage: isMultilingual ? patientLang : undefined,
    streaming: true,
    consultationId: consultationId ?? undefined,
    onError: (err) => setError(err),
  });

  const {
    pendingBackups,
    retranscribe,
    dismiss: dismissBackup,
    downloadAudio: downloadBackupAudio,
    refresh: refreshBackups,
  } = useAudioBackup();

  const [retranscribeStatus, setRetranscribeStatus] = useState<Record<string, string>>({});

  // ── UX: simplified recording view state ──────────────────────────────────
  /** AI/clinical sidebar panel during recording — default true so diagnostics are visible */
  const [showSidebar, setShowSidebar] = useState(true);
  const [showVideo, setShowVideo] = useState(true);
  const [showTranscript, setShowTranscript] = useState(true);
  const [showNotes, setShowNotes] = useState(true);
  const [shouldCloseMeet, setShouldCloseMeet] = useState(false);
  /** Microphone test: idle → recording (3 s) → playing → idle */
  const [micTestState, setMicTestState] = useState<"idle" | "recording" | "playing">("idle");
  const [micTestUrl, setMicTestUrl] = useState<string | null>(null);
  const micTestAudioRef = useRef<HTMLAudioElement | null>(null);
  const pipVideoRef = useRef<HTMLVideoElement | null>(null);
  // Callback ref: attach stream immediately when video element mounts/updates
  const pipVideoCallbackRef = useCallback((el: HTMLVideoElement | null) => {
    pipVideoRef.current = el;
    if (el && remoteVideoStream && remoteVideoStream.getVideoTracks().length > 0) {
      el.srcObject = remoteVideoStream;
      el.play().catch(() => {});
    } else if (el) {
      el.srcObject = null;
    }
  }, [remoteVideoStream]);

  // Auto-scroll only the transcript container, not the whole page
  useEffect(() => {
    const el = transcriptEndRef.current;
    if (el?.parentElement) {
      el.parentElement.scrollTop = el.parentElement.scrollHeight;
    }
  }, [transcript]);


  useEffect(() => {
    const loadConsultationAndAuth = async () => {
      if (!consultationId) {
        setError("Invalid consultation ID");
        setIsLoadingConsultation(false);
        return;
      }

      try {
        const { data, error: fetchError } = await supabase
          .from("consultations")
          .select("*")
          .eq("id", consultationId)
          .single();

        if (fetchError) throw new Error(fetchError.message || "Failed to load consultation");
        if (!data) throw new Error("Consultation not found");
        setConsultationData(data);

        const completedStatuses = ["transcribed", "note_generated", "completed", "finalized"];
        if (completedStatuses.includes(data.status)) {
          const { data: transcriptData } = await supabase
            .from("transcripts")
            .select("segments, full_text")
            .eq("consultation_id", consultationId)
            .single();

          if (transcriptData?.segments && Array.isArray(transcriptData.segments)) {
            const restored: LiveTranscriptItem[] = transcriptData.segments.map(
              (seg: { speaker?: string; text?: string; timestamp?: number; confidence?: number }) => ({
                speaker: seg.speaker === "Doctor" ? 0 : 1,
                text: seg.text || "",
                timestamp: seg.timestamp || 0,
                isFinal: true,
                confidence: seg.confidence || 1,
              })
            );
            setRestoredTranscript(restored);
            setSavedDuration(data.recording_duration_seconds || 0);
          }

          if (data.metadata?.session_notes) {
            setSessionNotes(data.metadata.session_notes);
          }
          if (data.metadata?.consultation_mode) {
            setConsultationMode(data.metadata.consultation_mode);
          }

          setPhase("post");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "An unexpected error occurred");
      } finally {
        setIsLoadingConsultation(false);
      }
    };

    loadConsultationAndAuth();
  }, [consultationId, supabase]);

  // Prevent accidental data loss during recording
  useEffect(() => {
    if (!isRecording && phase !== "recording") return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "Recording in progress. Are you sure you want to leave?";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isRecording, phase]);

  const displayTranscript = transcript.length > 0 ? transcript : restoredTranscript;
  const displayDuration = duration > 0 ? duration : savedDuration;

  const handleIdentityVerified = useCallback(async (data: VerificationData) => {
    setIdentityVerified(true);
    await supabase
      .from("consultations")
      .update({
        metadata: {
          ...consultationData?.metadata,
          identity_verified: data.identity_verified,
          identity_method: data.identity_method,
          connection_quality_score: data.connection_quality_score,
          visit_modality: data.visit_modality,
          patient_location: data.patient_location,
          identity_verified_at: data.verified_at,
        },
      })
      .eq("id", consultationId);
  }, [consultationId, consultationData, supabase]);

  const handleProblemsChange = useCallback((problems: TrackedProblem[]) => {
    setTrackedProblems(problems);
  }, []);

  // Persist language selections across sessions
  const langLoadedRef = useRef(false);
  useEffect(() => {
    try {
      const saved = localStorage.getItem("scriva-langs");
      if (saved) {
        const { doctor, patient } = JSON.parse(saved) as { doctor?: string; patient?: string };
        if (doctor && LANGUAGES.some((l) => l.value === doctor)) setDoctorLang(doctor);
        if (patient && LANGUAGES.some((l) => l.value === patient)) setPatientLang(patient);
      }
    } catch { /* ignore corrupt storage */ }
    langLoadedRef.current = true;
  }, []);
  useEffect(() => {
    if (!langLoadedRef.current) return;
    localStorage.setItem("scriva-langs", JSON.stringify({ doctor: doctorLang, patient: patientLang }));
  }, [doctorLang, patientLang]);

  // Keyboard shortcuts during recording (Space = pause/resume)
  useEffect(() => {
    if (!isRecording) return;
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT"
      )
        return;
      if (e.key === " ") {
        e.preventDefault();
        isPaused ? resumeRecording() : pauseRecording();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isRecording, isPaused, pauseRecording, resumeRecording]);

  // ── Live translation for multilingual conversations ─────────────────
  const translatingRef = useRef<Set<string>>(new Set());
  const [translations, setTranslations] = useState<Record<string, string>>({});

  const makeTranslationKey = useCallback(
    (item: LiveTranscriptItem) =>
      `${item.timestamp}|${item.speaker}|${item.text.slice(0, 40)}`,
    []
  );

  useEffect(() => {
    if (!isRecording || !isMultilingual) return;

    // Collect untranslated final segments, grouped by direction
    const doctorToPatient: Array<{ key: string; text: string }> = [];
    const patientToDoctor: Array<{ key: string; text: string }> = [];

    for (const item of transcript) {
      if (!item.isFinal || !item.text.trim()) continue;
      const key = makeTranslationKey(item);
      if (translatingRef.current.has(key) || translations[key]) continue;

      if (item.speaker === 0) {
        doctorToPatient.push({ key, text: item.text });
      } else {
        patientToDoctor.push({ key, text: item.text });
      }
    }

    const sendBatch = (
      segments: Array<{ key: string; text: string }>,
      fromLang: string,
      toLang: string
    ) => {
      if (segments.length === 0) return;

      for (const s of segments) translatingRef.current.add(s.key);

      if (segments.length === 1) {
        // Single segment — use simple endpoint
        const { key, text } = segments[0];
        fetch("/api/translate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text, fromLang, toLang }),
        })
          .then((r) => (r.ok ? r.json() : null))
          .then((data: { translatedText?: string } | null) => {
            if (!data?.translatedText) return;
            setTranslations((prev) => ({ ...prev, [key]: data.translatedText! }));
          })
          .catch(() => {})
          .finally(() => translatingRef.current.delete(key));
      } else {
        // Multiple segments — use batch endpoint
        fetch("/api/translate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ segments, fromLang, toLang }),
        })
          .then((r) => (r.ok ? r.json() : null))
          .then((data: { translations?: Record<string, string> } | null) => {
            if (!data?.translations) return;
            setTranslations((prev) => ({ ...prev, ...data.translations }));
          })
          .catch(() => {})
          .finally(() => {
            for (const s of segments) translatingRef.current.delete(s.key);
          });
      }
    };

    sendBatch(doctorToPatient, doctorLang, patientLang);
    sendBatch(patientToDoctor, patientLang, doctorLang);
  }, [transcript, isRecording, isMultilingual, doctorLang, patientLang, translations, makeTranslationKey]);

  const handleMicTest = useCallback(async () => {
    if (micTestState !== "idle") return;
    try {
      setMicTestState("recording");
      if (micTestUrl) {
        URL.revokeObjectURL(micTestUrl);
        setMicTestUrl(null);
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunks, { type: recorder.mimeType });
        const url = URL.createObjectURL(blob);
        setMicTestUrl(url);
        setMicTestState("playing");
        if (micTestAudioRef.current) {
          micTestAudioRef.current.src = url;
          void micTestAudioRef.current.play();
          micTestAudioRef.current.onended = () => setMicTestState("idle");
        }
      };
      recorder.start();
      setTimeout(() => recorder.stop(), 3000);
    } catch {
      setMicTestState("idle");
      setError("Microphone access denied. Please allow microphone access in your browser.");
    }
  }, [micTestState, micTestUrl]);

  const handleRetranscribe = useCallback(
    async (backupId: string) => {
      setRetranscribeStatus((s) => ({ ...s, [backupId]: "Retranscribing…" }));
      const items = await retranscribe(backupId, (msg) => {
        setRetranscribeStatus((s) => ({ ...s, [backupId]: msg }));
      });
      if (items && items.length > 0) {
        await refreshBackups();
        setRetranscribeStatus((s) => {
          const next = { ...s };
          delete next[backupId];
          return next;
        });
      }
    },
    [retranscribe, refreshBackups]
  );

  const handleStartRecording = async () => {
    setError("");
    try {
      await supabase
        .from("consultations")
        .update({ consent_given: true, consent_timestamp: new Date().toISOString(), status: "recording" })
        .eq("id", consultationId);
      await startRecording();
      setPhase("recording");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start recording");
    }
  };

  const handleEndRecording = async () => {
    try {
      setShouldCloseMeet(true);
      // stopRecording() resolves with the final transcript items.  Reading the
      // React `transcript` state here would give a stale closure value because
      // React batches state updates — the setTranscript() call inside the hook
      // hasn't caused a re-render yet by the time this line resumes.
      const finalItems = await stopRecording();

      // Save transcript to database
      const finalSegments = finalItems.filter(t => t.isFinal);
      const fullText = finalSegments
        .map(item => {
          const speaker = item.speaker === 0 ? "Doctor" : "Patient";
          return `[${speaker}]: ${item.text}`;
        })
        .join("\n");

      const segments = finalSegments.map((item, idx) => ({
        index: idx,
        speaker: item.speaker === 0 ? "Doctor" : "Patient",
        text: item.text,
        timestamp: item.timestamp || null,
        confidence: item.confidence || null,
      }));

      // Upsert transcript (unique on consultation_id)
      await supabase
        .from("transcripts")
        .upsert({
          consultation_id: consultationId,
          segments: segments,
          full_text: fullText,
          language: doctorLang,
          provider: "deepgram",
          updated_at: new Date().toISOString(),
        }, { onConflict: "consultation_id" });

      const problemsSummary = trackedProblems.map((p) => ({
        label: p.label,
        icd10: p.icd10 || null,
        totalSeconds: p.totalSeconds,
      }));
      const timePerProblem: Record<string, number> = {};
      for (const p of trackedProblems) {
        timePerProblem[p.label] = p.totalSeconds;
      }

      await supabase
        .from("consultations")
        .update({
          recording_duration_seconds: duration,
          status: "transcribed",
          metadata: {
            ...consultationData?.metadata,
            consultation_mode: consultationMode,
            transcript_segments_count: finalSegments.length,
            transcript_saved_at: new Date().toISOString(),
            session_notes: sessionNotes || null,
            problems_addressed: problemsSummary,
            time_per_problem: timePerProblem,
          },
        })
        .eq("id", consultationId);

      setPhase("post");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to end recording");
    }
  };

  const handleGenerateNote = async () => {
    setError("");
    setIsGeneratingNote(true);

    try {
      const transcriptText = displayTranscript
        .filter((item) => item.isFinal)
        .map((item) => {
          const speaker = item.speaker === 0 ? "Doctor" : "Patient";
          return `[${speaker}]: ${item.text}`;
        })
        .join("\n");

      if (!transcriptText.trim()) {
        setError("No transcript available to generate note");
        setIsGeneratingNote(false);
        return;
      }

      const response = await fetch("/api/generate-note", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          consultation_id: consultationId,
          template: selectedTemplate,
          transcript: transcriptText,
          language: doctorLang,
          metadata: { visit_type: consultationData?.visit_type, patient_name: patientName },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to generate note");
      }

      router.push(`/consultation/${consultationId}/note`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
      setIsGeneratingNote(false);
    }
  };

  if (isLoadingConsultation) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-t-brand-600" />
          <p className="text-medical-text">{t("record.loadingConsultation")}</p>
        </div>
      </div>
    );
  }

  if (error && phase === "pre" && !isRecording) {
    return (
      <div className="mx-auto max-w-4xl p-6">
        <div className="rounded-lg border border-red-200 bg-red-50 p-6">
          <h2 className="text-lg font-semibold text-red-900">{t("record.error")}</h2>
          <p className="mt-2 text-red-800">{error}</p>
          <Button onClick={() => router.back()} variant="outline" className="mt-4">{t("record.goBack")}</Button>
        </div>
      </div>
    );
  }

  const renderTranscriptBubbles = (items: typeof transcript, maxH = "max-h-[600px]") => (
    <div className={`${maxH} space-y-3 overflow-y-auto rounded-xl bg-gradient-to-b from-gray-50 to-white p-4`}>
      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          {isRecording ? (
            <>
              <div className="mb-4 flex items-end gap-1">
                {[0, 1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="w-1 rounded-full bg-brand-400 animate-pulse"
                    style={{ height: `${12 + Math.sin(i * 1.2) * 8}px`, animationDelay: `${i * 0.1}s`, animationDuration: "0.8s" }}
                  />
                ))}
              </div>
              <p className="text-sm font-medium text-medical-muted">
                {streamingActive ? t("record.listeningStreaming") : t("record.listeningSpeaking")}
              </p>
            </>
          ) : (
            <p className="text-sm text-medical-muted">{t("record.noTranscript")}</p>
          )}
        </div>
      ) : (
        <>
          {items.map((item, idx) => {
            const isDoctor = item.speaker === 0;
            const isInterim = !item.isFinal;
            const tKey = makeTranslationKey(item);
            const translatedText = item.translatedText || translations[tKey];
            const originalLang = isDoctor ? doctorLang : patientLang;
            const targetLang = isDoctor ? patientLang : doctorLang;
            const showTranslation = isMultilingual && translatedText;
            return (
              <div
                key={`${item.timestamp}-${item.speaker}-${idx}`}
                className={`flex ${isDoctor ? "justify-start" : "justify-end"} animate-in fade-in slide-in-from-bottom-2 duration-300`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm shadow-sm ${
                    isDoctor
                      ? "bg-blue-50 text-blue-900 rounded-bl-md border border-blue-100"
                      : "bg-green-50 text-green-900 rounded-br-md border border-green-100"
                  } ${isInterim ? "italic opacity-70" : ""}`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[10px] font-bold uppercase tracking-wider ${isDoctor ? "text-blue-600" : "text-green-600"}`}>
                      {isDoctor ? t("record.doctor") : t("record.patientSpeaker")}
                    </span>
                    {isMultilingual && (
                      <span className={`rounded-full px-1.5 py-px text-[9px] font-semibold uppercase ${
                        isDoctor ? "bg-blue-100 text-blue-500" : "bg-green-100 text-green-500"
                      }`}>
                        {originalLang.toUpperCase()}
                      </span>
                    )}
                    {item.timestamp > 0 && (
                      <span className="text-[10px] text-gray-400">{formatDuration(Math.round(item.timestamp))}</span>
                    )}
                    {item.confidence > 0 && item.confidence < 0.8 && (
                      <span className="text-[10px] text-amber-500">~{Math.round(item.confidence * 100)}%</span>
                    )}
                  </div>
                  <p className="leading-relaxed">{item.text}</p>
                  {showTranslation && (
                    <div className={`mt-2 rounded-lg px-3 py-2 ${
                      isDoctor ? "bg-blue-100/60" : "bg-green-100/60"
                    }`}>
                      <div className="mb-0.5 flex items-center gap-1.5">
                        <svg className="h-3 w-3 opacity-50" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="m10.5 21 5.25-11.25L21 21m-9-3h7.5M3 5.621a48.474 48.474 0 0 1 6-.371m0 0c1.12 0 2.233.038 3.334.114M9 5.25V3m3.334 2.364C11.176 10.658 7.69 15.08 3 17.502m9.334-12.138c.896.061 1.785.147 2.666.257m-4.589 8.495a18.023 18.023 0 0 1-3.827-5.802" />
                        </svg>
                        <span className="text-[9px] font-semibold uppercase tracking-wider opacity-50">
                          {LANG_LABELS[targetLang] ?? targetLang.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-[13px] leading-relaxed">{translatedText}</p>
                    </div>
                  )}
                  {isMultilingual && item.isFinal && !translatedText && !isInterim && translatingRef.current.has(tKey) && (
                    <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-gray-400">
                      <div className="h-3 w-3 animate-spin rounded-full border-2 border-gray-300 border-t-transparent" />
                      Translating…
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          <div ref={transcriptEndRef} />
        </>
      )}
    </div>
  );

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <NetworkStatusBanner />

      {/* ── Local audio recovery banner ─────────────────────────────────── */}
      {pendingBackups.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-start gap-3">
            <svg className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
            </svg>
            <div className="flex-1 space-y-3">
              <div>
                <p className="text-sm font-semibold text-amber-900">
                  {pendingBackups.length === 1
                    ? "1 recording was not fully transcribed"
                    : `${pendingBackups.length} recordings were not fully transcribed`}
                </p>
                <p className="mt-0.5 text-xs text-amber-700">
                  Audio was saved locally. You can retry transcription or download the raw file.
                </p>
              </div>
              <div className="space-y-2">
                {pendingBackups.map((backup) => {
                  const date = new Date(backup.startedAt).toLocaleString();
                  const mins = Math.round(backup.durationSeconds / 60);
                  const status = retranscribeStatus[backup.id];
                  const isRetrying = !!status && status !== "Transcription complete.";
                  return (
                    <div
                      key={backup.id}
                      className="flex flex-wrap items-center gap-2 rounded-md border border-amber-200 bg-white px-3 py-2"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-gray-800 truncate">
                          {backup.consultationId === consultationId
                            ? "This consultation"
                            : `Consultation ${backup.consultationId.slice(0, 8)}…`}
                        </p>
                        <p className="text-xs text-gray-500">
                          {date} · {mins > 0 ? `${mins} min` : `${backup.durationSeconds}s`} · {backup.language.toUpperCase()}
                        </p>
                        {status && (
                          <p className={`mt-0.5 text-xs ${status.startsWith("Retry failed") ? "text-red-600" : "text-amber-700"}`}>
                            {status}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-1.5">
                        <button
                          type="button"
                          disabled={isRetrying}
                          onClick={() => handleRetranscribe(backup.id)}
                          className="rounded px-2.5 py-1 text-xs font-medium bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          {isRetrying ? "Retrying…" : "Retry"}
                        </button>
                        <button
                          type="button"
                          onClick={() => downloadBackupAudio(backup.id)}
                          title="Download raw audio"
                          className="rounded px-2 py-1 text-xs font-medium border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          onClick={() => dismissBackup(backup.id)}
                          title="Dismiss"
                          className="rounded px-2 py-1 text-xs font-medium border border-gray-300 text-gray-500 hover:bg-gray-50 transition-colors"
                        >
                          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PHASE 1: PRE-RECORDING */}
      {phase === "pre" && (
        <div className="flex flex-col items-center gap-6 py-10">
          {/* Hidden audio element for mic test playback */}
          <audio ref={micTestAudioRef} className="hidden" />

          {/* Header */}
          <div className="text-center">
            <h1 className="text-3xl font-bold text-medical-text">{t("record.startConsultation")}</h1>
            {patientName && (
              <p className="mt-1 text-lg text-medical-muted">
                {patientName}
                {consultationData?.visit_type && (
                  <span className="ml-2 text-base font-normal">
                    · {translateVisitType(consultationData.visit_type, t)}
                  </span>
                )}
              </p>
            )}
          </div>

          {/* ── Consultation Mode Toggle — FIRST DECISION ─────────────────── */}
          <div className="w-full max-w-xl space-y-4">
            <div className="text-center">
              <p className="text-sm font-semibold uppercase tracking-widest text-medical-muted">
                How is this consultation taking place?
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setConsultationMode("in-person")}
                className={`flex flex-col items-center gap-3 rounded-2xl border-2 px-6 py-5 text-sm font-semibold transition-all ${
                  consultationMode === "in-person"
                    ? "border-brand-600 bg-brand-50 text-brand-800 shadow-md ring-2 ring-brand-200"
                    : "border-gray-200 bg-white text-medical-muted hover:border-brand-200 hover:bg-brand-50/40 hover:text-brand-700"
                }`}
              >
                <svg className={`h-8 w-8 ${consultationMode === "in-person" ? "text-brand-700" : "text-gray-400"}`} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                </svg>
                <span className="text-base">{t("record.inPerson")}</span>
                <span className={`text-xs font-normal ${consultationMode === "in-person" ? "text-brand-600" : "text-gray-400"}`}>
                  Patient is in the room
                </span>
              </button>
              <button
                type="button"
                onClick={() => setConsultationMode("remote")}
                className={`flex flex-col items-center gap-3 rounded-2xl border-2 px-6 py-5 text-sm font-semibold transition-all ${
                  consultationMode === "remote"
                    ? "border-brand-600 bg-brand-50 text-brand-800 shadow-md ring-2 ring-brand-200"
                    : "border-gray-200 bg-white text-medical-muted hover:border-brand-200 hover:bg-brand-50/40 hover:text-brand-700"
                }`}
              >
                <svg className={`h-8 w-8 ${consultationMode === "remote" ? "text-brand-700" : "text-gray-400"}`} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" />
                </svg>
                <span className="text-base">{t("record.remoteCall")}</span>
                <span className={`text-xs font-normal ${consultationMode === "remote" ? "text-brand-600" : "text-gray-400"}`}>
                  Via Google Meet / video
                </span>
              </button>
            </div>

            {/* Remote-only: Google Meet setup + identity verification */}
            {consultationMode === "remote" && consultationId && (
              <div className="rounded-2xl border-2 border-brand-200 bg-white p-5 shadow-sm space-y-4">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100">
                    <svg className="h-4 w-4 text-brand-700" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-brand-800">Remote Consultation Setup</p>
                    <p className="text-xs text-brand-600">Connect via Google Meet, then start recording</p>
                  </div>
                </div>
                <GoogleMeetEmbed consultationId={consultationId} />
                {!identityVerified ? (
                  <IdentityVerification
                    patientName={patientName}
                    patientDOB={consultationData?.patient?.date_of_birth}
                    consultationId={consultationId}
                    onVerified={handleIdentityVerified}
                  />
                ) : (
                  <div className="flex items-center gap-2 rounded-xl bg-green-50 border border-green-200 px-4 py-3">
                    <svg className="h-5 w-5 text-green-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
                    </svg>
                    <span className="text-sm text-green-700 font-medium">Identity & tech check verified — ready to record</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Pre-Visit Intelligence Brief */}
          {consultationData?.patient_id && (
            <div className="w-full max-w-2xl">
              <PreVisitBrief patientId={consultationData.patient_id} />
            </div>
          )}

            {/* Language selection + mic test */}
            <div className="w-full max-w-lg space-y-3">
              {/* Dual language dropdowns */}
              <div className="rounded-xl border border-medical-border bg-white p-4 shadow-sm">
                <div className="mb-3 flex items-center gap-2">
                  <svg className="h-4 w-4 text-brand-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m10.5 21 5.25-11.25L21 21m-9-3h7.5M3 5.621a48.474 48.474 0 0 1 6-.371m0 0c1.12 0 2.233.038 3.334.114M9 5.25V3m3.334 2.364C11.176 10.658 7.69 15.08 3 17.502m9.334-12.138c.896.061 1.785.147 2.666.257m-4.589 8.495a18.023 18.023 0 0 1-3.827-5.802" />
                  </svg>
                  <span className="text-sm font-semibold text-medical-text">Consultation Languages</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-blue-600">
                      <span className="h-2 w-2 rounded-full bg-blue-500" />
                      Doctor speaks
                    </label>
                    <select
                      value={doctorLang}
                      onChange={(e) => setDoctorLang(e.target.value)}
                      className="w-full rounded-lg border border-blue-200 bg-blue-50/30 px-3 py-2 text-sm text-medical-text focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/20"
                    >
                      {LANGUAGES.map((lang) => (
                        <option key={lang.value} value={lang.value}>{lang.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-green-600">
                      <span className="h-2 w-2 rounded-full bg-green-500" />
                      Patient speaks
                    </label>
                    <select
                      value={patientLang}
                      onChange={(e) => setPatientLang(e.target.value)}
                      className="w-full rounded-lg border border-green-200 bg-green-50/30 px-3 py-2 text-sm text-medical-text focus:border-green-400 focus:outline-none focus:ring-2 focus:ring-green-400/20"
                    >
                      {LANGUAGES.map((lang) => (
                        <option key={lang.value} value={lang.value}>{lang.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {isMultilingual && (
                  <div className="mt-3 flex items-start gap-2 rounded-lg bg-brand-50 px-3 py-2">
                    <svg className="mt-0.5 h-4 w-4 flex-shrink-0 text-brand-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m10.5 21 5.25-11.25L21 21m-9-3h7.5M3 5.621a48.474 48.474 0 0 1 6-.371m0 0c1.12 0 2.233.038 3.334.114M9 5.25V3m3.334 2.364C11.176 10.658 7.69 15.08 3 17.502m9.334-12.138c.896.061 1.785.147 2.666.257m-4.589 8.495a18.023 18.023 0 0 1-3.827-5.802" />
                    </svg>
                    <p className="text-xs text-brand-800">
                      <strong>Live translation active.</strong> Each message will be shown in both languages so doctor and patient can read the conversation in their own language.
                    </p>
                  </div>
                )}
              </div>

              {/* Mic test button */}
              <button
                type="button"
                onClick={() => void handleMicTest()}
                disabled={micTestState === "recording"}
                title="Test microphone (records 3 s and plays back)"
                className={`flex w-full items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors ${
                  micTestState === "recording"
                    ? "border-red-300 bg-red-50 text-red-700 animate-pulse"
                    : micTestState === "playing"
                    ? "border-green-300 bg-green-50 text-green-700"
                    : "border-medical-border bg-white text-medical-muted hover:border-gray-400 hover:text-medical-text"
                }`}
              >
                {micTestState === "recording" ? (
                  <>
                    <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                    Recording 3 seconds…
                  </>
                ) : micTestState === "playing" ? (
                  <>
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 0 1 0 12.728M16.463 8.288a5.25 5.25 0 0 1 0 7.424M6.75 8.25l4.72-4.72a.75.75 0 0 1 1.28.53v15.88a.75.75 0 0 1-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.009 9.009 0 0 1 2.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75Z" />
                    </svg>
                    Playing back…
                  </>
                ) : (
                  <>
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z" />
                    </svg>
                    Test microphone
                  </>
                )}
              </button>
            </div>

          {/* AI transparency notice */}
          <div className="w-full max-w-md rounded-lg border border-indigo-100 bg-indigo-50/40 px-4 py-3">
            <p className="text-xs text-indigo-800">
              <strong>{t("record.aiNotice")}</strong> — {t("record.aiNotice1")} {t("record.aiNotice1Desc")}{" "}
              <a href="/privacy#ai-transparency" target="_blank" className="text-indigo-600 underline">{t("record.aiPolicyLink")}</a>
            </p>
          </div>

          {/* Consent */}
          <label className="flex max-w-md cursor-pointer items-start gap-4 rounded-xl border-2 border-medical-border bg-white p-5 transition-colors hover:border-brand-300">
            <input
              type="checkbox"
              checked={consentGiven}
              onChange={(e) => setConsentGiven(e.target.checked)}
              className="mt-0.5 h-5 w-5 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
            />
            <span className="text-sm leading-relaxed text-medical-text">
              {t("record.consentText")}
            </span>
          </label>

          {/* Record button */}
          <div className="flex flex-col items-center gap-3">
            <Button
              onClick={handleStartRecording}
              disabled={!consentGiven || connectionStatus === "connecting"}
              variant="danger"
              size="lg"
              className="h-20 w-20 rounded-full !p-0 shadow-lg shadow-red-200 transition-transform active:scale-95 disabled:shadow-none"
            >
              <svg className="h-7 w-7" fill="currentColor" viewBox="0 0 20 20">
                <circle cx="10" cy="10" r="8" />
              </svg>
            </Button>
            <p className="text-xs text-medical-muted">
              {consentGiven
                ? "Tap to start recording"
                : "Confirm consent above to enable recording"}
            </p>
          </div>
        </div>
      )}

      {/* PHASE 2: RECORDING */}
      {phase === "recording" && (
        <div className="space-y-3 py-2">

          {/* ── Prominent status bar ─────────────────────────────────────── */}
          <div className={`flex items-center justify-between rounded-xl px-4 py-3 ${
            isPaused
              ? "bg-amber-50 border border-amber-200"
              : "bg-red-50 border border-red-200"
          }`}>
            <div className="flex items-center gap-3">
              {/* Pulsing recording dot */}
              <span className={`inline-flex h-4 w-4 rounded-full ${
                isPaused ? "bg-amber-400" : "bg-red-500 animate-pulse"
              }`} />
              <span className={`text-base font-bold ${isPaused ? "text-amber-800" : "text-red-800"}`}>
                {isPaused ? "PAUSED" : t("record.recording")}
              </span>
              <span className="font-mono text-lg font-semibold text-gray-700">
                {formatDuration(duration)}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {/* STT streaming status pill */}
              <div className={`hidden sm:flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ${
                streamingActive
                  ? "bg-purple-100 text-purple-700"
                  : streamingStatus.includes("batch") || streamingStatus.includes("locally")
                  ? "bg-amber-100 text-amber-700"
                  : "bg-green-100 text-green-700"
              }`}>
                <div className={`h-1.5 w-1.5 rounded-full ${
                  streamingActive ? "bg-purple-500 animate-pulse" : "bg-current"
                }`} />
                {streamingActive
                  ? t("record.streamingLive")
                  : streamingStatus.includes("batch") || streamingStatus.includes("locally")
                  ? "Batch mode"
                  : t("record.connected")}
              </div>

              {/* AI Tools toggle */}
              <button
                type="button"
                onClick={() => setShowSidebar((v) => !v)}
                className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${
                  showSidebar
                    ? "border-brand-400 bg-brand-50 text-brand-700"
                    : "border-gray-300 bg-white text-gray-600 hover:border-gray-400"
                }`}
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456Z" />
                </svg>
                AI Tools
                {showSidebar ? (
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 15.75 7.5-7.5 7.5 7.5" />
                  </svg>
                ) : (
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Streaming status detail — always show when not live */}
          {!streamingActive && isRecording && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              <span className="font-semibold">STT status:</span> {streamingStatus || "idle"}
            </div>
          )}

          {/* Floating Meet controls (popup management only — no video here) */}
          {consultationMode === "remote" && (
            <GoogleMeetEmbed
              consultationId={consultationId!}
              floating
              isRecording={isRecording}
              duration={formatDuration(duration)}
              streamingActive={streamingActive}
              isMultichannel={isMultichannel}
              remoteStream={null}
              shouldClose={shouldCloseMeet}
            />
          )}

          {/* In-person: audio waveform */}
          {consultationMode !== "remote" && (
            <AudioVisualizer audioLevel={audioLevel} isRecording={isRecording} isPaused={isPaused} duration={duration} />
          )}

          {/* ── Main content grid ─────────────────────────────────────────── */}
          <div className="grid gap-3 lg:grid-cols-5">

            {/* ── Left column (3/5): Video + Transcript + Notes ──────────── */}
            <div className="space-y-3 lg:col-span-3">

              {/* Video PiP — collapsible, inline (no overlap) */}
              {consultationMode === "remote" && (
                <div className="rounded-xl overflow-hidden border border-gray-700 bg-black shadow-lg">
                  <button
                    type="button"
                    onClick={() => setShowVideo((v) => !v)}
                    className="flex w-full items-center justify-between px-3 py-2 bg-gray-800 hover:bg-gray-750 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <svg className="h-3.5 w-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" />
                      </svg>
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-300">
                        Google Meet
                      </span>
                      {isMultichannel && (
                        <span className="rounded-full bg-purple-500/20 px-2 py-0.5 text-[9px] font-medium text-purple-400">Stereo</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {streamingActive && (
                        <span className="flex items-center gap-1 rounded-full bg-purple-500/20 px-2 py-0.5">
                          <span className="h-1.5 w-1.5 rounded-full bg-purple-400 animate-pulse" />
                          <span className="text-[9px] font-medium text-purple-300">Transcribing</span>
                        </span>
                      )}
                      <svg className={`h-3.5 w-3.5 text-gray-400 transition-transform ${showVideo ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                      </svg>
                    </div>
                  </button>
                  {showVideo && (
                    remoteVideoStream && remoteVideoStream.getVideoTracks().length > 0 ? (
                      <video
                        ref={pipVideoCallbackRef}
                        autoPlay
                        playsInline
                        muted
                        className="mx-auto block w-full bg-black"
                        style={{ height: "200px", objectFit: "contain" }}
                      />
                    ) : (
                      <div className="flex h-[100px] w-full flex-col items-center justify-center gap-2 bg-gray-900">
                        <svg className="h-6 w-6 text-gray-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" />
                        </svg>
                        <p className="text-[11px] text-gray-500">Share your Meet tab to show video</p>
                      </div>
                    )
                  )}
                </div>
              )}

              {/* Live transcript — collapsible */}
              <Card>
                <CardContent className="p-0">
                  <button
                    type="button"
                    onClick={() => setShowTranscript((v) => !v)}
                    className="flex w-full items-center justify-between px-4 py-2.5 hover:bg-gray-50/50 transition-colors rounded-t-xl"
                  >
                    <div className="flex items-center gap-2">
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-medical-muted">
                        {t("record.liveConversation")}
                      </h3>
                      {isRecording && streamingActive && (
                        <span className="flex items-center gap-1 rounded-full bg-purple-50 px-2 py-0.5 text-[10px] font-medium text-purple-600">
                          <span className="h-1.5 w-1.5 rounded-full bg-purple-500 animate-pulse" />
                          Live
                        </span>
                      )}
                      {isMultilingual && (
                        <span className="flex items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-medium text-brand-700">
                          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="m10.5 21 5.25-11.25L21 21m-9-3h7.5M3 5.621a48.474 48.474 0 0 1 6-.371m0 0c1.12 0 2.233.038 3.334.114M9 5.25V3m3.334 2.364C11.176 10.658 7.69 15.08 3 17.502m9.334-12.138c.896.061 1.785.147 2.666.257m-4.589 8.495a18.023 18.023 0 0 1-3.827-5.802" />
                          </svg>
                          Translation
                        </span>
                      )}
                      <span className="rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-500">
                        {transcript.filter(t => t.isFinal).length}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="hidden sm:flex items-center gap-1.5">
                        <span className="flex items-center gap-1 rounded-full bg-blue-50 px-1.5 py-0.5 text-[9px] font-medium text-blue-600">
                          <span className="h-1 w-1 rounded-full bg-blue-500" />
                          {LANG_LABELS[doctorLang] ?? doctorLang.toUpperCase()}
                        </span>
                        <span className="flex items-center gap-1 rounded-full bg-green-50 px-1.5 py-0.5 text-[9px] font-medium text-green-600">
                          <span className="h-1 w-1 rounded-full bg-green-500" />
                          {LANG_LABELS[patientLang] ?? patientLang.toUpperCase()}
                        </span>
                      </div>
                      <svg className={`h-3.5 w-3.5 text-gray-400 transition-transform ${showTranscript ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                      </svg>
                    </div>
                  </button>
                  {showTranscript && (
                    <div className="px-4 pb-3">
                      {renderTranscriptBubbles(transcript, "max-h-[50vh]")}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Session notes — collapsible */}
              <Card>
                <CardContent className="p-0">
                  <button
                    type="button"
                    onClick={() => setShowNotes((v) => !v)}
                    className="flex w-full items-center justify-between px-4 py-2.5 hover:bg-gray-50/50 transition-colors rounded-t-xl"
                  >
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-medical-muted">
                      {t("record.sessionNotes")}
                    </h3>
                    <svg className={`h-3.5 w-3.5 text-gray-400 transition-transform ${showNotes ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                    </svg>
                  </button>
                  {showNotes && (
                    <div className="px-4 pb-3">
                      <textarea
                        value={sessionNotes}
                        onChange={(e) => setSessionNotes(e.target.value)}
                        placeholder={t("record.sessionNotesPlaceholder")}
                        rows={3}
                        className="w-full resize-y rounded-lg border border-medical-border bg-white px-3 py-2 text-sm text-medical-text placeholder-medical-muted focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* ── Right column (2/5): AI Tools ────────────────────────────── */}
            <div className="lg:col-span-2 lg:max-h-[calc(100vh-8rem)] lg:overflow-y-auto space-y-3">
              {!showSidebar && (
                <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-3 text-center text-xs text-gray-400">
                  AI tools hidden — click <strong>AI Tools</strong> above
                </div>
              )}
              {showSidebar && (
                <>
                  <ProblemTracker isRecording={isRecording} duration={duration} onProblemsChange={handleProblemsChange} />
                  <AIAssistantPanel transcript={transcript} isRecording={isRecording} visitType={consultationData?.visit_type} patientName={patientName} />
                  <ClinicalDecisionSupport
                    consultationId={consultationId}
                    patientId={consultationData?.patient_id ?? undefined}
                    transcript={transcript.filter((t) => t.isFinal).map((t) => (t.speaker === 0 ? "Doctor" : "Patient") + ": " + t.text).join("\n")}
                    medications={[]}
                  />
                  <CriteriaTracker transcript={transcript.filter((t) => t.isFinal).map((t) => t.text).join(" ")} />
                </>
              )}
            </div>
          </div>

          {/* ── Controls ─────────────────────────────────────────────────── */}
          <div className="flex gap-3">
            <Button
              onClick={isPaused ? resumeRecording : pauseRecording}
              variant="outline"
              size="md"
              className="flex-1"
              title="Space bar shortcut"
            >
              {isPaused ? t("record.resume") : t("record.pause")}
            </Button>
            <Button
              onClick={handleEndRecording}
              disabled={isTranscribing}
              variant="danger"
              size="md"
              className="flex-1"
            >
              {isTranscribing ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Transcribing…
                </span>
              ) : t("record.endConsultation")}
            </Button>
          </div>

          {/* Keyboard shortcut hint */}
          <p className="text-center text-[11px] text-medical-muted">
            <kbd className="rounded border border-gray-200 bg-gray-50 px-1.5 py-0.5 font-mono text-[10px]">Space</kbd>
            {" "}pause / resume
          </p>

          {(error || recordingError) && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4">
              <p className="text-sm text-red-800">{error || recordingError}</p>
            </div>
          )}
        </div>
      )}

      {/* PHASE 3: POST-RECORDING */}
      {phase === "post" && (
        <div className="space-y-6 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-medical-text">{t("record.consultationComplete")}</h2>
              <p className="mt-2 text-medical-muted">
                {t("record.duration")}: {formatDuration(displayDuration)} &middot; {displayTranscript.filter(t => t.isFinal).length} {t("record.segments")}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const lines = displayTranscript
                  .filter((t) => t.isFinal)
                  .map((t) => {
                    const speaker = t.speaker === 0 ? "Doctor" : "Patient";
                    const ts = t.timestamp > 0 ? `[${formatDuration(Math.round(t.timestamp))}] ` : "";
                    return `${ts}${speaker}: ${t.text}`;
                  });
                if (sessionNotes.trim()) lines.push("\n--- Session Notes ---\n" + sessionNotes);
                const blob = new Blob([lines.join("\n")], { type: "text/plain" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `transcript-${consultationId}-${new Date().toISOString().split("T")[0]}.txt`;
                a.click();
                URL.revokeObjectURL(url);
              }}
            >
              <svg className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
              {t("record.exportTranscript")}
            </Button>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardContent className="space-y-4 pt-6">
                <h3 className="font-semibold text-medical-text">{t("record.transcriptReview")}</h3>
                {renderTranscriptBubbles(displayTranscript.filter(t => t.isFinal), "max-h-[500px]")}
              </CardContent>
            </Card>

            <div className="space-y-4">
              <AIAssistantPanel
                transcript={displayTranscript}
                isRecording={false}
                visitType={consultationData?.visit_type}
                patientName={patientName}
              />
              <ClinicalDecisionSupport
                consultationId={consultationId}
                patientId={consultationData?.patient_id ?? undefined}
                transcript={displayTranscript.filter((t) => t.isFinal).map((t) => (t.speaker === 0 ? "Doctor" : "Patient") + ": " + t.text).join("\n")}
                medications={[]}
              />
              <CriteriaTracker
                transcript={displayTranscript.filter((t) => t.isFinal).map((t) => t.text).join(" ")}
              />
            </div>
          </div>

          {sessionNotes.trim() && (
            <Card>
              <CardContent className="space-y-3 pt-6">
                <h3 className="font-semibold text-medical-text">{t("record.sessionNotesManual")}</h3>
                <div className="rounded-lg bg-amber-50 border border-amber-200 p-4 text-sm text-medical-text whitespace-pre-wrap">{sessionNotes}</div>
              </CardContent>
            </Card>
          )}

          {/* Quick Actions */}
          <div className="flex flex-wrap gap-3">
            <Button
              variant="outline"
              size="md"
              onClick={() => router.push(`/consultation/${consultationId}/prescription`)}
              className="flex items-center gap-2"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
              </svg>
              {t("record.writePrescription")}
            </Button>
            <Button
              variant="outline"
              size="md"
              onClick={() => router.push(`/consultation/${consultationId}/discharge`)}
              className="flex items-center gap-2"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25Z" />
              </svg>
              Patient Discharge
            </Button>
          </div>

          <Card>
            <CardContent className="space-y-4 pt-6">
              <div>
                <label htmlFor="template" className="block text-sm font-medium text-medical-text">{t("record.selectTemplate")}</label>
                <select
                  id="template"
                  value={selectedTemplate}
                  onChange={(e) => setSelectedTemplate(e.target.value)}
                  className="mt-2 block w-full rounded-lg border border-medical-border px-4 py-2.5 text-medical-text focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                >
                  {TEMPLATES.map((tmpl) => (
                    <option key={tmpl.value} value={tmpl.value}>{tmpl.label}</option>
                  ))}
                </select>
              </div>
              <Button
                onClick={handleGenerateNote}
                disabled={isGeneratingNote || displayTranscript.length === 0}
                variant="primary"
                size="lg"
                className="w-full"
              >
                {isGeneratingNote ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    {t("record.generatingNote")}
                  </span>
                ) : t("record.generateNote")}
              </Button>
            </CardContent>
          </Card>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
