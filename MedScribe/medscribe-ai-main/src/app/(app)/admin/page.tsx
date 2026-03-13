"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { formatDuration, cn } from "@/lib/utils";

type AdminTab = "overview" | "consultations" | "transcripts" | "notes" | "prescriptions" | "audit" | "storage";

interface ConsultationRow {
  id: string;
  patient_id: string | null;
  visit_type: string;
  status: string;
  consent_given: boolean;
  recording_duration_seconds: number | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

interface TranscriptRow {
  id: string;
  consultation_id: string;
  full_text: string;
  language: string;
  provider: string;
  segments: Array<{ speaker: string; text: string; timestamp?: number }>;
  created_at: string;
}

interface NoteRow {
  id: string;
  consultation_id: string;
  status: string;
  ai_model: string | null;
  sections: Array<{ title: string; content: string }>;
  billing_codes: Array<{ code: string; system: string; description: string; accepted: boolean }>;
  created_at: string;
  updated_at: string;
  finalized_at: string | null;
}

interface AuditRow {
  id: string;
  user_id: string;
  action: string;
  resource_type: string;
  resource_id: string | null;
  metadata: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
}

interface PrescriptionRow {
  id: string;
  consultation_id: string;
  medications: Array<{ name: string; dosage: string; frequency: string; duration: string }>;
  notes: string;
  created_at: string;
}

interface OverviewStats {
  totalConsultations: number;
  totalTranscripts: number;
  totalNotes: number;
  totalPrescriptions: number;
  totalPatients: number;
  totalAuditEntries: number;
  statusBreakdown: Record<string, number>;
  noteStatusBreakdown: Record<string, number>;
}

export default function AdminPanel() {
  const [tab, setTab] = useState<AdminTab>("overview");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [consultations, setConsultations] = useState<ConsultationRow[]>([]);
  const [transcripts, setTranscripts] = useState<TranscriptRow[]>([]);
  const [notes, setNotes] = useState<NoteRow[]>([]);
  const [prescriptions, setPrescriptions] = useState<PrescriptionRow[]>([]);
  const [auditLog, setAuditLog] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 25;

  const router = useRouter();
  const supabase = createClient();

  const loadOverview = useCallback(async () => {
    setLoading(true);
    const [
      { count: totalConsultations },
      { count: totalTranscripts },
      { count: totalNotes },
      { count: totalPrescriptions },
      { count: totalPatients },
      { count: totalAuditEntries },
      { data: consultationData },
      { data: noteData },
    ] = await Promise.all([
      supabase.from("consultations").select("*", { count: "exact", head: true }),
      supabase.from("transcripts").select("*", { count: "exact", head: true }),
      supabase.from("clinical_notes").select("*", { count: "exact", head: true }),
      supabase.from("consultation_documents").select("*", { count: "exact", head: true }).eq("document_type", "prescription"),
      supabase.from("patients").select("*", { count: "exact", head: true }),
      supabase.from("audit_log").select("*", { count: "exact", head: true }),
      supabase.from("consultations").select("status"),
      supabase.from("clinical_notes").select("status"),
    ]);

    const statusBreakdown: Record<string, number> = {};
    (consultationData || []).forEach((c: { status: string }) => {
      statusBreakdown[c.status] = (statusBreakdown[c.status] || 0) + 1;
    });

    const noteStatusBreakdown: Record<string, number> = {};
    (noteData || []).forEach((n: { status: string }) => {
      noteStatusBreakdown[n.status] = (noteStatusBreakdown[n.status] || 0) + 1;
    });

    setStats({
      totalConsultations: totalConsultations || 0,
      totalTranscripts: totalTranscripts || 0,
      totalNotes: totalNotes || 0,
      totalPrescriptions: totalPrescriptions || 0,
      totalPatients: totalPatients || 0,
      totalAuditEntries: totalAuditEntries || 0,
      statusBreakdown,
      noteStatusBreakdown,
    });
    setLoading(false);
  }, [supabase]);

  const loadConsultations = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from("consultations")
      .select("*")
      .order("created_at", { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (statusFilter !== "all") query = query.eq("status", statusFilter);
    if (dateFrom) query = query.gte("created_at", dateFrom);
    if (dateTo) query = query.lte("created_at", dateTo + "T23:59:59");

    const { data } = await query;
    setConsultations((data || []) as ConsultationRow[]);
    setLoading(false);
  }, [supabase, page, statusFilter, dateFrom, dateTo]);

  const loadTranscripts = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("transcripts")
      .select("*")
      .order("created_at", { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
    setTranscripts((data || []) as TranscriptRow[]);
    setLoading(false);
  }, [supabase, page]);

  const loadNotes = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from("clinical_notes")
      .select("*")
      .order("created_at", { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (statusFilter !== "all") query = query.eq("status", statusFilter);

    const { data } = await query;
    setNotes((data || []) as NoteRow[]);
    setLoading(false);
  }, [supabase, page, statusFilter]);

  const loadPrescriptions = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("consultation_documents")
      .select("*")
      .eq("document_type", "prescription")
      .order("created_at", { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
    setPrescriptions((data || []) as unknown as PrescriptionRow[]);
    setLoading(false);
  }, [supabase, page]);

  const loadAuditLog = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("audit_log")
      .select("*")
      .order("created_at", { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
    setAuditLog((data || []) as AuditRow[]);
    setLoading(false);
  }, [supabase, page]);

  useEffect(() => {
    setPage(0);
    setExpandedRow(null);
  }, [tab, statusFilter, dateFrom, dateTo]);

  useEffect(() => {
    switch (tab) {
      case "overview": loadOverview(); break;
      case "consultations": loadConsultations(); break;
      case "transcripts": loadTranscripts(); break;
      case "notes": loadNotes(); break;
      case "prescriptions": loadPrescriptions(); break;
      case "audit": loadAuditLog(); break;
      case "storage": loadOverview(); break;
    }
  }, [tab, page, loadOverview, loadConsultations, loadTranscripts, loadNotes, loadPrescriptions, loadAuditLog]);

  const fmt = (iso: string) => {
    if (!iso) return "—";
    const d = new Date(iso);
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) +
      " " + d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  };

