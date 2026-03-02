"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n/context";

interface ConsultationRow {
  id: string;
  visit_type: string;
  status: string;
  created_at: string;
  recording_duration_seconds: number | null;
  metadata: Record<string, unknown>;
  patient_id: string | null;
}

interface NoteRow {
  id: string;
  consultation_id: string;
  status: string;
  sections: { title: string; content: string }[];
  billing_codes: { code: string; system: string; description: string; confidence: number }[];
  created_at: string;
}

const statusToPendingAction: Record<string, string> = {
  scheduled: "Recording",
  recording: "Recording",
  transcribed: "Validate forms",
  note_generated: "Validate forms",
  reviewed: "Submit forms",
  finalized: "Refer to clinician",
  deleted: "—",
};

function safeString(value: unknown, fallback = "—"): string {
  return typeof value === "string" && value.trim().length > 0 ? value : fallback;
}

export default function AnalyticsPage() {
  const supabase = createClient();
  const { t } = useTranslation();

  const [consultations, setConsultations] = useState<ConsultationRow[]>([]);
  const [notes, setNotes] = useState<NoteRow[]>([]);
  const [referralCount, setReferralCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Drill-down modal
  const [drillDownStatus, setDrillDownStatus] = useState<"draft" | "reviewed" | "finalized" | null>(null);
  const [drillDownICD, setDrillDownICD] = useState<string | null>(null);

  // Filters
  const [filterGender, setFilterGender] = useState("");
  const [filterVisitType, setFilterVisitType] = useState("");
  const [filterICD, setFilterICD] = useState("");
  const [filterPatientId, setFilterPatientId] = useState("");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "reports">("overview");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("consultations")
        .select("id, visit_type, status, created_at, recording_duration_seconds, metadata, patient_id")
        .order("created_at", { ascending: false })
        .limit(200);

      if (filterVisitType) query = query.eq("visit_type", filterVisitType);
      if (filterPatientId) query = query.eq("patient_id", filterPatientId);
      if (filterDateFrom) query = query.gte("created_at", filterDateFrom);
      if (filterDateTo) query = query.lte("created_at", filterDateTo + "T23:59:59");

      const { data: consultData } = await query;
      const allConsultations = consultData || [];

      // If filtering by gender, we need patient data
      let filtered = allConsultations;
      if (filterGender && filtered.length > 0) {
        const patientIds = [...new Set(filtered.map((c) => c.patient_id).filter(Boolean))];
        if (patientIds.length > 0) {
          const { data: patients } = await supabase
            .from("patients")
            .select("id, gender")
            .in("id", patientIds as string[])
            .eq("gender", filterGender);
          const matchIds = new Set((patients || []).map((p) => p.id));
          filtered = filtered.filter((c) => c.patient_id && matchIds.has(c.patient_id));
        }
      }

      setConsultations(filtered);

      // Fetch notes for these consultations
      if (filtered.length > 0) {
        const { data: notesData } = await supabase
          .from("clinical_notes")
          .select("id, consultation_id, status, sections, billing_codes, created_at")
          .in("consultation_id", filtered.map((c) => c.id))
          .order("created_at", { ascending: false });

        let notesResult = (notesData || []) as unknown as NoteRow[];

        // Filter by ICD code if specified
        let consultIdsForReferrals = filtered.map((c) => c.id);
        if (filterICD) {
          const icdLower = filterICD.toLowerCase();
          notesResult = notesResult.filter((n) =>
            (n.billing_codes || []).some((bc) =>
              bc.code.toLowerCase().includes(icdLower) || bc.description.toLowerCase().includes(icdLower)
            )
          );
          const matchingConsultationIds = new Set(notesResult.map((n) => n.consultation_id));
          consultIdsForReferrals = filtered.filter((c) => matchingConsultationIds.has(c.id)).map((c) => c.id);
          setConsultations((prev) => prev.filter((c) => matchingConsultationIds.has(c.id)));
        }

        setNotes(notesResult);

        // Fetch referral count (consultation_documents with document_type = referral_letter)
        if (consultIdsForReferrals.length > 0) {
          const { count } = await supabase
            .from("consultation_documents")
            .select("*", { count: "exact", head: true })
            .eq("document_type", "referral_letter")
            .in("consultation_id", consultIdsForReferrals)
            .eq("status", "active");
          setReferralCount(count ?? 0);
        } else {
          setReferralCount(0);
        }
      } else {
        setNotes([]);
        setReferralCount(0);
      }
    } catch {
      // fail silently
    } finally {
      setLoading(false);
    }
  }, [supabase, filterGender, filterVisitType, filterICD, filterPatientId, filterDateFrom, filterDateTo]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Computed analytics
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const totalCount = consultations.length;
  const monthCount = consultations.filter((c) => new Date(c.created_at) >= thirtyDaysAgo).length;
  const weekCount = consultations.filter((c) => new Date(c.created_at) >= sevenDaysAgo).length;

  const durations = consultations.filter((c) => c.recording_duration_seconds).map((c) => c.recording_duration_seconds!);
  const avgDuration = durations.length > 0 ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0;

  // Visit type distribution
  const visitTypeCounts: Record<string, number> = {};
  consultations.forEach((c) => { visitTypeCounts[c.visit_type] = (visitTypeCounts[c.visit_type] || 0) + 1; });
  const visitTypes = Object.entries(visitTypeCounts).sort((a, b) => b[1] - a[1]);

  // Status distribution
  const statusCounts: Record<string, number> = {};
  consultations.forEach((c) => { statusCounts[c.status] = (statusCounts[c.status] || 0) + 1; });

  // Note status
  const draftCount = notes.filter((n) => n.status === "draft").length;
  const reviewedCount = notes.filter((n) => n.status === "reviewed").length;
  const finalizedCount = notes.filter((n) => n.status === "finalized").length;

  // ICD code distribution
  const icdCounts: Record<string, { code: string; description: string; count: number }> = {};
  notes.forEach((n) => {
    (n.billing_codes || []).filter((bc) => bc.system === "ICD-10").forEach((bc) => {
      if (!icdCounts[bc.code]) icdCounts[bc.code] = { code: bc.code, description: bc.description, count: 0 };
      icdCounts[bc.code].count++;
    });
  });
  const topICD = Object.values(icdCounts).sort((a, b) => b.count - a.count).slice(0, 10);

  // Daily counts (last 7 days)
  const dailyCounts: { date: string; count: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const dayStr = d.toISOString().split("T")[0];
    const dayLabel = d.toLocaleDateString("en-US", { weekday: "short" });
    const count = consultations.filter((c) => c.created_at.startsWith(dayStr)).length;
    dailyCounts.push({ date: dayLabel, count });
  }
  const maxDailyCount = Math.max(...dailyCounts.map((d) => d.count), 1);

  const statusColors: Record<string, string> = {
    scheduled: "bg-gray-400", recording: "bg-red-400", transcribed: "bg-yellow-400",
    note_generated: "bg-blue-400", reviewed: "bg-indigo-400", finalized: "bg-green-400",
  };

  // Phase 1: Patients Needing Attention (actionable list)
  const attentionConsultations = consultations.filter((c) =>
    ["transcribed", "note_generated", "reviewed"].includes(c.status)
  );
  const patientsNeedingAttention = attentionConsultations.map((c) => {
    const meta = (c.metadata || {}) as Record<string, unknown>;
    const riskLevel =
      (typeof meta.risk_level === "string" && meta.risk_level) ||
      (typeof meta.risk_status === "string" && meta.risk_status) ||
      "normal";
    const nextAction = statusToPendingAction[c.status] ?? "—";
    return {
      id: c.id,
      patient_id: c.patient_id,
      patientName: safeString(meta.patient_name, "Unnamed Patient"),
      nextAction,
      riskLevel: riskLevel as string,
      visit_type: c.visit_type,
    };
  }).sort((a, b) => {
    const riskOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
    return (riskOrder[a.riskLevel] ?? 9) - (riskOrder[b.riskLevel] ?? 9);
  });

  // Phase 1: Patients at Risk
  const riskMap = new Map<string, { id: string; patientName: string; riskLevel: string }>();
  for (const c of consultations) {
    const meta = (c.metadata || {}) as Record<string, unknown>;
    const patientId = c.patient_id as string;
    if (!patientId || riskMap.has(patientId)) continue;
    const riskLevel = (meta.risk_level as string) || (meta.risk_status as string);
    if (riskLevel && ["high", "medium", "low"].includes(riskLevel)) {
      riskMap.set(patientId, {
        id: patientId,
        patientName: safeString(meta.patient_name, "Unknown"),
        riskLevel,
      });
    }
  }
  const patientsAtRisk = Array.from(riskMap.values()).sort((a, b) => {
    const order: Record<string, number> = { high: 0, medium: 1, low: 2 };
    return (order[a.riskLevel] ?? 9) - (order[b.riskLevel] ?? 9);
  });

  // Phase 1: Time Saved (estimated: 50% reduction in documentation time vs manual)
  const monthDurations = consultations
    .filter((c) => new Date(c.created_at) >= thirtyDaysAgo && c.recording_duration_seconds)
    .map((c) => c.recording_duration_seconds!);
  const totalMonthSeconds = monthDurations.reduce((a, b) => a + b, 0);
  const timeSavedMinutes = Math.round((totalMonthSeconds / 60) * 0.5); // 50% time savings

  // Phase 2: Patient Retention
  const visitsByPatient: Record<string, number> = {};
  consultations.forEach((c) => {
    const pid = c.patient_id || "unknown";
    visitsByPatient[pid] = (visitsByPatient[pid] || 0) + 1;
  });
  const retentionBuckets = {
    oneVisit: Object.values(visitsByPatient).filter((v) => v === 1).length,
    twoToFour: Object.values(visitsByPatient).filter((v) => v >= 2 && v <= 4).length,
    fivePlus: Object.values(visitsByPatient).filter((v) => v >= 5).length,
  };
  const newThisMonth = retentionBuckets.oneVisit;
  const returningThisMonth = retentionBuckets.twoToFour + retentionBuckets.fivePlus;
  const lastVisitByPatient: Record<string, Date> = {};
  consultations.forEach((c) => {
    const pid = c.patient_id;
    if (!pid || pid === "unknown") return;
    const d = new Date(c.created_at);
    if (!lastVisitByPatient[pid] || d > lastVisitByPatient[pid]) lastVisitByPatient[pid] = d;
  });
  const needingFollowUp = Object.entries(lastVisitByPatient).filter(
    ([_, last]) => (now.getTime() - last.getTime()) / (24 * 60 * 60 * 1000) > 30
  ).length;

  // Phase 2: Diagnosis Trends (from metadata)
  const diagnosisCounts: Record<string, number> = {};
  consultations.forEach((c) => {
    const meta = (c.metadata || {}) as Record<string, unknown>;
    const diag = (meta.primary_diagnosis as string) || (meta.diagnosis as string);
    if (diag && typeof diag === "string") {
      const key = diag.trim();
      if (key) diagnosisCounts[key] = (diagnosisCounts[key] || 0) + 1;
    }
  });
  const topDiagnoses = Object.entries(diagnosisCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);

  // Notes by status for drill-down
  const notesByStatus = {
    draft: notes.filter((n) => n.status === "draft"),
    reviewed: notes.filter((n) => n.status === "reviewed"),
    finalized: notes.filter((n) => n.status === "finalized"),
  };

  // Report generation
  const generateReport = () => {
    const lines: string[] = [];
    lines.push("ANALYTICS REPORT — MedScribe AI");
    lines.push(`Generated: ${new Date().toLocaleString()}`);
    lines.push("=".repeat(60));
    if (filterGender || filterVisitType || filterICD || filterPatientId || filterDateFrom || filterDateTo) {
      lines.push("\nACTIVE FILTERS:");
      if (filterGender) lines.push(`  Gender: ${filterGender}`);
      if (filterVisitType) lines.push(`  Visit Type: ${filterVisitType}`);
      if (filterICD) lines.push(`  ICD Code: ${filterICD}`);
      if (filterPatientId) lines.push(`  Patient ID: ${filterPatientId}`);
      if (filterDateFrom) lines.push(`  From: ${filterDateFrom}`);
      if (filterDateTo) lines.push(`  To: ${filterDateTo}`);
    }
    lines.push("\nSUMMARY");
    lines.push("-".repeat(40));
    lines.push(`Total Consultations: ${totalCount}`);
    lines.push(`This Month: ${monthCount}`);
    lines.push(`This Week: ${weekCount}`);
    lines.push(`Average Duration: ${avgDuration > 0 ? `${Math.floor(avgDuration / 60)}m ${avgDuration % 60}s` : "N/A"}`);
    lines.push(`\nNotes: ${draftCount} draft, ${reviewedCount} reviewed, ${finalizedCount} finalized`);

    if (visitTypes.length > 0) {
      lines.push("\nVISIT TYPE DISTRIBUTION");
      lines.push("-".repeat(40));
      visitTypes.forEach(([type, count]) => lines.push(`  ${type}: ${count}`));
    }

    if (topICD.length > 0) {
      lines.push("\nTOP ICD-10 CODES");
      lines.push("-".repeat(40));
      topICD.forEach((icd) => lines.push(`  ${icd.code} — ${icd.description} (${icd.count})`));
    }

    if (Object.keys(statusCounts).length > 0) {
      lines.push("\nCONSULTATION STATUS");
      lines.push("-".repeat(40));
      Object.entries(statusCounts).forEach(([s, c]) => lines.push(`  ${s.replace(/_/g, " ")}: ${c}`));
    }

    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `analytics-report-${new Date().toISOString().split("T")[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-medical-text">{t("analytics.title")}</h1>
          <p className="text-sm text-medical-muted mt-1">{t("analytics.subtitle")}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)}>
            <svg className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 0 1-.659 1.591l-5.432 5.432a2.25 2.25 0 0 0-.659 1.591v2.927a2.25 2.25 0 0 1-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 0 0-.659-1.591L3.659 7.409A2.25 2.25 0 0 1 3 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0 1 12 3Z" /></svg>
            {t("analytics.filters")}
          </Button>
          <Button size="sm" onClick={generateReport}>
            <svg className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
            {t("analytics.generateReport")}
          </Button>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{t("analytics.filterAnalytics")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              <div>
                <label className="block text-xs font-medium text-medical-muted mb-1">{t("analytics.gender")}</label>
                <select value={filterGender} onChange={(e) => setFilterGender(e.target.value)} className="w-full rounded-lg border border-medical-border px-3 py-2 text-sm focus:border-brand-500 focus:outline-none">
                  <option value="">{t("common.all")}</option>
                  <option value="male">{t("common.male")}</option>
                  <option value="female">{t("common.female")}</option>
                  <option value="other">{t("common.other")}</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-medical-muted mb-1">{t("analytics.visitType")}</label>
                <select value={filterVisitType} onChange={(e) => setFilterVisitType(e.target.value)} className="w-full rounded-lg border border-medical-border px-3 py-2 text-sm focus:border-brand-500 focus:outline-none">
                  <option value="">{t("common.all")}</option>
                  {["Follow-up Visit", "New Patient Visit", "Routine Check-up", "Emergency", "Specialist Consultation", "Telehealth", "Mental Health Session"].map((v) => (
                    <option key={v} value={v}>{v}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-medical-muted mb-1">{t("analytics.icdCode")}</label>
                <input type="text" value={filterICD} onChange={(e) => setFilterICD(e.target.value)} placeholder="e.g. J06 or fever" className="w-full rounded-lg border border-medical-border px-3 py-2 text-sm focus:border-brand-500 focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-medical-muted mb-1">{t("analytics.patientId")}</label>
                <input type="text" value={filterPatientId} onChange={(e) => setFilterPatientId(e.target.value)} placeholder="Patient UUID" className="w-full rounded-lg border border-medical-border px-3 py-2 text-sm focus:border-brand-500 focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-medical-muted mb-1">{t("analytics.fromDate")}</label>
                <input type="date" value={filterDateFrom} onChange={(e) => setFilterDateFrom(e.target.value)} className="w-full rounded-lg border border-medical-border px-3 py-2 text-sm focus:border-brand-500 focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-medical-muted mb-1">{t("analytics.toDate")}</label>
                <input type="date" value={filterDateTo} onChange={(e) => setFilterDateTo(e.target.value)} className="w-full rounded-lg border border-medical-border px-3 py-2 text-sm focus:border-brand-500 focus:outline-none" />
              </div>
            </div>
            <div className="mt-3 flex gap-2">
              <Button size="sm" variant="outline" onClick={() => {
                setFilterGender(""); setFilterVisitType(""); setFilterICD(""); setFilterPatientId(""); setFilterDateFrom(""); setFilterDateTo("");
              }}>{t("analytics.clearFilters")}</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs: Overview / Reports */}
      <div className="flex gap-1 border-b border-medical-border">
        {([
          { key: "overview" as const, label: t("analytics.overview") },
          { key: "reports" as const, label: t("analytics.reportsICD") },
        ]).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition ${
              activeTab === tab.key ? "border-brand-500 text-brand-600" : "border-transparent text-medical-muted hover:text-medical-text"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-12 text-center text-medical-muted">{t("analytics.loadingAnalytics")}</div>
      ) : activeTab === "overview" ? (
        <>
          {/* Summary Stats */}
          <div className="grid gap-4 md:grid-cols-5">
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-medical-muted">{t("analytics.totalConsultations")}</p>
                <p className="mt-2 text-3xl font-bold text-medical-text">{totalCount}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-medical-muted">{t("analytics.thisMonth")}</p>
                <p className="mt-2 text-3xl font-bold text-blue-600">{monthCount}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-medical-muted">{t("analytics.thisWeek")}</p>
                <p className="mt-2 text-3xl font-bold text-indigo-600">{weekCount}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-medical-muted">{t("analytics.avgDuration")}</p>
                <p className="mt-2 text-3xl font-bold text-medical-text">
                  {avgDuration > 0 ? `${Math.floor(avgDuration / 60)}m ${avgDuration % 60}s` : "N/A"}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-medical-muted">{t("analytics.timeSaved")}</p>
                <p className="mt-2 text-3xl font-bold text-green-600">
                  {timeSavedMinutes >= 60 ? `${Math.floor(timeSavedMinutes / 60)}h ${timeSavedMinutes % 60}m` : `${timeSavedMinutes}m`}
                </p>
                <p className="text-xs text-medical-muted mt-1">{t("analytics.thisMonthEst")}</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Phase 1: Patients Needing Attention */}
            <Card>
              <CardHeader><CardTitle>{t("analytics.patientsNeedingAttention")}</CardTitle></CardHeader>
              <CardContent>
                {patientsNeedingAttention.length > 0 ? (
                  <div className="space-y-2">
                    {patientsNeedingAttention.slice(0, 8).map((item) => (
                      <Link
                        key={item.id}
                        href={item.patient_id ? `/patients/${item.patient_id}` : `/consultation/${item.id}/note`}
                        className="flex items-center justify-between rounded-lg border border-medical-border px-3 py-2 hover:bg-gray-50 transition"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-medium text-sm text-medical-text truncate">{item.patientName}</span>
                          <span className="text-xs text-medical-muted">—</span>
                          <span className="text-xs text-medical-muted truncate">{item.nextAction}</span>
                          <span className={`inline-flex rounded-full px-1.5 py-0.5 text-[10px] font-medium shrink-0 ${
                            item.riskLevel === "high" ? "bg-red-100 text-red-700" :
                            item.riskLevel === "medium" ? "bg-amber-100 text-amber-700" :
                            "bg-gray-100 text-gray-600"
                          }`}>
                            {item.riskLevel === "high" ? t("analytics.highRisk") : item.riskLevel === "medium" ? t("analytics.mediumRisk") : item.riskLevel}
                          </span>
                        </div>
                        <span className="text-xs text-brand-600 shrink-0">→</span>
                      </Link>
                    ))}
                    {patientsNeedingAttention.length > 8 && (
                      <p className="text-xs text-medical-muted pt-1">+{patientsNeedingAttention.length - 8} more</p>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-medical-muted text-center py-6">{t("analytics.noConsultations")}</p>
                )}
              </CardContent>
            </Card>

            {/* Weekly Activity Chart */}
            <Card>
              <CardHeader><CardTitle>{t("analytics.consultationsThisWeek")}</CardTitle></CardHeader>
              <CardContent>
                <div className="flex items-end gap-3 h-40">
                  {dailyCounts.map((day, idx) => (
                    <div key={idx} className="flex-1 flex flex-col items-center gap-1">
                      <span className="text-xs text-medical-muted">{day.count}</span>
                      <div className="w-full bg-blue-500 rounded-t transition-all" style={{ height: `${(day.count / maxDailyCount) * 100}%`, minHeight: day.count > 0 ? "8px" : "2px" }} />
                      <span className="text-xs text-medical-muted">{day.date}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Phase 1: Patients at Risk */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{t("analytics.patientsAtRisk")}</CardTitle>
                  {patientsAtRisk.length > 0 && (
                    <span className="text-xs text-medical-muted">({patientsAtRisk.length})</span>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {patientsAtRisk.length > 0 ? (
                  <div className="space-y-2">
                    {patientsAtRisk.slice(0, 6).map((p) => (
                      <Link
                        key={p.id}
                        href={`/patients/${p.id}`}
                        className="flex items-center justify-between rounded-lg border border-medical-border px-3 py-2 hover:bg-gray-50 transition"
                      >
                        <span className="font-medium text-sm text-medical-text">{p.patientName}</span>
                        <span className={`inline-flex rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                          p.riskLevel === "high" ? "bg-red-100 text-red-700" :
                          p.riskLevel === "medium" ? "bg-amber-100 text-amber-700" :
                          "bg-gray-100 text-gray-600"
                        }`}>
                          {p.riskLevel === "high" ? t("analytics.highRisk") : p.riskLevel === "medium" ? t("analytics.mediumRisk") : t("analytics.lowRisk")}
                        </span>
                      </Link>
                    ))}
                    {patientsAtRisk.length > 6 && (
                      <Link href="/patients" className="block text-center text-sm text-brand-600 hover:underline pt-1">
                        {t("analytics.viewAll")}
                      </Link>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-medical-muted text-center py-6">{t("analytics.noConsultations")}</p>
                )}
              </CardContent>
            </Card>

            {/* Note Status (Phase 1: Drill-down) */}
            <Card>
              <CardHeader><CardTitle>{t("analytics.noteStatus")}</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { label: t("analytics.draft"), count: draftCount, color: "bg-yellow-400", status: "draft" as const },
                    { label: t("analytics.reviewed"), count: reviewedCount, color: "bg-blue-400", status: "reviewed" as const },
                    { label: t("analytics.finalized"), count: finalizedCount, color: "bg-green-400", status: "finalized" as const },
                  ].map((item) => {
                    const total = draftCount + reviewedCount + finalizedCount;
                    const pct = total > 0 ? (item.count / total) * 100 : 0;
                    return (
                      <div key={item.label} className="flex items-center gap-3">
                        <span className="text-sm text-medical-text w-20">{item.label}</span>
                        <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
                          <div className={`h-full ${item.color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
                        </div>
                        <button
                          type="button"
                          onClick={() => item.count > 0 && setDrillDownStatus(item.status)}
                          className={`text-sm font-medium text-right min-w-[80px] ${item.count > 0 ? "text-brand-600 hover:underline cursor-pointer" : "text-medical-muted cursor-default"}`}
                        >
                          {item.count}{item.count > 0 ? ` → ${t("analytics.viewList")}` : ""}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Visit Types */}
            <Card>
              <CardHeader><CardTitle>{t("analytics.visitTypes")}</CardTitle></CardHeader>
              <CardContent>
                {visitTypes.length > 0 ? (
                  <div className="space-y-3">
                    {visitTypes.map(([type, count]) => (
                      <div key={type} className="flex items-center justify-between">
                        <span className="text-sm text-medical-text">{type}</span>
                        <div className="flex items-center gap-2">
                          <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-indigo-400 rounded-full" style={{ width: `${(count / totalCount) * 100}%` }} />
                          </div>
                          <span className="text-xs font-medium text-medical-muted w-6 text-right">{count}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-medical-muted text-center py-4">{t("analytics.noConsultations")}</p>
                )}
              </CardContent>
            </Card>

            {/* Consultation Status */}
            <Card>
              <CardHeader><CardTitle>{t("analytics.consultationStatus")}</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(statusCounts).map(([s, count]) => (
                    <div key={s} className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${statusColors[s] || "bg-gray-400"}`} />
                      <span className="text-sm text-medical-text flex-1 capitalize">{s.replace(/_/g, " ")}</span>
                      <span className="text-sm font-medium text-medical-muted">{count}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Phase 2: Patient Retention */}
            <Card>
              <CardHeader><CardTitle>{t("analytics.patientRetention")}</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-medical-text">{t("analytics.visits1")}</span>
                    <span className="text-sm font-medium text-medical-text">{retentionBuckets.oneVisit}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-medical-text">{t("analytics.visits2to4")}</span>
                    <span className="text-sm font-medium text-medical-text">{retentionBuckets.twoToFour}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-medical-text">{t("analytics.visits5plus")}</span>
                    <span className="text-sm font-medium text-medical-text">{retentionBuckets.fivePlus}</span>
                  </div>
                  <div className="border-t border-medical-border pt-3 mt-3 space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-medical-muted">{t("analytics.newThisMonth")}</span>
                      <span className="font-medium">{newThisMonth}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-medical-muted">{t("analytics.returningThisMonth")}</span>
                      <span className="font-medium">{returningThisMonth}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-medical-muted">{t("analytics.needingFollowUp")}</span>
                      <span className="font-medium text-amber-600">{needingFollowUp}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Phase 2: Diagnosis Trends */}
            <Card>
              <CardHeader><CardTitle>{t("analytics.diagnosisTrends")}</CardTitle></CardHeader>
              <CardContent>
                {topDiagnoses.length > 0 ? (
                  <div className="space-y-3">
                    {topDiagnoses.map(([diag, count]) => (
                      <div key={diag} className="flex items-center justify-between">
                        <span className="text-sm text-medical-text truncate flex-1 mr-2">{diag}</span>
                        <div className="w-20 h-2 bg-gray-100 rounded-full overflow-hidden shrink-0">
                          <div className="h-full bg-indigo-400 rounded-full" style={{ width: `${(count / (topDiagnoses[0]?.[1] || 1)) * 100}%` }} />
                        </div>
                        <span className="text-xs font-medium text-medical-muted w-6 text-right">{count}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-medical-muted text-center py-6">{t("analytics.noConsultations")}</p>
                )}
              </CardContent>
            </Card>

            {/* Phase 2: Referral Tracking */}
            <Card>
              <CardHeader><CardTitle>{t("analytics.referralTracking")}</CardTitle></CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-medical-muted">{t("analytics.referralsSent")}</span>
                  <span className="text-2xl font-bold text-medical-text">{referralCount}</span>
                </div>
              </CardContent>
            </Card>

            {/* Phase 2: Outcome Tracking (placeholder) */}
            <Card className="bg-gray-50 border-dashed">
              <CardHeader><CardTitle className="text-medical-muted">{t("analytics.outcomeTracking")}</CardTitle></CardHeader>
              <CardContent>
                <p className="text-sm text-medical-muted">{t("analytics.outcomePlaceholder")}</p>
              </CardContent>
            </Card>
          </div>

        </>
      ) : (
        /* Reports & ICD Analysis Tab */
        <div className="space-y-6">
          {/* Top ICD Codes */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{t("analytics.topICD")}</CardTitle>
                <span className="text-xs text-medical-muted">{Object.keys(icdCounts).length} {t("analytics.uniqueCodes")}</span>
              </div>
            </CardHeader>
            <CardContent>
              {topICD.length > 0 ? (
                <div className="space-y-3">
                  {topICD.map((icd) => (
                    <button
                      key={icd.code}
                      type="button"
                      onClick={() => { setDrillDownStatus(null); setDrillDownICD(icd.code); }}
                      className="w-full flex items-center gap-3 rounded-lg px-2 py-1 hover:bg-gray-50 transition text-left"
                    >
                      <span className="inline-block rounded bg-indigo-50 px-2 py-0.5 text-xs font-mono font-medium text-indigo-700 w-16 text-center">{icd.code}</span>
                      <span className="text-sm text-medical-text flex-1">{icd.description}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-indigo-400 rounded-full" style={{ width: `${(icd.count / (topICD[0]?.count || 1)) * 100}%` }} />
                        </div>
                        <span className="text-xs font-medium text-medical-muted w-6 text-right">{icd.count} →</span>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-medical-muted text-center py-6">{t("analytics.noICD")}</p>
              )}
            </CardContent>
          </Card>

          {/* Recent Clinical Notes for Report Context */}
          <Card>
            <CardHeader><CardTitle>{t("analytics.recentNotes")}</CardTitle></CardHeader>
            <CardContent>
              {notes.length > 0 ? (
                <div className="space-y-3">
                  {notes.slice(0, 10).map((note) => (
                    <div key={note.id} className="rounded-lg border border-medical-border p-3 hover:bg-gray-50 transition">
                      <div className="flex items-center justify-between mb-1">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                          note.status === "finalized" ? "bg-green-100 text-green-700" :
                          note.status === "reviewed" ? "bg-blue-100 text-blue-700" :
                          "bg-yellow-100 text-yellow-700"
                        }`}>{note.status}</span>
                        <span className="text-xs text-medical-muted">{formatDateTime(note.created_at)}</span>
                      </div>
                      <div className="text-xs text-medical-muted mt-1 space-y-0.5">
                        {(note.sections || []).slice(0, 2).map((s, i) => (
                          <p key={i}><span className="font-medium">{s.title}:</span> {s.content.substring(0, 120)}...</p>
                        ))}
                      </div>
                      {note.billing_codes?.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {note.billing_codes.map((bc, i) => (
                            <span key={i} className="inline-block rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-600">
                              {bc.system}: {bc.code}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-medical-muted text-center py-6">{t("analytics.noNotes")}</p>
              )}
            </CardContent>
          </Card>

          {/* Generate Report CTA */}
          <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-medical-text">{t("analytics.generateCustom")}</h3>
                  <p className="text-sm text-medical-muted mt-1">
                    {t("analytics.exportDescription")}
                    {(filterGender || filterVisitType || filterICD || filterPatientId || filterDateFrom || filterDateTo) ?
                      " " + t("analytics.filtersApplied") : " " + t("analytics.useFilters")}
                  </p>
                </div>
                <Button onClick={generateReport}>
                  {t("analytics.downloadReport")}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Drill-down Modal (works from Overview and Reports tabs) */}
      {(drillDownStatus || drillDownICD) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => { setDrillDownStatus(null); setDrillDownICD(null); }}>
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[80vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="px-4 py-3 border-b border-medical-border flex items-center justify-between">
              <h3 className="font-semibold text-medical-text">
                {drillDownStatus
                  ? `${t("analytics.noteStatus")} — ${drillDownStatus === "draft" ? t("analytics.draft") : drillDownStatus === "reviewed" ? t("analytics.reviewed") : t("analytics.finalized")}`
                  : `ICD ${drillDownICD}`}
              </h3>
              <Button variant="outline" size="sm" onClick={() => { setDrillDownStatus(null); setDrillDownICD(null); }}>
                {t("analytics.close")}
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {drillDownStatus && (
                <div className="space-y-2">
                  {(notesByStatus[drillDownStatus] || []).map((note) => {
                    const consult = consultations.find((c) => c.id === note.consultation_id);
                    const meta = (consult?.metadata || {}) as Record<string, unknown>;
                    const patientName = safeString(meta.patient_name, "Unnamed");
                    return (
                      <Link
                        key={note.id}
                        href={`/consultation/${note.consultation_id}/note`}
                        className="block rounded-lg border border-medical-border px-3 py-2 hover:bg-gray-50 transition"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-sm">{patientName}</span>
                          <span className="text-xs text-medical-muted">{formatDateTime(note.created_at)}</span>
                        </div>
                      </Link>
                    );
                  })}
                  {(!notesByStatus[drillDownStatus] || notesByStatus[drillDownStatus].length === 0) && (
                    <p className="text-sm text-medical-muted py-4">{t("analytics.noNotes")}</p>
                  )}
                </div>
              )}
              {drillDownICD && (() => {
                const matchingNotes = notes.filter((n) =>
                  (n.billing_codes || []).some((bc) =>
                    bc.code.toLowerCase().includes(drillDownICD.toLowerCase()) ||
                    bc.description.toLowerCase().includes(drillDownICD.toLowerCase())
                  )
                );
                return (
                  <div className="space-y-2">
                    {matchingNotes.length > 0 ? matchingNotes.map((note) => {
                      const consult = consultations.find((c) => c.id === note.consultation_id);
                      const meta = (consult?.metadata || {}) as Record<string, unknown>;
                      const patientName = safeString(meta.patient_name, "Unnamed");
                      return (
                        <Link
                          key={note.id}
                          href={`/consultation/${note.consultation_id}/note`}
                          className="block rounded-lg border border-medical-border px-3 py-2 hover:bg-gray-50 transition"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-sm">{patientName}</span>
                            <span className="text-xs text-medical-muted">{formatDateTime(note.created_at)}</span>
                          </div>
                        </Link>
                      );
                    }) : (
                      <p className="text-sm text-medical-muted py-4">{t("analytics.noNotes")}</p>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
