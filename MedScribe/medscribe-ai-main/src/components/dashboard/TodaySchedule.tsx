"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslation } from "@/lib/i18n/context";
import { Calendar, FileText, ClipboardList, CheckSquare } from "lucide-react";

interface DocumentRef {
  id: string;
  type: string;
  title: string;
}

interface ScheduleItem {
  id: string;
  visit_type: string;
  created_at: string;
  patientName: string;
  patientCode: string;
  diagnosis: string;
  riskStatus?: string;
  pendingActions?: string;
  isNewPatient?: boolean;
  consultationId?: string;
  documents?: DocumentRef[];
}

interface TodayScheduleProps {
  items: ScheduleItem[];
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  const h = d.getHours();
  const m = d.getMinutes().toString().padStart(2, "0");
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12.toString().padStart(2, "0")}:${m} ${ampm}`;
}

function RiskBadge({ risk }: { risk?: string }) {
  const level = (risk || "normal").toLowerCase();
  const styles =
    level === "high" || level === "critical"
      ? "bg-red-100 text-red-700"
      : level === "medium"
        ? "bg-amber-100 text-amber-700"
        : level === "low"
          ? "bg-emerald-100 text-emerald-700"
          : "bg-slate-100 text-slate-600";
  const label =
    level === "high" || level === "critical"
      ? "High"
      : level === "medium"
        ? "Medium"
        : level === "low"
          ? "Low"
          : "Normal";
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${styles}`}>
      {label}
    </span>
  );
}

function formatDay(dateStr: string): string {
  const d = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dateObj = new Date(d);
  dateObj.setHours(0, 0, 0, 0);

  if (dateObj.getTime() === today.getTime()) return "Today";
  if (dateObj.getTime() === tomorrow.getTime()) return "Tomorrow";
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

function PendingActionLinks({
  consultationId,
  documents,
}: {
  consultationId: string;
  documents: DocumentRef[];
}) {
  const noteDoc = documents.find(
    (d) => d.type === "clinical_note" || d.type === "progress_note"
  );
  const formDoc = documents.find(
    (d) => d.type === "referral_letter" || d.type === "discharge_summary"
  );

  return (
    <div className="flex flex-col gap-1">
      <Link
        href={`/consultation/${consultationId}/note`}
        className="inline-flex items-center gap-1 text-xs font-medium text-brand-700 hover:text-brand-900 hover:underline"
      >
        <FileText className="h-3 w-3" />
        Complete form
      </Link>
      <Link
        href={
          noteDoc
            ? `/api/documents?consultation_id=${consultationId}`
            : `/consultation/${consultationId}/note`
        }
        className="inline-flex items-center gap-1 text-xs font-medium text-brand-700 hover:text-brand-900 hover:underline"
      >
        <ClipboardList className="h-3 w-3" />
        Fill forms
      </Link>
      <Link
        href={
          formDoc
            ? `/consultation/${consultationId}/note`
            : `/consultation/${consultationId}/note`
        }
        className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 hover:text-emerald-900 hover:underline"
      >
        <CheckSquare className="h-3 w-3" />
        Validate & submit
      </Link>
    </div>
  );
}

export function TodaySchedule({ items }: TodayScheduleProps) {
  const { t } = useTranslation();

  // Limit to 8 items max (2-day schedule)
  const displayItems = items.slice(0, 8);

  return (
    <Card className="elev-card">
      <CardHeader className="flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-brand-700" />
          <CardTitle>Today&apos;s Calendar</CardTitle>
        </div>
        <Link
          href="/calendar"
          className="text-xs font-semibold uppercase tracking-[0.12em] text-brand-700 hover:underline"
        >
          {t("dashboard.openCalendar")}
        </Link>
      </CardHeader>
      <CardContent className="p-0">
        {items.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-medical-border bg-slate-50/80">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.08em] text-medical-muted">
                    Time
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.08em] text-medical-muted">
                    {t("table.patient")}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.08em] text-medical-muted">
                    {t("table.diagnosis")}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.08em] text-medical-muted">
                    {t("table.riskLevel")}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.08em] text-medical-muted">
                    {t("table.pendingActions")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-medical-border">
                {displayItems.map((item) => (
                  <tr key={item.id} className="transition hover:bg-slate-50/70">
                    <td className="px-4 py-3">
                      <span className="font-semibold text-medical-text text-sm" suppressHydrationWarning>
                        {formatTime(item.created_at)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-medical-text">
                        {item.patientName}
                      </p>
                      <p className="text-xs text-medical-muted">
                        {item.visit_type}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-xs text-medical-muted">
                      {item.diagnosis}
                    </td>
                    <td className="px-4 py-3">
                      <RiskBadge risk={item.riskStatus} />
                    </td>
                    <td className="px-4 py-3">
                      {item.consultationId ? (
                        <PendingActionLinks
                          consultationId={item.consultationId}
                          documents={item.documents || []}
                        />
                      ) : (
                        <span className="text-xs text-medical-muted">
                          {item.pendingActions || "—"}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="px-6 py-10 text-center text-medical-muted">
            <p>{t("dashboard.noConsultationsToday")}</p>
            <Link
              href="/consultation/new"
              className="mt-2 inline-block text-sm font-semibold text-brand-700 hover:underline"
            >
              {t("dashboard.startOneNow")}
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
