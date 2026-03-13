"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { LiveTranscriptItem } from "@/types";

interface Diagnosis {
  name: string;
  icd10?: string;
  confidence: number;
  reasoning: string;
}

interface FollowUpQuestion {
  question: string;
  category: string;
  priority: "high" | "medium" | "low";
  reasoning: string;
}

interface KeyFinding {
  finding: string;
  significance: "high" | "medium" | "low";
  source: "subjective" | "objective";
}

interface RedFlag {
  flag: string;
  action: string;
}

interface Medication {
  name: string;
  brandNames?: string[];
  dosage?: string | null;
  purpose?: string;
  source: "current" | "prescribed" | "mentioned";
}

interface DrugInteraction {
  drug1: string;
  drug2: string;
  severity: "major" | "moderate" | "minor";
  description: string;
  mechanism?: string;
  recommendation: string;
}

interface AnalysisResult {
  diagnoses: Diagnosis[];
  followUpQuestions: FollowUpQuestion[];
  keyFindings: KeyFinding[];
  redFlags: RedFlag[];
  medications?: Medication[];
  drugInteractions?: DrugInteraction[];
  differentialNotes: string;
  analyzedAt: string;
  model: string;
}

interface AIAssistantPanelProps {
  transcript: LiveTranscriptItem[];
  isRecording: boolean;
  visitType?: string;
  patientName?: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  history: "Medical History",
  symptoms: "Symptoms",
  medications: "Medications",
  lifestyle: "Lifestyle",
  family: "Family History",
  review_of_systems: "Review of Systems",
  red_flags: "Red Flags",
};

const PRIORITY_STYLES: Record<string, string> = {
  high: "border-l-red-500 bg-red-50",
  medium: "border-l-amber-500 bg-amber-50",
  low: "border-l-blue-500 bg-blue-50",
};

const CONFIDENCE_COLORS: Record<string, string> = {
  high: "bg-green-500",
  medium: "bg-amber-500",
  low: "bg-red-500",
};

function getConfidenceLabel(c: number): string {
  if (c >= 0.7) return "high";
  if (c >= 0.4) return "medium";
  return "low";
}

