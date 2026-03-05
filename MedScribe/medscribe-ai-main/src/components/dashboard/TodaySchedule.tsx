"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslation } from "@/lib/i18n/context";
import { translateVisitType } from "@/lib/i18n/visitTypes";
import { Calendar, FileText, ClipboardList, CheckSquare } from "lucide-react";

interface DocumentRef {
  id: string;
  type: string;
  title: string;
}

interface ScheduleItem {
  id: string;
  patient_id?: string | null;
  visit_type: string;
  status?: string;
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
  const { t } = useTranslation();
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
      ? t("risk.high")
      : level === "medium"
        ? t("risk.medium")
        : level === "low"
          ? t("risk.low")
          : t("risk.normal");
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${styles}`}>
      {label}
    </span>
  );
}

function PendingActionLinks({
  consultationId,
  status,
}: {
  consultationId: string;
  status: string;
}) {
  const { t } = useTranslation();
  const needsFill = status === "scheduled" || status === "recording" || status === "transcribed";
  const needsValidate = status === "transcribed" || status === "note_generated";
  const needsSubmit = status === "reviewed";
  const allDone = status === "finalized";

  if (allDone) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600">
        <CheckSquare className="h-3 w-3" />
        {t("actions.allCompleted")}
      </span>
    );
  }

  const actions: { show: boolean; href: string; icon: typeof FileText; label: string; color: string }[] = [
    {
      show: needsFill,
      href: `/consultation/${consultationId}/note`,
      icon: FileText,
      label: t("actions.fillForms"),
      color: "text-brand-700 hover:text-brand-900",
    },
    {
      show: needsValidate,
      href: `/consultation/${consultationId}/note`,
      icon: ClipboardList,
      label: t("actions.validateForms"),
      color: "text-amber-700 hover:text-amber-900",
    },
    {
      show: needsSubmit,
      href: `/consultation/${consultationId}/note`,
      icon: CheckSquare,
      label: t("actions.submitForms"),
      color: "text-emerald-700 hover:text-emerald-900",
    },
  ];

  const visible = actions.filter((a) => a.show);

  if (visible.length === 0) {
    return <span className="text-xs text-medical-muted">—</span>;
  }

  return (
    <div className="flex flex-col gap-1">
      {visible.map((action) => {
        const Icon = action.icon;
        return (
          <Link
            key={action.label}
            href={action.href}
            className={`inline-flex items-center gap-1 text-xs font-medium hover:underline ${action.color}`}
          >
            <Icon className="h-3 w-3" />
            {action.label}
          </Link>
        );
      })}
    </div>
  );
}

export function TodaySchedule({ items }: TodayScheduleProps) {
  const { t } = useTranslation();

  const displayItems = items.slice(0, 8);

  return (
    <Card className="elev-card">
      <CardHeader className="flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-brand-700" />
          <CardTitle>{t("dashboard.todaysCalendar")}</CardTitle>
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
                    {t("table.time")}
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
                        {item.patient_id ? (
                          <Link href={`/patients/${item.patient_id}`} className="hover:text-brand-600 hover:underline">
                            {item.patientName}
                          </Link>
                        ) : (
                          item.patientName
                        )}
                      </p>
                      <p className="text-xs text-medical-muted">
                        {translateVisitType(item.visit_type, t)}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-xs text-medical-muted">
                      {item.diagnosis || t("common.undocumented")}
                    </td>
                    <td className="px-4 py-3">
                      <RiskBadge risk={item.riskStatus} />
                    </td>
                    <td className="px-4 py-3">
                      {item.consultationId ? (
                        <PendingActionLinks
                          consultationId={item.consultationId}
                          status={item.status || "scheduled"}
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
