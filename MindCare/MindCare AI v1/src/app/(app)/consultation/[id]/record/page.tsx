"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatDuration } from "@/lib/utils";
import { AudioVisualizer } from "@/components/consultation/AudioVisualizer";
import { AIAssistantPanel } from "@/components/consultation/AIAssistantPanel";
import type { ConsultationMode } from "@/types";

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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const supabase = useMemo(() => createClient(), []);
  const consultationId = params?.id;

  // Phase management
  const [phase, setPhase] = useState<RecordingPhase>("pre");
  const [consentGiven, setConsentGiven] = useState(false);
  const [isLoadingConsultation, setIsLoadingConsultation] = useState(true);
  const [consultationData, setConsultationData] = useState<any>(null);
  const [error, setError] = useState("");

  // Consultation mode: in-person (single mic) or remote (video call, dual capture)
  const [consultationMode, setConsultationMode] =
    useState<ConsultationMode>("in-person");

  // Language selection
  const [selectedLanguage, setSelectedLanguage] = useState("en");

  // Recording state
  const [selectedTemplate, setSelectedTemplate] = useState(TEMPLATES[0].value);
  const [isGeneratingNote, setIsGeneratingNote] = useState(false);

  // Session notes (manual notes by the physician)
  const [sessionNotes, setSessionNotes] = useState("");

  // Audio recorder hook — records locally, transcribes via Deepgram Nova 3 Medical
  const {
    isRecording,
    isPaused,
    duration,
    audioLevel,
    connectionStatus,
    transcript,
    isTranscribing,
    isMultichannel,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    error: recordingError,
  } = useAudioRecorder({
    mode: consultationMode,
    language: selectedLanguage,
    onError: (err) => setError(err),
  });

  // Load consultation and auth token on mount
  useEffect(() => {
    const loadConsultationAndAuth = async () => {
      if (!consultationId) {
        setError("Invalid consultation ID");
        setIsLoadingConsultation(false);
        return;
      }

      try {
        // Fetch consultation data
        const { data, error: fetchError } = await supabase
          .from("consultations")
          .select("*")
          .eq("id", consultationId)
          .single();

        if (fetchError) {
          throw new Error(fetchError.message || "Failed to load consultation");
        }

        if (!data) {
          throw new Error("Consultation not found");
        }

        setConsultationData(data);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "An unexpected error occurred";
        setError(message);
      } finally {
        setIsLoadingConsultation(false);
      }
    };

    loadConsultationAndAuth();
  }, [consultationId, supabase]);

  const handleStartRecording = async () => {
    setError("");
    try {
      // Update consultation consent status
      await supabase
        .from("consultations")
        .update({
          consent_given: true,
          consent_timestamp: new Date().toISOString(),
          status: "recording",
        })
        .eq("id", consultationId);

      await startRecording();
      setPhase("recording");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to start recording";
      setError(message);
    }
  };

  const handleEndRecording = async () => {
    try {
      // Stop recording and wait for transcription to complete
      await stopRecording();

      // Update consultation with recording duration
      await supabase
        .from("consultations")
        .update({
          recording_duration_seconds: duration,
          status: "transcribed",
        })
        .eq("id", consultationId);

      setPhase("post");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to end recording";
      setError(message);
    }
  };

  const handleGenerateNote = async () => {
    setError("");
    setIsGeneratingNote(true);

    try {
      // Compile full transcript text
      const transcriptText = transcript
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

      // Call generate-note API — pass language so the note is generated in the consultation language
      const response = await fetch("/api/generate-note", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          consultation_id: consultationId,
          template: selectedTemplate,
          transcript: transcriptText,
          language: selectedLanguage,
          metadata: {
            visit_type: consultationData?.visit_type,
            patient_name: consultationData?.metadata?.patient_name,
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to generate note");
      }

      // Redirect to note view page
      router.push(`/consultation/${consultationId}/note`);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "An unexpected error occurred";
      setError(message);
      setIsGeneratingNote(false);
    }
  };

  // Loading state
  if (isLoadingConsultation) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-t-brand-600" />
          <p className="text-medical-text">Loading consultation...</p>
        </div>
      </div>
    );
  }

  // Error loading consultation
  if (error && phase === "pre" && !isRecording) {
    return (
      <div className="mx-auto max-w-4xl p-6">
        <div className="rounded-lg border border-red-200 bg-red-50 p-6">
          <h2 className="text-lg font-semibold text-red-900">Error</h2>
          <p className="mt-2 text-red-800">{error}</p>
          <Button
            onClick={() => router.back()}
            variant="outline"
            className="mt-4"
          >
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      {/* PHASE 1: PRE-RECORDING */}
      {phase === "pre" && (
        <div className="flex flex-col items-center gap-8 py-16">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-medical-text">
              Start Consultation
            </h1>
            <p className="mt-2 text-medical-muted">
              Ensure patient consent before recording.
            </p>
          </div>

          {/* Patient Info Summary */}
          {consultationData?.metadata?.patient_name && (
            <Card className="w-full max-w-md">
              <CardContent className="space-y-2 pt-6">
                <p className="text-sm font-medium text-medical-muted">Patient</p>
                <p className="text-lg font-semibold text-medical-text">
                  {consultationData.metadata.patient_name}
                </p>
                <p className="text-sm text-medical-muted">
                  Visit Type: {consultationData.visit_type}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Consultation Mode Selector */}
          <Card className="w-full max-w-md">
            <CardContent className="space-y-3 pt-6">
              <p className="text-sm font-medium text-medical-text">
                Consultation Mode
              </p>
              <p className="text-xs text-medical-muted">
                Select how the consultation is being conducted for optimal speaker separation.
              </p>
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
                  <span className="font-medium">In-Person</span>
                  <span className="text-xs text-center leading-tight">
                    Single microphone
                  </span>
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
                  <span className="font-medium">Remote Video Call</span>
                  <span className="text-xs text-center leading-tight">
                    Mic + tab audio
                  </span>
                </button>
              </div>
              {consultationMode === "remote" && (
                <div className="rounded-lg bg-blue-50 border border-blue-200 p-3">
                  <p className="text-xs text-blue-800 leading-relaxed">
                    <span className="font-semibold">How it works:</span> When you start recording,
                    the browser will ask you to select the tab running your video call. This captures
                    the patient&apos;s audio separately from your microphone for accurate speaker separation.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Language Selector */}
          <Card className="w-full max-w-md">
            <CardContent className="space-y-3 pt-6">
              <p className="text-sm font-medium text-medical-text">
                Consultation Language
              </p>
              <select
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value)}
                className="block w-full rounded-lg border border-medical-border px-4 py-2.5 text-sm text-medical-text focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              >
                {LANGUAGES.map((lang) => (
                  <option key={lang.value} value={lang.value}>
                    {lang.label}
                  </option>
                ))}
              </select>
              {selectedLanguage !== "en" && (
                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  Non-English languages use the Nova-3 general model instead of Nova-3 Medical.
                  Medical terminology recognition may be slightly less specialized.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Consent Checkbox */}
          <label className="flex max-w-2xl items-start gap-4 rounded-xl border border-medical-border bg-white p-6">
            <input
              type="checkbox"
              checked={consentGiven}
              onChange={(e) => setConsentGiven(e.target.checked)}
              className="mt-1 h-5 w-5 rounded border-gray-300 text-brand-600"
            />
            <span className="text-sm leading-relaxed text-medical-text">
              I confirm that the patient has been fully informed about this audio recording,
              understands it will be used for clinical documentation purposes, and has explicitly
              consented to being recorded. The patient has been provided an opportunity to ask
              questions and understands they can request the recording to be stopped at any time.
            </span>
          </label>

          {/* Connection Status */}
          <div className="flex items-center gap-2 rounded-lg bg-gray-50 px-4 py-2">
            <div
              className={`h-2 w-2 rounded-full ${
                connectionStatus === "connecting"
                  ? "bg-yellow-500 animate-pulse"
                  : connectionStatus === "error"
                    ? "bg-red-500"
                    : "bg-green-500"
              }`}
            />
            <span className="text-sm text-medical-muted">
              {connectionStatus === "connecting"
                ? "Connecting to Deepgram..."
                : connectionStatus === "error"
                  ? "Connection error"
                  : `Ready to record (Deepgram ${selectedLanguage === "en" ? "Nova 3 Medical" : "Nova 3"} — ${LANGUAGES.find((l) => l.value === selectedLanguage)?.label ?? selectedLanguage})`}
            </span>
          </div>

          {/* Start Recording Button */}
          <Button
            onClick={handleStartRecording}
            disabled={!consentGiven || connectionStatus === "connecting"}
            variant="danger"
            size="lg"
            className="h-16 w-16 rounded-full !p-0"
          >
            <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 20 20">
              <circle cx="10" cy="10" r="8" />
            </svg>
          </Button>
        </div>
      )}

      {/* PHASE 2: RECORDING */}
      {phase === "recording" && (
        <div className="space-y-6 py-8">
          {/* Recording Header */}
          <div className="flex items-center justify-between rounded-lg bg-gray-50 p-4">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-3 w-3 animate-pulse rounded-full bg-medical-recording" />
              <span className="text-lg font-semibold text-medical-recording">
                Recording
              </span>
              <span className="text-lg font-mono text-medical-text">
                {formatDuration(duration)}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {/* Multichannel / Mode Badge */}
              <div
                className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
                  isMultichannel
                    ? "bg-purple-100 text-purple-700"
                    : "bg-gray-100 text-gray-600"
                }`}
              >
                {isMultichannel ? (
                  <>
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" />
                    </svg>
                    Stereo (Mic + Tab)
                  </>
                ) : (
                  <>
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z" />
                    </svg>
                    Single Mic
                  </>
                )}
              </div>

              {/* Connection Status Badge */}
              <div
                className={`flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ${
                  connectionStatus === "connected"
                    ? "bg-green-100 text-green-700"
                    : connectionStatus === "connecting"
                      ? "bg-yellow-100 text-yellow-700"
                      : "bg-red-100 text-red-700"
                }`}
              >
                <div
                  className={`h-2 w-2 rounded-full ${
                    connectionStatus === "connected"
                      ? "bg-green-500"
                      : connectionStatus === "connecting"
                        ? "bg-yellow-500"
                        : "bg-red-500"
                  }`}
                />
                {connectionStatus === "connected"
                  ? "Connected"
                  : connectionStatus === "connecting"
                    ? "Connecting"
                    : "Error"}
              </div>
            </div>
          </div>

          {/* Live Audio Visualizer */}
          <AudioVisualizer
            audioLevel={audioLevel}
            isRecording={isRecording}
            isPaused={isPaused}
            duration={duration}
          />

          {/* Live Transcript */}
          <Card>
            <CardContent className="pt-6">
              <h3 className="mb-4 text-sm font-semibold uppercase text-medical-muted">
                Live Transcript
              </h3>
              <div className="max-h-80 space-y-3 overflow-y-auto rounded-lg bg-gray-50 p-4">
                {isTranscribing ? (
                  <div className="flex items-center gap-3 text-sm text-medical-muted">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-200 border-t-brand-600" />
                    <p>Transcribing with Deepgram {selectedLanguage === "en" ? "Nova 3 Medical" : "Nova 3"}...</p>
                  </div>
                ) : transcript.length === 0 ? (
                  <div className="text-center py-6">
                    <div className="flex justify-center gap-1 mb-3">
                      {[0, 1, 2].map((i) => (
                        <div
                          key={i}
                          className="h-2 w-2 rounded-full bg-brand-400 animate-bounce"
                          style={{ animationDelay: `${i * 0.15}s` }}
                        />
                      ))}
                    </div>
                    <p className="text-sm text-medical-muted">
                      Listening... Speak naturally. The conversation will be transcribed when you end the consultation.
                    </p>
                  </div>
                ) : (
                  transcript.map((item, idx) => {
                    const isDoctor = item.speaker === 0;
                    const isInterim = !item.isFinal;

                    return (
                      <div
                        key={idx}
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
                              {isDoctor ? "Doctor" : "Patient"}
                            </span>
                            {item.timestamp > 0 && (
                              <span className="text-[10px] text-gray-400">
                                {formatDuration(Math.round(item.timestamp))}
                              </span>
                            )}
                            {item.confidence > 0 && item.confidence < 0.8 && (
                              <span className="text-[10px] text-amber-500" title={`Confidence: ${Math.round(item.confidence * 100)}%`}>
                                ~{Math.round(item.confidence * 100)}%
                              </span>
                            )}
                          </div>
                          <p className="leading-relaxed">{item.text}</p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>

          {/* Session Notes (Manual) */}
          <Card>
            <CardContent className="pt-6">
              <h3 className="mb-3 text-sm font-semibold uppercase text-medical-muted">
                Session Notes (Manual)
              </h3>
              <textarea
                value={sessionNotes}
                onChange={(e) => setSessionNotes(e.target.value)}
                placeholder="Add your own notes during the session... These will be saved alongside the transcript."
                className="w-full min-h-[100px] rounded-lg border border-medical-border bg-white px-4 py-3 text-sm text-medical-text placeholder-medical-muted focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 resize-y"
              />
            </CardContent>
          </Card>

          {/* AI Clinical Assistant — active during recording when transcript is available */}
          <AIAssistantPanel
            transcript={transcript}
            isRecording={isRecording}
            visitType={consultationData?.visit_type}
            patientName={consultationData?.metadata?.patient_name}
          />

          {/* Controls */}
          <div className="flex gap-3">
            <Button
              onClick={isPaused ? resumeRecording : pauseRecording}
              variant="outline"
              size="md"
              className="flex-1"
            >
              {isPaused ? "Resume" : "Pause"}
            </Button>
            <Button
              onClick={handleEndRecording}
              disabled={isTranscribing}
              variant="danger"
              size="md"
              className="flex-1"
            >
              End Consultation
            </Button>
          </div>

          {/* Error Alert */}
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
              <h2 className="text-2xl font-bold text-medical-text">
                Consultation Complete
              </h2>
              <p className="mt-2 text-medical-muted">
                Duration: {formatDuration(duration)} &middot; {transcript.filter(t => t.isFinal).length} segments
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const lines = transcript
                  .filter((t) => t.isFinal)
                  .map((t) => {
                    const speaker = t.speaker === 0 ? "Doctor" : "Patient";
                    const ts = t.timestamp > 0 ? `[${formatDuration(Math.round(t.timestamp))}] ` : "";
                    return `${ts}${speaker}: ${t.text}`;
                  });
                if (sessionNotes.trim()) {
                  lines.push("\n--- Session Notes ---\n" + sessionNotes);
                }
                const blob = new Blob([lines.join("\n")], { type: "text/plain" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `transcript-${consultationId}-${new Date().toISOString().split("T")[0]}.txt`;
                a.click();
                URL.revokeObjectURL(url);
              }}
            >
              <svg className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
              Export Transcript
            </Button>
          </div>

          {/* Two-Column Layout: Transcript + AI Assistant */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Left: Transcript Review */}
            <Card>
              <CardContent className="space-y-4 pt-6">
                <h3 className="font-semibold text-medical-text">Transcript Review</h3>
                <div className="max-h-[500px] space-y-2 overflow-y-auto rounded-lg bg-gray-50 p-4 text-sm">
                  {transcript.length === 0 ? (
                    <p className="italic text-medical-muted">No transcript available</p>
                  ) : (
                    transcript
                      .filter((item) => item.isFinal)
                      .map((item, idx) => {
                        const isDoctor = item.speaker === 0;
                        return (
                          <div
                            key={idx}
                            className={`flex ${isDoctor ? "justify-start" : "justify-end"}`}
                          >
                            <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${
                              isDoctor
                                ? "bg-blue-100 text-blue-900 rounded-bl-md"
                                : "bg-green-100 text-green-900 rounded-br-md"
                            }`}>
                              <div className="flex items-center gap-2 mb-1">
                                <span className={`text-[10px] font-bold uppercase tracking-wider ${isDoctor ? "text-blue-600" : "text-green-600"}`}>
                                  {isDoctor ? "Doctor" : "Patient"}
                                </span>
                                {item.timestamp > 0 && (
                                  <span className="text-[10px] text-gray-400">
                                    {formatDuration(Math.round(item.timestamp))}
                                  </span>
                                )}
                              </div>
                              <p className="leading-relaxed">{item.text}</p>
                            </div>
                          </div>
                        );
                      })
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Right: AI Clinical Assistant */}
            <AIAssistantPanel
              transcript={transcript}
              isRecording={false}
              visitType={consultationData?.visit_type}
              patientName={consultationData?.metadata?.patient_name}
            />
          </div>

          {/* Session Notes Review */}
          {sessionNotes.trim() && (
            <Card>
              <CardContent className="space-y-3 pt-6">
                <h3 className="font-semibold text-medical-text">Session Notes (Manual)</h3>
                <div className="rounded-lg bg-amber-50 border border-amber-200 p-4 text-sm text-medical-text whitespace-pre-wrap">
                  {sessionNotes}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Template Selection and Generate */}
          <Card>
            <CardContent className="space-y-4 pt-6">
              <div>
                <label htmlFor="template" className="block text-sm font-medium text-medical-text">
                  Select Note Template
                </label>
                <select
                  id="template"
                  value={selectedTemplate}
                  onChange={(e) => setSelectedTemplate(e.target.value)}
                  className="mt-2 block w-full rounded-lg border border-medical-border px-4 py-2.5 text-medical-text focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                >
                  {TEMPLATES.map((tmpl) => (
                    <option key={tmpl.value} value={tmpl.value}>
                      {tmpl.label}
                    </option>
                  ))}
                </select>
              </div>

              <Button
                onClick={handleGenerateNote}
                disabled={isGeneratingNote || transcript.length === 0}
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
                    Generating Clinical Note...
                  </span>
                ) : "Generate Clinical Note"}
              </Button>
            </CardContent>
          </Card>

          {/* Error Alert */}
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
