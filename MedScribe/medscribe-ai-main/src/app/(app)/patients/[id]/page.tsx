"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { formatDateTime } from "@/lib/utils";
import Link from "next/link";
import type { Patient, Transcript, ClinicalNote } from "@/types";

interface ConsultationRow {
  id: string;
  visit_type: string;
  status: string;
  created_at: string;
  recording_duration_seconds: number | null;
  metadata: Record<string, unknown>;
}

export default function PatientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const supabase = createClient();
  const { toast } = useToast();

  const [patient, setPatient] = useState<Patient | null>(null);
  const [consultations, setConsultations] = useState<ConsultationRow[]>([]);
  const [transcripts, setTranscripts] = useState<Record<string, Transcript>>({});
  const [notes, setNotes] = useState<Record<string, ClinicalNote[]>>({});
  const [loading, setLoading] = useState(true);
  const [expandedConsultation, setExpandedConsultation] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "consultations" | "notes" | "risk">("overview");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch patient
      const { data: p, error: pErr } = await supabase
        .from("patients")
        .select("*")
        .eq("id", id)
        .single();
      if (pErr || !p) { toast("Patient not found", "error"); return; }
      setPatient(p as Patient);

      // Fetch consultations
      const { data: cons } = await supabase
        .from("consultations")
        .select("id, visit_type, status, created_at, recording_duration_seconds, metadata")
        .eq("patient_id", id)
        .order("created_at", { ascending: false });
      const consultationList = (cons || []) as ConsultationRow[];
      setConsultations(consultationList);

      if (consultationList.length > 0) {
        const cIds = consultationList.map((c) => c.id);

        // Fetch transcripts
        const { data: txs } = await supabase
          .from("transcripts")
          .select("*")
          .in("consultation_id", cIds);
        const txMap: Record<string, Transcript> = {};
        for (const t of (txs || []) as Transcript[]) {
          txMap[t.consultation_id] = t;
        }
        setTranscripts(txMap);

        // Fetch clinical notes
        const { data: nts } = await supabase
          .from("clinical_notes")
          .select("*")
          .in("consultation_id", cIds)
          .order("created_at", { ascending: false });
        const noteMap: Record<string, ClinicalNote[]> = {};
        for (const n of (nts || []) as ClinicalNote[]) {
          if (!noteMap[n.consultation_id]) noteMap[n.consultation_id] = [];
          noteMap[n.consultation_id].push(n);
        }
        setNotes(noteMap);
      }
    } catch {
      toast("Failed to load patient data", "error");
    } finally {
      setLoading(false);
    }
  }, [id, supabase, toast]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-64 bg-gray-200 rounded" />
          <div className="h-48 bg-gray-100 rounded-lg" />
        </div>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 p-12">
        <p className="text-medical-muted">Patient not found</p>
        <Button variant="outline" onClick={() => router.push("/patients")}>Back to Patients</Button>
      </div>
    );
  }

  const meta0 = consultations[0]?.metadata || {};
  const riskLevel = (meta0.risk_level as string) || null;
  const riskSignals = (meta0.risk_signals as { label: string; severity: string }[]) || [];
  const primaryDiagnosis = (meta0.primary_diagnosis as string) || (meta0.diagnosis as string) || null;

  const allNotes = Object.values(notes).flat();
  const draftCount = allNotes.filter((n) => n.status === "draft").length;
  const finalizedNoteCount = allNotes.filter((n) => n.status === "finalized").length;

  // Collect medications from all consultation metadata
  const medications: { name: string; dosage: string; status: string }[] = [];
  const seenMeds = new Set<string>();
  for (const c of consultations) {
    const rxList = (c.metadata?.pending_prescriptions || c.metadata?.medications) as { medication?: string; name?: string; dosage?: string; status?: string }[] | undefined;
    if (rxList) {
      for (const rx of rxList) {
        const name = rx.medication || rx.name || "Unknown";
        if (seenMeds.has(name)) continue;
        seenMeds.add(name);
        medications.push({ name, dosage: rx.dosage || "—", status: rx.status || "active" });
      }
    }
  }

  function formatDuration(seconds: number | null) {
    if (!seconds) return "—";
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s}s`;
  }

  const tabs = [
    { key: "overview" as const, label: "Overview" },
    { key: "consultations" as const, label: `Consultations (${consultations.length})` },
    { key: "notes" as const, label: `Clinical Notes (${allNotes.length})` },
    { key: "risk" as const, label: "Risk Assessment" },
  ];

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Back + Header */}
      <div>
        <Button variant="ghost" size="sm" onClick={() => router.back()} className="mb-3 text-medical-muted hover:text-medical-text">
          <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" /></svg>
          Back
        </Button>

        <Card>
          <CardContent className="py-5 px-6">
            <div className="flex items-start gap-4">
              <div className="h-14 w-14 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-lg shrink-0">
                {patient.full_name.split(" ").map((n) => n[0]).join("").substring(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="text-xl font-semibold text-medical-text">{patient.full_name}</h1>
                  {riskLevel && (
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      riskLevel === "high" ? "bg-red-100 text-red-700" : riskLevel === "medium" ? "bg-orange-100 text-orange-700" : "bg-green-100 text-green-700"
                    }`}>
                      {riskLevel.charAt(0).toUpperCase() + riskLevel.slice(1)} Risk
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-x-6 gap-y-1 mt-2 text-sm text-medical-muted">
                  {patient.mrn && <span>MRN: <span className="font-mono text-medical-text">{patient.mrn}</span></span>}
                  {patient.date_of_birth && <span>DOB: {new Date(patient.date_of_birth).toLocaleDateString()}</span>}
                  {patient.gender && <span className="capitalize">{patient.gender}</span>}
                  {patient.contact_info?.phone && <span>📞 {patient.contact_info.phone}</span>}
                  {patient.contact_info?.email && <span>✉️ {patient.contact_info.email}</span>}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-medical-border">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition ${
              activeTab === tab.key
                ? "border-brand-500 text-brand-600"
                : "border-transparent text-medical-muted hover:text-medical-text"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Demographics */}
          <Card>
            <CardHeader><CardTitle className="text-sm">Demographics</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><p className="text-medical-muted">Full Name</p><p className="font-medium text-medical-text">{patient.full_name}</p></div>
                <div><p className="text-medical-muted">MRN</p><p className="font-medium text-medical-text font-mono">{patient.mrn || "—"}</p></div>
                <div><p className="text-medical-muted">Date of Birth</p><p className="font-medium text-medical-text">{patient.date_of_birth ? new Date(patient.date_of_birth).toLocaleDateString() : "—"}</p></div>
                <div><p className="text-medical-muted">Gender</p><p className="font-medium text-medical-text capitalize">{patient.gender || "—"}</p></div>
                <div><p className="text-medical-muted">Phone</p><p className="font-medium text-medical-text">{patient.contact_info?.phone || "—"}</p></div>
                <div><p className="text-medical-muted">Email</p><p className="font-medium text-medical-text">{patient.contact_info?.email || "—"}</p></div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card>
            <CardHeader><CardTitle className="text-sm">Clinical Summary</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><p className="text-medical-muted">Total Consultations</p><p className="font-medium text-medical-text text-lg">{consultations.length}</p></div>
                <div><p className="text-medical-muted">Clinical Notes</p><p className="font-medium text-medical-text text-lg">{allNotes.length}</p></div>
                <div><p className="text-medical-muted">Draft Notes</p><p className="font-medium text-amber-600 text-lg">{draftCount}</p></div>
                <div><p className="text-medical-muted">Finalized Notes</p><p className="font-medium text-green-600 text-lg">{finalizedNoteCount}</p></div>
                {primaryDiagnosis && (
                  <div className="col-span-2"><p className="text-medical-muted">Primary Diagnosis</p><p className="font-medium text-medical-text">{primaryDiagnosis}</p></div>
                )}
                {riskLevel && (
                  <div className="col-span-2"><p className="text-medical-muted">Risk Level</p>
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium mt-1 ${
                      riskLevel === "high" ? "bg-red-100 text-red-700" : riskLevel === "medium" ? "bg-orange-100 text-orange-700" : "bg-green-100 text-green-700"
                    }`}>{riskLevel.charAt(0).toUpperCase() + riskLevel.slice(1)}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Medications */}
          {medications.length > 0 && (
            <Card className="lg:col-span-2">
              <CardHeader><CardTitle className="text-sm">Medications / Prescriptions</CardTitle></CardHeader>
              <CardContent>
                <div className="divide-y divide-medical-border">
                  {medications.map((med, i) => (
                    <div key={i} className="flex items-center justify-between py-2 text-sm">
                      <div>
                        <p className="font-medium text-medical-text">{med.name}</p>
                        <p className="text-xs text-medical-muted">{med.dosage}</p>
                      </div>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        med.status === "overdue" ? "bg-red-100 text-red-700" :
                        med.status === "urgent" ? "bg-orange-100 text-orange-700" :
                        "bg-green-100 text-green-700"
                      }`}>{med.status}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Consultations Tab */}
      {activeTab === "consultations" && (
        <div className="space-y-3">
          {consultations.length === 0 ? (
            <Card><CardContent className="py-8 text-center text-medical-muted text-sm">No consultations recorded for this patient.</CardContent></Card>
          ) : consultations.map((c) => (
            <Card key={c.id}>
              <div
                className="flex items-center justify-between px-5 py-3 cursor-pointer hover:bg-gray-50 transition"
                onClick={() => setExpandedConsultation(expandedConsultation === c.id ? null : c.id)}
              >
                <div className="flex items-center gap-3">
                  <div>
                    <p className="text-sm font-medium text-medical-text">{c.visit_type}</p>
                    <p className="text-xs text-medical-muted">{formatDateTime(c.created_at)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-medical-muted">{formatDuration(c.recording_duration_seconds)}</span>
                  <StatusBadge status={c.status} />
                  <svg className={`h-4 w-4 text-medical-muted transition ${expandedConsultation === c.id ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" /></svg>
                </div>
              </div>

              {expandedConsultation === c.id && (
                <CardContent className="border-t border-medical-border pt-4 space-y-4">
                  {/* Transcript */}
                  {transcripts[c.id] ? (
                    <div>
                      <h4 className="text-xs font-semibold text-medical-muted uppercase tracking-wider mb-2">Transcript</h4>
                      {transcripts[c.id].segments && transcripts[c.id].segments.length > 0 ? (
                        <div className="max-h-64 overflow-y-auto space-y-2 bg-gray-50 rounded-lg p-3">
                          {transcripts[c.id].segments.map((seg, i) => (
                            <div key={i} className="text-xs">
                              <span className={`font-semibold ${seg.speaker === "doctor" ? "text-blue-600" : "text-green-600"}`}>
                                {seg.speaker === "doctor" ? "Doctor" : "Patient"}:
                              </span>{" "}
                              <span className="text-medical-text">{seg.text}</span>
                            </div>
                          ))}
                        </div>
                      ) : transcripts[c.id].full_text ? (
                        <div className="max-h-64 overflow-y-auto bg-gray-50 rounded-lg p-3 text-xs text-medical-text whitespace-pre-wrap">
                          {transcripts[c.id].full_text}
                        </div>
                      ) : (
                        <p className="text-xs text-medical-muted">Transcript available but empty.</p>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-medical-muted italic">No transcript available for this consultation.</p>
                  )}

                  {/* Notes for this consultation */}
                  {notes[c.id] && notes[c.id].length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold text-medical-muted uppercase tracking-wider mb-2">Clinical Notes</h4>
                      <div className="space-y-3">
                        {notes[c.id].map((note) => (
                          <div key={note.id} className="rounded-lg border border-medical-border bg-white p-3">
                            <div className="flex items-center justify-between mb-2">
                              <StatusBadge status={note.status} />
                              <span className="text-[10px] text-medical-muted">{formatDateTime(note.created_at)}</span>
                            </div>
                            <div className="space-y-1.5">
                              {(note.sections || []).map((s, i) => (
                                <div key={i} className="text-xs">
                                  <span className="font-semibold text-medical-text">{s.title}:</span>{" "}
                                  <span className="text-medical-muted">{s.content}</span>
                                </div>
                              ))}
                            </div>
                            {note.billing_codes && note.billing_codes.length > 0 && (
                              <div className="mt-2 flex flex-wrap gap-1">
                                {note.billing_codes.map((bc, i) => (
                                  <span key={i} className="inline-block rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] font-medium text-indigo-700">
                                    {bc.system}: {bc.code}
                                  </span>
                                ))}
                              </div>
                            )}
                            <Link href={`/consultation/${c.id}/note`} className="text-xs text-brand-600 hover:underline mt-2 inline-block">
                              View Full Note →
                            </Link>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Clinical Notes Tab */}
      {activeTab === "notes" && (
        <div className="space-y-3">
          {allNotes.length === 0 ? (
            <Card><CardContent className="py-8 text-center text-medical-muted text-sm">No clinical notes available.</CardContent></Card>
          ) : allNotes.map((note) => {
            const consultation = consultations.find((c) => c.id === note.consultation_id);
            return (
              <Card key={note.id}>
                <CardContent className="py-4 px-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <StatusBadge status={note.status} />
                      {consultation && <span className="text-xs text-medical-muted">{consultation.visit_type}</span>}
                    </div>
                    <span className="text-xs text-medical-muted">{formatDateTime(note.created_at)}</span>
                  </div>
                  <div className="space-y-2">
                    {(note.sections || []).map((s, i) => (
                      <div key={i} className="text-sm">
                        <p className="font-semibold text-medical-text">{s.title}</p>
                        <p className="text-medical-muted mt-0.5 whitespace-pre-wrap">{s.content}</p>
                      </div>
                    ))}
                  </div>
                  {note.billing_codes && note.billing_codes.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1">
                      {note.billing_codes.map((bc, i) => (
                        <span key={i} className="inline-block rounded bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700">
                          {bc.system}: {bc.code} — {bc.description}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="mt-3">
                    <Link href={`/consultation/${note.consultation_id}/note`} className="text-xs text-brand-600 hover:underline">
                      View Full Note →
                    </Link>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Risk Assessment Tab */}
      {activeTab === "risk" && (
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-sm">Risk Assessment</CardTitle></CardHeader>
            <CardContent>
              {riskLevel ? (
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-medical-muted mb-1">Current Risk Level</p>
                    <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold ${
                      riskLevel === "high" ? "bg-red-100 text-red-700" :
                      riskLevel === "medium" ? "bg-orange-100 text-orange-700" :
                      "bg-green-100 text-green-700"
                    }`}>
                      {riskLevel.charAt(0).toUpperCase() + riskLevel.slice(1)} Risk
                    </span>
                  </div>

                  {riskSignals.length > 0 && (
                    <div>
                      <p className="text-sm text-medical-muted mb-2">Risk Signals</p>
                      <div className="space-y-2">
                        {riskSignals.map((signal, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <span className={`h-2 w-2 rounded-full ${
                              signal.severity === "critical" ? "bg-red-500" :
                              signal.severity === "high" ? "bg-orange-500" :
                              signal.severity === "medium" ? "bg-yellow-500" : "bg-green-500"
                            }`} />
                            <span className="text-sm text-medical-text">{signal.label}</span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                              signal.severity === "critical" ? "bg-red-100 text-red-700" :
                              signal.severity === "high" ? "bg-orange-100 text-orange-700" :
                              signal.severity === "medium" ? "bg-yellow-100 text-yellow-700" : "bg-green-100 text-green-700"
                            }`}>{signal.severity}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-6">
                  <div className="flex justify-center mb-2">
                    <svg className="h-8 w-8 text-green-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>
                  </div>
                  <p className="text-sm text-green-600 font-medium">No elevated risk identified</p>
                  <p className="text-xs text-medical-muted mt-0.5">Risk assessment based on consultation metadata</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