  const handleExportJSON = async (table: string) => {
    const { data } = await supabase.from(table).select("*").order("created_at", { ascending: false });
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `medscribe-${table}-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const tabs: { id: AdminTab; label: string; icon: string }[] = [
    { id: "overview", label: "Overview", icon: "📊" },
    { id: "consultations", label: "Consultations", icon: "🩺" },
    { id: "transcripts", label: "Transcripts", icon: "📝" },
    { id: "notes", label: "Clinical Notes", icon: "📋" },
    { id: "prescriptions", label: "Prescriptions", icon: "💊" },
    { id: "audit", label: "Audit Log", icon: "🔍" },
    { id: "storage", label: "Data & Storage", icon: "💾" },
  ];

  const STATUSES = ["all", "scheduled", "recording", "transcribed", "note_generated", "completed", "finalized"];
  const NOTE_STATUSES = ["all", "draft", "reviewed", "finalized"];

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-medical-text">Admin Panel</h1>
          <p className="mt-1 text-sm text-medical-muted">
            View all stored data, previous consultations, and system records
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => handleExportJSON("consultations")}>
            Export All Data
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto rounded-xl border border-medical-border bg-gray-50 p-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium whitespace-nowrap transition-all",
              tab === t.id
                ? "bg-white text-brand-700 shadow-sm"
                : "text-medical-muted hover:text-medical-text hover:bg-white/50"
            )}
          >
            <span>{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      {/* OVERVIEW TAB */}
      {tab === "overview" && stats && (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {[
              { label: "Consultations", value: stats.totalConsultations, color: "text-blue-600" },
              { label: "Transcripts", value: stats.totalTranscripts, color: "text-purple-600" },
              { label: "Clinical Notes", value: stats.totalNotes, color: "text-green-600" },
              { label: "Prescriptions", value: stats.totalPrescriptions, color: "text-amber-600" },
              { label: "Patients", value: stats.totalPatients, color: "text-indigo-600" },
              { label: "Audit Events", value: stats.totalAuditEntries, color: "text-red-600" },
            ].map((s) => (
              <Card key={s.label}>
                <CardContent className="pt-6">
                  <p className="text-xs font-semibold uppercase tracking-wide text-medical-muted">{s.label}</p>
                  <p className={cn("mt-2 text-3xl font-bold", s.color)}>{s.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader><CardTitle>Consultation Status Distribution</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(stats.statusBreakdown).sort(([, a], [, b]) => b - a).map(([status, count]) => (
                    <div key={status} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <StatusBadge status={status} />
                        <span className="text-sm text-medical-text capitalize">{status.replace(/_/g, " ")}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="h-2 w-32 rounded-full bg-gray-100">
                          <div
                            className="h-full rounded-full bg-brand-500 transition-all"
                            style={{ width: `${Math.min(100, (count / stats.totalConsultations) * 100)}%` }}
                          />
                        </div>
                        <span className="text-sm font-semibold text-medical-text w-8 text-right">{count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Clinical Note Status</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(stats.noteStatusBreakdown).sort(([, a], [, b]) => b - a).map(([status, count]) => (
                    <div key={status} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <StatusBadge status={status} />
                        <span className="text-sm text-medical-text capitalize">{status}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="h-2 w-32 rounded-full bg-gray-100">
                          <div
                            className="h-full rounded-full bg-green-500 transition-all"
                            style={{ width: `${Math.min(100, (count / stats.totalNotes) * 100)}%` }}
                          />
                        </div>
                        <span className="text-sm font-semibold text-medical-text w-8 text-right">{count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="border-indigo-200 bg-indigo-50/30">
            <CardHeader><CardTitle>Medical Notation & Storage Standards</CardTitle></CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  { standard: "SOAP Notes", status: "Active", desc: "Subjective, Objective, Assessment, Plan — structured note generation" },
                  { standard: "ICD-10 Coding", status: "Active", desc: "AI-suggested diagnostic codes with confidence scoring" },
                  { standard: "CPT Coding", status: "Active", desc: "Procedure codes for billing — accept/reject workflow" },
                  { standard: "HL7 FHIR R4", status: "Ready", desc: "FHIR export endpoint available — Composition, Patient, Encounter" },
                  { standard: "USCDI v5", status: "Partial", desc: "Clinical notes, medications, allergies, problems covered" },
                  { standard: "HIPAA / GDPR", status: "Active", desc: "RLS, auth, audit log, data export/deletion, consent tracking" },
                  { standard: "NHS GP Connect", status: "Planned", desc: "CareConnect FHIR profiles for UK interoperability" },
                  { standard: "SNOMED CT", status: "Planned", desc: "Standardized clinical terminology for diagnoses" },
                ].map((item) => (
                  <div key={item.standard} className="rounded-lg border border-indigo-200 bg-white p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-semibold text-medical-text">{item.standard}</span>
                      <span className={cn(
                        "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase",
                        item.status === "Active" ? "bg-green-100 text-green-700" :
                        item.status === "Ready" ? "bg-blue-100 text-blue-700" :
                        item.status === "Partial" ? "bg-amber-100 text-amber-700" :
                        "bg-gray-100 text-gray-600"
                      )}>
                        {item.status}
                      </span>
                    </div>
                    <p className="text-[11px] text-medical-muted leading-relaxed">{item.desc}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* CONSULTATIONS TAB */}
      {tab === "consultations" && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-3 items-end">
            <div>
              <label className="block text-xs font-medium text-medical-muted mb-1">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-lg border border-medical-border px-3 py-2 text-sm"
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>{s === "all" ? "All statuses" : s.replace(/_/g, " ")}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-medical-muted mb-1">From</label>
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-40" />
            </div>
            <div>
              <label className="block text-xs font-medium text-medical-muted mb-1">To</label>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-40" />
            </div>
            <Button variant="outline" size="sm" onClick={() => handleExportJSON("consultations")}>
              Export JSON
            </Button>
          </div>

          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-medical-border bg-gray-50">
                      <th className="px-4 py-3 text-left font-semibold text-medical-muted">Date</th>
                      <th className="px-4 py-3 text-left font-semibold text-medical-muted">ID</th>
                      <th className="px-4 py-3 text-left font-semibold text-medical-muted">Visit Type</th>
                      <th className="px-4 py-3 text-left font-semibold text-medical-muted">Status</th>
                      <th className="px-4 py-3 text-left font-semibold text-medical-muted">Duration</th>
                      <th className="px-4 py-3 text-left font-semibold text-medical-muted">Consent</th>
                      <th className="px-4 py-3 text-left font-semibold text-medical-muted">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {consultations.map((c) => (
                      <>
                        <tr
                          key={c.id}
                          className="border-b border-medical-border hover:bg-gray-50 cursor-pointer transition-colors"
                          onClick={() => setExpandedRow(expandedRow === c.id ? null : c.id)}
                        >
                          <td className="px-4 py-3 text-medical-text">{fmt(c.created_at)}</td>
                          <td className="px-4 py-3 font-mono text-xs text-medical-muted">{c.id.slice(0, 8)}...</td>
                          <td className="px-4 py-3 text-medical-text capitalize">{(c.visit_type || "—").replace(/_/g, " ")}</td>
                          <td className="px-4 py-3"><StatusBadge status={c.status} /></td>
                          <td className="px-4 py-3 text-medical-text">{c.recording_duration_seconds ? formatDuration(c.recording_duration_seconds) : "—"}</td>
                          <td className="px-4 py-3">
                            <span className={cn("text-xs font-medium", c.consent_given ? "text-green-600" : "text-red-500")}>
                              {c.consent_given ? "Yes" : "No"}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex gap-1">
                              <Button
                                variant="ghost" size="sm"
                                onClick={(e) => { e.stopPropagation(); router.push(`/consultation/${c.id}/record`); }}
                              >
                                View
                              </Button>
                              {["transcribed", "note_generated", "completed", "finalized"].includes(c.status) && (
                                <Button
                                  variant="ghost" size="sm"
                                  onClick={(e) => { e.stopPropagation(); router.push(`/consultation/${c.id}/note`); }}
                                >
                                  Note
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                        {expandedRow === c.id && (
                          <tr key={`${c.id}-expanded`}>
                            <td colSpan={7} className="bg-gray-50 px-8 py-4">
                              <div className="grid gap-4 lg:grid-cols-2">
                                <div>
                                  <p className="text-xs font-semibold uppercase text-medical-muted mb-2">Full Record</p>
                                  <pre className="rounded-lg bg-white border border-medical-border p-3 text-xs text-medical-text overflow-auto max-h-60">
                                    {JSON.stringify(c, null, 2)}
                                  </pre>
                                </div>
                                <div>
                                  <p className="text-xs font-semibold uppercase text-medical-muted mb-2">Metadata</p>
                                  <pre className="rounded-lg bg-white border border-medical-border p-3 text-xs text-medical-text overflow-auto max-h-60">
                                    {JSON.stringify(c.metadata, null, 2)}
                                  </pre>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    ))}
                    {consultations.length === 0 && !loading && (
                      <tr><td colSpan={7} className="px-4 py-8 text-center text-medical-muted">No consultations found</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <div className="flex items-center justify-between">
            <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(page - 1)}>Previous</Button>
            <span className="text-sm text-medical-muted">Page {page + 1}</span>
            <Button variant="outline" size="sm" disabled={consultations.length < PAGE_SIZE} onClick={() => setPage(page + 1)}>Next</Button>
          </div>
        </div>
      )}

      {/* TRANSCRIPTS TAB */}
      {tab === "transcripts" && (
        <div className="space-y-4">
          <div className="flex gap-3">
            <Button variant="outline" size="sm" onClick={() => handleExportJSON("transcripts")}>Export All Transcripts</Button>
          </div>

          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-medical-border bg-gray-50">
                      <th className="px-4 py-3 text-left font-semibold text-medical-muted">Date</th>
                      <th className="px-4 py-3 text-left font-semibold text-medical-muted">Consultation</th>
                      <th className="px-4 py-3 text-left font-semibold text-medical-muted">Language</th>
                      <th className="px-4 py-3 text-left font-semibold text-medical-muted">Provider</th>
                      <th className="px-4 py-3 text-left font-semibold text-medical-muted">Segments</th>
                      <th className="px-4 py-3 text-left font-semibold text-medical-muted">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transcripts.map((t) => (
                      <>
                        <tr
                          key={t.id}
                          className="border-b border-medical-border hover:bg-gray-50 cursor-pointer"
                          onClick={() => setExpandedRow(expandedRow === t.id ? null : t.id)}
                        >
                          <td className="px-4 py-3 text-medical-text">{fmt(t.created_at)}</td>
                          <td className="px-4 py-3 font-mono text-xs text-medical-muted">{t.consultation_id.slice(0, 8)}...</td>
                          <td className="px-4 py-3 text-medical-text uppercase">{t.language}</td>
                          <td className="px-4 py-3 text-medical-text">{t.provider}</td>
                          <td className="px-4 py-3 text-medical-text">{t.segments?.length || 0}</td>
                          <td className="px-4 py-3">
                            <Button
                              variant="ghost" size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                const blob = new Blob([t.full_text || ""], { type: "text/plain" });
                                const url = URL.createObjectURL(blob);
                                const a = document.createElement("a");
                                a.href = url;
                                a.download = `transcript-${t.consultation_id.slice(0, 8)}.txt`;
                                a.click();
                                URL.revokeObjectURL(url);
                              }}
                            >
                              Download
                            </Button>
                          </td>
                        </tr>
                        {expandedRow === t.id && (
                          <tr key={`${t.id}-expanded`}>
                            <td colSpan={6} className="bg-gray-50 px-8 py-4">
                              <p className="text-xs font-semibold uppercase text-medical-muted mb-2">Full Transcript</p>
                              <div className="rounded-lg bg-white border border-medical-border p-4 max-h-80 overflow-y-auto space-y-2">
                                {(t.segments || []).map((seg, idx) => (
                                  <div key={idx} className={cn(
                                    "flex gap-3 text-sm",
                                    seg.speaker === "Doctor" ? "" : "flex-row-reverse"
                                  )}>
                                    <span className={cn(
                                      "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase",
                                      seg.speaker === "Doctor" ? "bg-blue-100 text-blue-700" : "bg-green-100 text-green-700"
                                    )}>
                                      {seg.speaker}
                                    </span>
                                    <p className="text-medical-text">{seg.text}</p>
                                  </div>
                                ))}
                                {(!t.segments || t.segments.length === 0) && (
                                  <p className="text-medical-muted whitespace-pre-wrap">{t.full_text || "No text available"}</p>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    ))}
                    {transcripts.length === 0 && !loading && (
                      <tr><td colSpan={6} className="px-4 py-8 text-center text-medical-muted">No transcripts found</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <div className="flex items-center justify-between">
            <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(page - 1)}>Previous</Button>
            <span className="text-sm text-medical-muted">Page {page + 1}</span>
            <Button variant="outline" size="sm" disabled={transcripts.length < PAGE_SIZE} onClick={() => setPage(page + 1)}>Next</Button>
          </div>
        </div>
      )}

      {/* CLINICAL NOTES TAB */}
      {tab === "notes" && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-3 items-end">
            <div>
              <label className="block text-xs font-medium text-medical-muted mb-1">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-lg border border-medical-border px-3 py-2 text-sm"
              >
                {NOTE_STATUSES.map((s) => (
                  <option key={s} value={s}>{s === "all" ? "All statuses" : s}</option>
                ))}
              </select>
            </div>
            <Button variant="outline" size="sm" onClick={() => handleExportJSON("clinical_notes")}>Export All Notes</Button>
          </div>

          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-medical-border bg-gray-50">
                      <th className="px-4 py-3 text-left font-semibold text-medical-muted">Date</th>
                      <th className="px-4 py-3 text-left font-semibold text-medical-muted">Consultation</th>
                      <th className="px-4 py-3 text-left font-semibold text-medical-muted">Status</th>
                      <th className="px-4 py-3 text-left font-semibold text-medical-muted">Sections</th>
                      <th className="px-4 py-3 text-left font-semibold text-medical-muted">Billing Codes</th>
                      <th className="px-4 py-3 text-left font-semibold text-medical-muted">Finalized</th>
                      <th className="px-4 py-3 text-left font-semibold text-medical-muted">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {notes.map((n) => (
                      <>
                        <tr
                          key={n.id}
                          className="border-b border-medical-border hover:bg-gray-50 cursor-pointer"
                          onClick={() => setExpandedRow(expandedRow === n.id ? null : n.id)}
                        >
                          <td className="px-4 py-3 text-medical-text">{fmt(n.created_at)}</td>
                          <td className="px-4 py-3 font-mono text-xs text-medical-muted">{n.consultation_id.slice(0, 8)}...</td>
                          <td className="px-4 py-3"><StatusBadge status={n.status} /></td>
                          <td className="px-4 py-3 text-medical-text">{n.sections?.length || 0}</td>
                          <td className="px-4 py-3 text-medical-text">
                            {n.billing_codes?.filter((c) => c.accepted).length || 0} / {n.billing_codes?.length || 0}
                          </td>
                          <td className="px-4 py-3 text-medical-text">{n.finalized_at ? fmt(n.finalized_at) : "—"}</td>
                          <td className="px-4 py-3">
                            <Button
                              variant="ghost" size="sm"
                              onClick={(e) => { e.stopPropagation(); router.push(`/consultation/${n.consultation_id}/note`); }}
                            >
                              Open
                            </Button>
                          </td>
                        </tr>
                        {expandedRow === n.id && (
                          <tr key={`${n.id}-expanded`}>
                            <td colSpan={7} className="bg-gray-50 px-8 py-4">
                              <div className="space-y-4">
                                {(n.sections || []).map((sec, idx) => (
                                  <div key={idx}>
                                    <p className="text-xs font-bold uppercase text-brand-700 mb-1">{sec.title}</p>
                                    <p className="text-sm text-medical-text whitespace-pre-wrap bg-white rounded-lg border border-medical-border p-3">
                                      {sec.content}
                                    </p>
                                  </div>
                                ))}
                                {(n.billing_codes || []).length > 0 && (
                                  <div>
                                    <p className="text-xs font-bold uppercase text-medical-muted mb-2">Billing Codes</p>
                                    <div className="flex flex-wrap gap-2">
                                      {n.billing_codes.map((bc, idx) => (
                                        <span
                                          key={idx}
                                          className={cn(
                                            "rounded-full px-2.5 py-1 text-xs font-mono font-semibold",
                                            bc.accepted ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500 line-through"
                                          )}
                                        >
                                          {bc.system}: {bc.code}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    ))}
                    {notes.length === 0 && !loading && (
                      <tr><td colSpan={7} className="px-4 py-8 text-center text-medical-muted">No clinical notes found</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <div className="flex items-center justify-between">
            <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(page - 1)}>Previous</Button>
            <span className="text-sm text-medical-muted">Page {page + 1}</span>
            <Button variant="outline" size="sm" disabled={notes.length < PAGE_SIZE} onClick={() => setPage(page + 1)}>Next</Button>
          </div>
        </div>
      )}

      {/* PRESCRIPTIONS TAB */}
      {tab === "prescriptions" && (
        <div className="space-y-4">
          <Button variant="outline" size="sm" onClick={() => handleExportJSON("consultation_documents")}>Export All</Button>

          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-medical-border bg-gray-50">
                      <th className="px-4 py-3 text-left font-semibold text-medical-muted">Date</th>
                      <th className="px-4 py-3 text-left font-semibold text-medical-muted">Consultation</th>
                      <th className="px-4 py-3 text-left font-semibold text-medical-muted">Medications</th>
                      <th className="px-4 py-3 text-left font-semibold text-medical-muted">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {prescriptions.map((p) => (
                      <tr key={p.id} className="border-b border-medical-border hover:bg-gray-50">
                        <td className="px-4 py-3 text-medical-text">{fmt(p.created_at)}</td>
                        <td className="px-4 py-3 font-mono text-xs text-medical-muted">{p.consultation_id?.slice(0, 8)}...</td>
                        <td className="px-4 py-3">
                          {(p.medications || []).map((m, i) => (
                            <span key={i} className="inline-block rounded-full bg-amber-100 text-amber-800 px-2 py-0.5 text-xs font-medium mr-1 mb-1">
                              {m.name} {m.dosage}
                            </span>
                          ))}
                        </td>
                        <td className="px-4 py-3 text-medical-muted text-xs max-w-xs truncate">{p.notes || "—"}</td>
                      </tr>
                    ))}
                    {prescriptions.length === 0 && !loading && (
                      <tr><td colSpan={4} className="px-4 py-8 text-center text-medical-muted">No prescriptions found</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <div className="flex items-center justify-between">
            <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(page - 1)}>Previous</Button>
            <span className="text-sm text-medical-muted">Page {page + 1}</span>
            <Button variant="outline" size="sm" disabled={prescriptions.length < PAGE_SIZE} onClick={() => setPage(page + 1)}>Next</Button>
          </div>
        </div>
      )}

      {/* AUDIT LOG TAB */}
      {tab === "audit" && (
        <div className="space-y-4">
          <Button variant="outline" size="sm" onClick={() => handleExportJSON("audit_log")}>Export Audit Log</Button>

          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-medical-border bg-gray-50">
                      <th className="px-4 py-3 text-left font-semibold text-medical-muted">Timestamp</th>
                      <th className="px-4 py-3 text-left font-semibold text-medical-muted">Action</th>
                      <th className="px-4 py-3 text-left font-semibold text-medical-muted">Resource</th>
                      <th className="px-4 py-3 text-left font-semibold text-medical-muted">Resource ID</th>
                      <th className="px-4 py-3 text-left font-semibold text-medical-muted">IP</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditLog.map((a) => (
                      <tr key={a.id} className="border-b border-medical-border hover:bg-gray-50">
                        <td className="px-4 py-3 text-medical-text text-xs">{fmt(a.created_at)}</td>
                        <td className="px-4 py-3">
                          <span className="rounded-full bg-purple-100 text-purple-700 px-2 py-0.5 text-xs font-medium">
                            {a.action}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-medical-text text-xs">{a.resource_type}</td>
                        <td className="px-4 py-3 font-mono text-xs text-medical-muted">{a.resource_id?.slice(0, 8) || "—"}</td>
                        <td className="px-4 py-3 text-medical-muted text-xs">{a.ip_address || "—"}</td>
                      </tr>
                    ))}
                    {auditLog.length === 0 && !loading && (
                      <tr><td colSpan={5} className="px-4 py-8 text-center text-medical-muted">No audit entries found</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <div className="flex items-center justify-between">
            <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(page - 1)}>Previous</Button>
            <span className="text-sm text-medical-muted">Page {page + 1}</span>
            <Button variant="outline" size="sm" disabled={auditLog.length < PAGE_SIZE} onClick={() => setPage(page + 1)}>Next</Button>
          </div>
        </div>
      )}

      {/* DATA & STORAGE TAB */}
      {tab === "storage" && stats && (
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Data Retention & Storage Policy</CardTitle></CardHeader>
            <CardContent>
              <div className="grid gap-6 lg:grid-cols-2">
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-medical-text">Stored Data Categories</h3>
                  {[
                    { label: "Patient Records", count: stats.totalPatients, retention: "Indefinite (clinical requirement)", icon: "👤" },
                    { label: "Consultation Records", count: stats.totalConsultations, retention: "10 years (NHS/CMS standard)", icon: "🩺" },
                    { label: "Audio Transcripts", count: stats.totalTranscripts, retention: "10 years (clinical record)", icon: "📝" },
                    { label: "Clinical Notes (SOAP)", count: stats.totalNotes, retention: "10 years minimum", icon: "📋" },
                    { label: "Prescriptions", count: stats.totalPrescriptions, retention: "10 years (pharmacy requirement)", icon: "💊" },
                    { label: "Audit Trail", count: stats.totalAuditEntries, retention: "6 years (HIPAA/GDPR)", icon: "🔍" },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center justify-between rounded-lg border border-medical-border p-3">
                      <div className="flex items-center gap-3">
                        <span className="text-lg">{item.icon}</span>
                        <div>
                          <p className="text-sm font-medium text-medical-text">{item.label}</p>
                          <p className="text-[11px] text-medical-muted">{item.retention}</p>
                        </div>
                      </div>
                      <span className="text-lg font-bold text-brand-700">{item.count}</span>
                    </div>
                  ))}
                </div>

                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-medical-text">Compliance Status</h3>
                  {[
                    { label: "Row-Level Security (RLS)", status: true, desc: "All tables protected by user-scoped policies" },
                    { label: "Authentication", status: true, desc: "Supabase Auth with email/password + MFA option" },
                    { label: "Consent Tracking", status: true, desc: "Per-consultation consent with timestamp" },
                    { label: "Audit Logging", status: true, desc: "All data access and modifications logged" },
                    { label: "Data Export (GDPR Art. 20)", status: true, desc: "Full JSON/PDF export available" },
                    { label: "Data Deletion (GDPR Art. 17)", status: true, desc: "Complete account deletion endpoint" },
                    { label: "Encryption at Rest", status: true, desc: "Supabase PostgreSQL with AES-256 encryption" },
                    { label: "Encryption in Transit", status: true, desc: "TLS 1.3 for all API and database connections" },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center gap-3 rounded-lg border border-medical-border p-3">
                      <div className={cn(
                        "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                        item.status ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                      )}>
                        {item.status ? "✓" : "✗"}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-medical-text">{item.label}</p>
                        <p className="text-[11px] text-medical-muted">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-brand-600" />
        </div>
      )}
    </div>
  );
}