export function AIAssistantPanel({
  transcript,
  isRecording,
  visitType,
  patientName,
}: AIAssistantPanelProps) {
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"diagnoses" | "questions" | "findings" | "interactions">("diagnoses");
  const [usedQuestions, setUsedQuestions] = useState<Set<number>>(new Set());
  const [autoAnalyze, setAutoAnalyze] = useState(true);
  const lastAnalyzedRef = useRef<number>(0);
  const analysisTimerRef = useRef<NodeJS.Timeout | null>(null);

  const runAnalysis = useCallback(async () => {
    if (transcript.length === 0) return;

    const transcriptText = transcript
      .filter((item) => item.isFinal)
      .map((item) => {
        const speaker = item.speaker === 0 ? "Doctor" : "Patient";
        return `[${speaker}]: ${item.text}`;
      })
      .join("\n");

    if (!transcriptText.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/ai/analyze-consultation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcript: transcriptText,
          visitType,
          patientName,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Analysis failed");
      }

      const data = await res.json();
      setAnalysis(data);
      lastAnalyzedRef.current = transcript.length;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setLoading(false);
    }
  }, [transcript, visitType, patientName]);

  // Auto-analyze: trigger when transcript changes significantly (5+ new segments)
  useEffect(() => {
    if (!autoAnalyze || loading) return;
    if (transcript.length === 0) return;

    const newSegmentsSinceLastAnalysis = transcript.length - lastAnalyzedRef.current;
    // First analysis: trigger as soon as we have 2+ segments
    // Subsequent: every 3 new segments for responsive feedback
    const threshold = lastAnalyzedRef.current === 0 ? 2 : 3;

    if (newSegmentsSinceLastAnalysis >= threshold) {
      // Debounce
      if (analysisTimerRef.current) clearTimeout(analysisTimerRef.current);
      analysisTimerRef.current = setTimeout(() => {
        runAnalysis();
      }, 1500);
    }

    return () => {
      if (analysisTimerRef.current) clearTimeout(analysisTimerRef.current);
    };
  }, [transcript.length, autoAnalyze, loading, runAnalysis]);

  const markQuestionUsed = (idx: number) => {
    setUsedQuestions((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const hasTranscript = transcript.filter((t) => t.isFinal).length > 0;

  return (
    <Card className="border-indigo-200 bg-gradient-to-b from-white to-indigo-50/30">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100">
              <svg className="h-4 w-4 text-indigo-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456Z" />
              </svg>
            </div>
            <div>
              <CardTitle className="text-base">AI Clinical Assistant</CardTitle>
              <p className="text-xs text-medical-muted">Live diagnostic predictions & suggestions</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1.5 text-xs text-medical-muted cursor-pointer">
              <input
                type="checkbox"
                checked={autoAnalyze}
                onChange={(e) => setAutoAnalyze(e.target.checked)}
                className="h-3 w-3 rounded border-gray-300 text-indigo-600"
              />
              Auto
            </label>
            <Button
              size="sm"
              variant="outline"
              onClick={runAnalysis}
              disabled={loading || !hasTranscript}
              className="text-xs h-7 px-2"
            >
              {loading ? (
                <>
                  <svg className="mr-1 h-3 w-3 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Analyzing...
                </>
              ) : "Analyze"}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {!hasTranscript && !analysis ? (
          <div className="rounded-lg bg-gray-50 p-4 text-center">
            <p className="text-sm text-medical-muted">
              {isRecording
                ? "AI analysis will begin once the transcript is available..."
                : "No transcript data available for analysis."}
            </p>
          </div>
        ) : error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
            <button onClick={runAnalysis} className="ml-2 underline">Retry</button>
          </div>
        ) : analysis ? (
          <div className="space-y-3">
            {/* Red Flags Banner */}
            {analysis.redFlags && analysis.redFlags.length > 0 && (
              <div className="rounded-lg border border-red-300 bg-red-50 p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <svg className="h-4 w-4 text-red-600 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                  </svg>
                  <span className="text-sm font-semibold text-red-800">Red Flags</span>
                </div>
                {analysis.redFlags.map((rf, i) => (
                  <div key={i} className="text-sm">
                    <p className="font-medium text-red-800">{rf.flag}</p>
                    <p className="text-red-600 text-xs">{rf.action}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Drug Interactions Alert — show above tabs if major interactions exist */}
            {analysis.drugInteractions && analysis.drugInteractions.some((d) => d.severity === "major") && (
              <div className="rounded-lg border border-orange-300 bg-orange-50 p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <svg className="h-4 w-4 text-orange-600 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m0-10.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.75c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.57-.598-3.75h-.152c-3.196 0-6.1-1.25-8.25-3.286ZM12 15.75h.007v.008H12v-.008Z" />
                  </svg>
                  <span className="text-sm font-semibold text-orange-800">Major Drug Interaction(s) Detected</span>
                </div>
                {analysis.drugInteractions.filter((d) => d.severity === "major").map((d, i) => (
                  <div key={i} className="text-sm">
                    <p className="font-medium text-orange-800">{d.drug1} + {d.drug2}</p>
                    <p className="text-orange-700 text-xs">{d.recommendation}</p>
                  </div>
                ))}
                <button
                  onClick={() => setActiveTab("interactions")}
                  className="text-xs font-medium text-orange-700 underline"
                >
                  View all interactions &rarr;
                </button>
              </div>
            )}

            {/* Tab Navigation */}
            <div className="flex gap-1 border-b border-medical-border overflow-x-auto">
              {[
                { key: "diagnoses" as const, label: "Diagnoses", count: analysis.diagnoses?.length || 0 },
                { key: "questions" as const, label: "Questions", count: analysis.followUpQuestions?.length || 0 },
                { key: "findings" as const, label: "Findings", count: analysis.keyFindings?.length || 0 },
                { key: "interactions" as const, label: "Meds & Interactions", count: (analysis.medications?.length || 0) + (analysis.drugInteractions?.length || 0), alert: analysis.drugInteractions?.some((d) => d.severity === "major") },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`px-3 py-2 text-xs font-medium transition whitespace-nowrap ${
                    activeTab === tab.key
                      ? "border-b-2 border-indigo-500 text-indigo-600"
                      : "text-medical-muted hover:text-medical-text"
                  }`}
                >
                  {tab.label}
                  {tab.count > 0 && (
                    <span className={`ml-1 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full text-[10px] font-bold ${
                      "alert" in tab && tab.alert
                        ? "bg-orange-200 text-orange-700"
                        : "bg-indigo-100 text-indigo-600"
                    }`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Diagnoses Tab */}
            {activeTab === "diagnoses" && (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {analysis.diagnoses?.map((dx, i) => {
                  const confLabel = getConfidenceLabel(dx.confidence);
                  return (
                    <div key={i} className="rounded-lg border border-medical-border bg-white p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-medical-text">{dx.name}</span>
                            {dx.icd10 && (
                              <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-mono text-gray-600">{dx.icd10}</span>
                            )}
                          </div>
                          <p className="mt-1 text-xs text-medical-muted">{dx.reasoning}</p>
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <span className="text-xs font-semibold text-medical-text">{Math.round(dx.confidence * 100)}%</span>
                          <div className="h-1.5 w-12 rounded-full bg-gray-200 overflow-hidden">
                            <div className={`h-full rounded-full ${CONFIDENCE_COLORS[confLabel]}`} style={{ width: `${dx.confidence * 100}%` }} />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {analysis.differentialNotes && (
                  <div className="rounded-lg bg-indigo-50 p-3 text-xs text-indigo-800 italic">
                    {analysis.differentialNotes}
                  </div>
                )}
              </div>
            )}

            {/* Follow-up Questions Tab */}
            {activeTab === "questions" && (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {analysis.followUpQuestions?.map((q, i) => (
                  <div
                    key={i}
                    className={`rounded-lg border-l-4 p-3 transition cursor-pointer ${
                      usedQuestions.has(i)
                        ? "border-l-green-500 bg-green-50 opacity-60"
                        : PRIORITY_STYLES[q.priority] || PRIORITY_STYLES.low
                    }`}
                    onClick={() => markQuestionUsed(i)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <p className={`text-sm font-medium ${usedQuestions.has(i) ? "line-through text-green-700" : "text-medical-text"}`}>
                          &ldquo;{q.question}&rdquo;
                        </p>
                        <p className="mt-1 text-xs text-medical-muted">{q.reasoning}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${
                          q.priority === "high" ? "bg-red-100 text-red-700" :
                          q.priority === "medium" ? "bg-amber-100 text-amber-700" :
                          "bg-blue-100 text-blue-700"
                        }`}>
                          {q.priority}
                        </span>
                        <span className="text-[10px] text-medical-muted">{CATEGORY_LABELS[q.category] || q.category}</span>
                      </div>
                    </div>
                    {usedQuestions.has(i) && (
                      <div className="mt-1 flex items-center gap-1 text-[10px] text-green-600">
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                        </svg>
                        Asked — click to unmark
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Key Findings Tab */}
            {activeTab === "findings" && (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {analysis.keyFindings?.map((f, i) => (
                  <div key={i} className="flex items-start gap-3 rounded-lg border border-medical-border bg-white p-3">
                    <div className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${
                      f.significance === "high" ? "bg-red-500" :
                      f.significance === "medium" ? "bg-amber-500" :
                      "bg-blue-500"
                    }`} />
                    <div className="flex-1">
                      <p className="text-sm text-medical-text">{f.finding}</p>
                      <p className="text-[10px] text-medical-muted uppercase mt-0.5">{f.source}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Medications & Drug Interactions Tab */}
            {activeTab === "interactions" && (
              <div className="space-y-4 max-h-80 overflow-y-auto">
                {/* Medications List */}
                {analysis.medications && analysis.medications.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-medical-muted uppercase tracking-wide mb-2">
                      Medications Detected ({analysis.medications.length})
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {analysis.medications.map((med, i) => (
                        <div
                          key={i}
                          className={`rounded-lg border px-3 py-2 text-sm ${
                            med.source === "current"
                              ? "border-blue-200 bg-blue-50"
                              : med.source === "prescribed"
                                ? "border-green-200 bg-green-50"
                                : "border-gray-200 bg-gray-50"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className={`h-2 w-2 rounded-full ${
                              med.source === "current" ? "bg-blue-500" :
                              med.source === "prescribed" ? "bg-green-500" : "bg-gray-400"
                            }`} />
                            <span className="font-medium text-medical-text">{med.name}</span>
                          </div>
                          {med.dosage && (
                            <p className="mt-0.5 text-[10px] text-medical-muted ml-4">{med.dosage}</p>
                          )}
                          {med.brandNames && med.brandNames.length > 0 && (
                            <p className="mt-0.5 text-[10px] text-medical-muted ml-4">
                              ({med.brandNames.join(", ")})
                            </p>
                          )}
                          {med.purpose && (
                            <p className="mt-0.5 text-[10px] text-medical-muted ml-4 italic">{med.purpose}</p>
                          )}
                          <span className={`mt-1 ml-4 inline-block rounded px-1 py-0.5 text-[9px] font-semibold uppercase ${
                            med.source === "current" ? "bg-blue-100 text-blue-700" :
                            med.source === "prescribed" ? "bg-green-100 text-green-700" :
                            "bg-gray-100 text-gray-600"
                          }`}>
                            {med.source}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Drug Interactions */}
                {analysis.drugInteractions && analysis.drugInteractions.length > 0 ? (
                  <div>
                    <p className="text-xs font-semibold text-medical-muted uppercase tracking-wide mb-2">
                      Drug Interactions ({analysis.drugInteractions.length})
                    </p>
                    <div className="space-y-2">
                      {analysis.drugInteractions
                        .sort((a, b) => {
                          const order = { major: 0, moderate: 1, minor: 2 };
                          return order[a.severity] - order[b.severity];
                        })
                        .map((interaction, i) => (
                          <div
                            key={i}
                            className={`rounded-lg border-l-4 p-3 ${
                              interaction.severity === "major"
                                ? "border-l-red-500 bg-red-50 border border-red-200"
                                : interaction.severity === "moderate"
                                  ? "border-l-orange-500 bg-orange-50 border border-orange-200"
                                  : "border-l-yellow-500 bg-yellow-50 border border-yellow-200"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-sm font-semibold text-medical-text">
                                    {interaction.drug1}
                                  </span>
                                  <svg className="h-3 w-3 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
                                  </svg>
                                  <span className="text-sm font-semibold text-medical-text">
                                    {interaction.drug2}
                                  </span>
                                </div>
                                <p className="mt-1.5 text-xs text-medical-text leading-relaxed">
                                  {interaction.description}
                                </p>
                                {interaction.mechanism && (
                                  <p className="mt-1 text-[10px] text-medical-muted italic">
                                    Mechanism: {interaction.mechanism}
                                  </p>
                                )}
                              </div>
                              <span className={`shrink-0 rounded px-2 py-1 text-[10px] font-bold uppercase ${
                                interaction.severity === "major"
                                  ? "bg-red-200 text-red-800"
                                  : interaction.severity === "moderate"
                                    ? "bg-orange-200 text-orange-800"
                                    : "bg-yellow-200 text-yellow-800"
                              }`}>
                                {interaction.severity}
                              </span>
                            </div>
                            <div className={`mt-2 flex items-start gap-1.5 rounded p-2 text-xs ${
                              interaction.severity === "major"
                                ? "bg-red-100 text-red-800"
                                : interaction.severity === "moderate"
                                  ? "bg-orange-100 text-orange-800"
                                  : "bg-yellow-100 text-yellow-800"
                            }`}>
                              <svg className="h-3.5 w-3.5 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
                              </svg>
                              <span className="font-medium">{interaction.recommendation}</span>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                ) : (
                  <div className="rounded-lg bg-green-50 border border-green-200 p-3 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <svg className="h-4 w-4 text-green-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                      </svg>
                      <span className="text-sm font-medium text-green-700">
                        {analysis.medications && analysis.medications.length > 0
                          ? "No drug interactions detected"
                          : "No medications mentioned in the conversation"}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Last analyzed timestamp */}
            {/* AI Transparency disclaimer */}
            <div className="rounded-md bg-indigo-50 border border-indigo-100 px-3 py-2 text-[11px] text-indigo-700 leading-relaxed">
              ⚡ Powered by MedScribe — always verify with clinical judgment. MedScribe suggestions are not a substitute for professional medical decisions.
            </div>

            <p className="text-[10px] text-medical-muted text-right">
              Last analyzed: {new Date(analysis.analyzedAt).toLocaleTimeString()}
              {" · "}MedScribe
            </p>
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center gap-2 py-6">
            <svg className="h-5 w-5 animate-spin text-indigo-500" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <span className="text-sm text-indigo-600">Analyzing consultation...</span>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
