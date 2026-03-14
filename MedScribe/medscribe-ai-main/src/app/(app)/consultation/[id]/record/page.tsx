"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";
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
  { value: "en", label: "English", model: "nova-3-medical" },
  { value: "ro", label: "Romanian", model: "nova-3" },
  { value: "de", label: "German", model: "nova-3" },
  { value: "fr", label: "French", model: "nova-3" },
  { value: "es", label: "Spanish", model: "nova-3" },
  { value: "it", label: "Italian", model: "nova-3" },
  { value: "pt", label: "Portuguese", model: "nova-3" },
  { value: "nl", label: "Dutch", model: "nova-3" },
  { value: "pl", label: "Polish", model: "nova-3" },
  { value: "hu", label: "Hungarian", model: "nova-3" },
  { value: "bg", label: "Bulgarian", model: "nova-3" },
  { value: "cs", label: "Czech", model: "nova-3" },
  { value: "ru", label: "Russian", model: "nova-3" },
  { value: "tr", label: "Turkish", model: "nova-3" },
  { value: "hi", label: "Hindi", model: "nova-3" },
  { value: "ja", label: "Japanese", model: "nova-3" },
  { value: "ko", label: "Korean", model: "nova-3" },
];

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
  const [selectedLanguage, setSelectedLanguage] = useState("en");
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
  } = useAudioRecorder({
    mode: consultationMode,
    language: selectedLanguage,
    streaming: true,
    onError: (err) => setError(err),
  });

  useEffect(() => {
    if (transcriptEndRef.current) {
      transcriptEndRef.current.scrollIntoView({ behavior: "smooth" });
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
      await stopRecording();

      // Save transcript to database
      const finalSegments = transcript.filter(t => t.isFinal);
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
          language: selectedLanguage,
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
          language: selectedLanguage,
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
              {consultationMode === "remote" && (
                <p className="mt-2 text-xs text-amber-600 max-w-xs">
                  No words yet? Share the <strong>Google Meet</strong> tab (not MedScribe) and turn on &quot;Also share tab audio&quot;.
                </p>
              )}
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
            return (
              <div
                key={`${item.timestamp}-${item.speaker}-${idx}`}
                className={`flex ${isDoctor ? "justify-start" : "justify-end"} animate-in fade-in slide-in-from-bottom-2 duration-300`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm shadow-sm ${
                    isDoctor
                      ? "bg-blue-100 text-blue-900 rounded-bl-md"
                      : "bg-green-100 text-green-900 rounded-br-md"
                  } ${isInterim ? "italic opacity-70" : ""}`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[10px] font-bold uppercase tracking-wider ${isDoctor ? "text-blue-600" : "text-green-600"}`}>
                      {isDoctor ? t("record.doctor") : t("record.patientSpeaker")}
                    </span>
                    {item.timestamp > 0 && (
                      <span className="text-[10px] text-gray-400">{formatDuration(Math.round(item.timestamp))}</span>
                    )}
                    {item.confidence > 0 && item.confidence < 0.8 && (
                      <span className="text-[10px] text-amber-500">~{Math.round(item.confidence * 100)}%</span>
                    )}
                  </div>
                  <p className="leading-relaxed">{item.text}</p>
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
      {/* PHASE 1: PRE-RECORDING */}
      {phase === "pre" && (
        <div className="flex flex-col items-center gap-8 py-16">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-medical-text">{t("record.startConsultation")}</h1>
            <p className="mt-2 text-medical-muted">{t("record.ensureConsent")}</p>
          </div>

          {patientName && (
            <Card className="w-full max-w-md">
              <CardContent className="space-y-2 pt-6">
                <p className="text-sm font-medium text-medical-muted">{t("record.patient")}</p>
                <p className="text-lg font-semibold text-medical-text">{patientName}</p>
                <p className="text-sm text-medical-muted">{t("record.visitType")}: {consultationData?.visit_type ? translateVisitType(consultationData.visit_type, t) : t("visit.generalVisit")}</p>
              </CardContent>
            </Card>
          )}

          {/* Stage 1: Pre-Visit Intelligence Brief */}
          {consultationData?.patient_id && (
            <div className="w-full max-w-2xl">
              <PreVisitBrief patientId={consultationData.patient_id} />
            </div>
          )}

          <Card className="w-full max-w-md">
            <CardContent className="space-y-3 pt-6">
              <p className="text-sm font-medium text-medical-text">{t("record.consultationMode")}</p>
              <p className="text-xs text-medical-muted">{t("record.modeDescription")}</p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setConsultationMode("in-person")}
                  className={`flex flex-col items-center gap-2 rounded-lg border-2 p-4 text-sm transition-colors ${
                    consultationMode === "in-person"
                      ? "border-brand-500 bg-brand-50 text-brand-700"
                      : "border-medical-border bg-white text-medical-muted hover:border-gray-300"
                  }`}
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                  </svg>
                  <span className="font-medium">{t("record.inPerson")}</span>
                  <span className="text-xs text-center leading-tight">{t("record.singleMic")}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setConsultationMode("remote")}
                  className={`flex flex-col items-center gap-2 rounded-lg border-2 p-4 text-sm transition-colors ${
                    consultationMode === "remote"
                      ? "border-brand-500 bg-brand-50 text-brand-700"
                      : "border-medical-border bg-white text-medical-muted hover:border-gray-300"
                  }`}
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" />
                  </svg>
                  <span className="font-medium">{t("record.remoteCall")}</span>
                  <span className="text-xs text-center leading-tight">{t("record.micTab")}</span>
                </button>
              </div>
            </CardContent>
          </Card>

          <Card className="w-full max-w-md">
            <CardContent className="space-y-3 pt-6">
              <p className="text-sm font-medium text-medical-text">{t("record.consultationLanguage")}</p>
              <select
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value)}
                className="block w-full rounded-lg border border-medical-border px-4 py-2.5 text-sm text-medical-text focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              >
                {LANGUAGES.map((lang) => (
                  <option key={lang.value} value={lang.value}>{lang.label}</option>
                ))}
              </select>
            </CardContent>
          </Card>

          {/* Remote mode: minimal Meet launcher */}
          {consultationMode === "remote" && consultationId && (
            <div className="w-full max-w-2xl">
              <GoogleMeetEmbed consultationId={consultationId} />
            </div>
          )}

          {/* Stage 2: Identity & Tech Verification (telemedicine only) */}
          {consultationMode === "remote" && !identityVerified && (
            <IdentityVerification
              patientName={patientName}
              patientDOB={consultationData?.patient?.date_of_birth}
              consultationId={consultationId}
              onVerified={handleIdentityVerified}
            />
          )}
          {consultationMode === "remote" && identityVerified && (
            <div className="flex items-center gap-2 rounded-lg bg-green-50 border border-green-200 px-4 py-2 w-full max-w-md">
              <svg className="h-4 w-4 text-green-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
              </svg>
              <span className="text-sm text-green-700 font-medium">Identity & tech check verified</span>
            </div>
          )}

          {/* AI Transparency Notice — compact */}
          <div className="w-full max-w-md rounded-lg border border-indigo-200 bg-indigo-50/30 px-4 py-3">
            <p className="text-xs text-indigo-800">
              <strong>{t("record.aiNotice")}</strong> — {t("record.aiNotice1")} {t("record.aiNotice1Desc")}{" "}
              <a href="/privacy#ai-transparency" target="_blank" className="text-indigo-600 underline">{t("record.aiPolicyLink")}</a>
            </p>
          </div>

          <label className="flex max-w-2xl items-start gap-4 rounded-xl border border-medical-border bg-white p-6">
            <input
              type="checkbox"
              checked={consentGiven}
              onChange={(e) => setConsentGiven(e.target.checked)}
              className="mt-1 h-5 w-5 rounded border-gray-300 text-brand-600"
            />
            <span className="text-sm leading-relaxed text-medical-text">
              {t("record.consentText")}
            </span>
          </label>

          <div className="flex items-center gap-2 rounded-lg bg-gray-50 px-4 py-2">
            <div className={`h-2 w-2 rounded-full ${connectionStatus === "connecting" ? "bg-yellow-500 animate-pulse" : connectionStatus === "error" ? "bg-red-500" : "bg-green-500"}`} />
            <span className="text-sm text-medical-muted">
              {t("record.readyToRecord")}
            </span>
          </div>

          <Button
            onClick={handleStartRecording}
            disabled={!consentGiven || connectionStatus === "connecting"}
            variant="danger"
            size="lg"
            className="h-16 w-16 rounded-full !p-0"
          >
            <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 20 20"><circle cx="10" cy="10" r="8" /></svg>
          </Button>
        </div>
      )}

      {/* PHASE 2: RECORDING */}
      {phase === "recording" && (
        <div className="space-y-3 py-2">
          {/* Error banner */}
          {streamingStatus && (streamingStatus.includes("error") || streamingStatus.includes("failed")) && (
            <div className="rounded-lg px-3 py-1.5 text-xs bg-red-50 text-red-700 border border-red-200">
              Transcription issue: {streamingStatus}
            </div>
          )}

          {/* ===== REMOTE MODE: Meet slot + transcript + AI ===== */}
          {consultationMode === "remote" ? (
            <>
              {/* Recording status bar */}
              <div className="flex items-center justify-between rounded-lg bg-gray-50 p-3">
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-3 w-3 animate-pulse rounded-full bg-medical-recording" />
                  <span className="text-lg font-semibold text-medical-recording">{t("record.recording")}</span>
                  <span className="text-lg font-mono text-medical-text">{formatDuration(duration)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${streamingActive ? "bg-purple-100 text-purple-700" : "bg-green-100 text-green-700"}`}>
                    <div className={`h-2 w-2 rounded-full ${streamingActive ? "bg-purple-500 animate-pulse" : "bg-green-500"}`} />
                    {streamingActive ? t("record.streamingLive") : t("record.connected")}
                  </div>
                </div>
              </div>

              {/* Meet PiP slot + Transcript + AI */}
              <div className="grid gap-3 lg:grid-cols-5">
                <div className="lg:col-span-3 space-y-3">
                  <div className="flex flex-col sm:flex-row gap-3 items-start">
                    <div className="flex flex-col gap-1.5 shrink-0">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Video call</span>
                      <GoogleMeetEmbed
                      consultationId={consultationId!}
                      slot
                      isRecording={isRecording}
                      duration={formatDuration(duration)}
                      streamingActive={streamingActive}
                      isMultichannel={isMultichannel}
                      remoteStream={remoteVideoStream}
                    />
                    </div>
                    <div className="flex-1 min-w-0 w-full">
                  <Card>
                    <CardContent className="pt-3 pb-3">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-xs font-semibold uppercase text-medical-muted">{t("record.liveConversation")}</h3>
                        <div className="flex items-center gap-2">
                          <span className="flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-600">
                            <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />{t("record.doctor")}
                          </span>
                          <span className="flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-medium text-green-600">
                            <span className="h-1.5 w-1.5 rounded-full bg-green-500" />{t("record.patientSpeaker")}
                          </span>
                        </div>
                      </div>
                      {renderTranscriptBubbles(transcript, "max-h-[500px]")}
                    </CardContent>
                  </Card>
                    </div>
                  </div>

                  <Card>
                    <CardContent className="pt-3 pb-3">
                      <h3 className="mb-1.5 text-xs font-semibold uppercase text-medical-muted">{t("record.sessionNotes")}</h3>
                      <textarea
                        value={sessionNotes}
                        onChange={(e) => setSessionNotes(e.target.value)}
                        placeholder={t("record.sessionNotesPlaceholder")}
                        className="w-full min-h-[60px] rounded-lg border border-medical-border bg-white px-3 py-2 text-sm text-medical-text placeholder-medical-muted focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 resize-y"
                      />
                    </CardContent>
                  </Card>
                </div>

                <div className="lg:col-span-2 lg:sticky lg:top-4 lg:self-start lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto space-y-3">
                  <ProblemTracker isRecording={isRecording} duration={duration} onProblemsChange={handleProblemsChange} />
                  <AIAssistantPanel transcript={transcript} isRecording={isRecording} visitType={consultationData?.visit_type} patientName={patientName} />
                  <ClinicalDecisionSupport
                    consultationId={consultationId}
                    patientId={consultationData?.patient_id ?? undefined}
                    transcript={transcript.filter((t) => t.isFinal).map((t) => (t.speaker === 0 ? "Doctor" : "Patient") + ": " + t.text).join("\n")}
                    medications={[]}
                  />
                  <CriteriaTracker transcript={transcript.filter((t) => t.isFinal).map((t) => t.text).join(" ")} />
                </div>
              </div>
            </>
          ) : (
            <>
              {/* ===== IN-PERSON MODE: Audio visualizer + standard layout ===== */}
              <div className="flex items-center justify-between rounded-lg bg-gray-50 p-3">
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-3 w-3 animate-pulse rounded-full bg-medical-recording" />
                  <span className="text-lg font-semibold text-medical-recording">{t("record.recording")}</span>
                  <span className="text-lg font-mono text-medical-text">{formatDuration(duration)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${streamingActive ? "bg-purple-100 text-purple-700" : "bg-green-100 text-green-700"}`}>
                    <div className={`h-2 w-2 rounded-full ${streamingActive ? "bg-purple-500 animate-pulse" : "bg-green-500"}`} />
                    {streamingActive ? t("record.streamingLive") : t("record.connected")}
                  </div>
                </div>
              </div>

              <AudioVisualizer audioLevel={audioLevel} isRecording={isRecording} isPaused={isPaused} duration={duration} />

              <div className="grid gap-4 lg:grid-cols-5">
                <div className="lg:col-span-3 space-y-4">
                  <Card>
                    <CardContent className="pt-4 pb-4">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-semibold uppercase text-medical-muted">{t("record.liveConversation")}</h3>
                        <div className="flex items-center gap-2">
                          <span className="flex items-center gap-1.5 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-600">
                            <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />{t("record.doctor")}
                          </span>
                          <span className="flex items-center gap-1.5 rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-medium text-green-600">
                            <span className="h-1.5 w-1.5 rounded-full bg-green-500" />{t("record.patientSpeaker")}
                          </span>
                        </div>
                      </div>
                      {renderTranscriptBubbles(transcript)}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="pt-4 pb-4">
                      <h3 className="mb-2 text-xs font-semibold uppercase text-medical-muted">{t("record.sessionNotes")}</h3>
                      <textarea
                        value={sessionNotes}
                        onChange={(e) => setSessionNotes(e.target.value)}
                        placeholder={t("record.sessionNotesPlaceholder")}
                        className="w-full min-h-[80px] rounded-lg border border-medical-border bg-white px-3 py-2 text-sm text-medical-text placeholder-medical-muted focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 resize-y"
                      />
                    </CardContent>
                  </Card>
                </div>

                <div className="lg:col-span-2 lg:sticky lg:top-24 lg:self-start lg:max-h-[calc(100vh-8rem)] lg:overflow-y-auto space-y-4">
                  <ProblemTracker isRecording={isRecording} duration={duration} onProblemsChange={handleProblemsChange} />
                  <AIAssistantPanel transcript={transcript} isRecording={isRecording} visitType={consultationData?.visit_type} patientName={patientName} />
                  <ClinicalDecisionSupport
                    consultationId={consultationId}
                    patientId={consultationData?.patient_id ?? undefined}
                    transcript={transcript.filter((t) => t.isFinal).map((t) => (t.speaker === 0 ? "Doctor" : "Patient") + ": " + t.text).join("\n")}
                    medications={[]}
                  />
                  <CriteriaTracker transcript={transcript.filter((t) => t.isFinal).map((t) => t.text).join(" ")} />
                </div>
              </div>
            </>
          )}

          {/* Controls — shared by both modes */}
          <div className="flex gap-3">
            <Button onClick={isPaused ? resumeRecording : pauseRecording} variant="outline" size="md" className="flex-1">
              {isPaused ? t("record.resume") : t("record.pause")}
            </Button>
            <Button onClick={handleEndRecording} disabled={isTranscribing} variant="danger" size="md" className="flex-1">
              {t("record.endConsultation")}
            </Button>
          </div>

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
