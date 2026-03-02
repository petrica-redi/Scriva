"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { useTranslation } from "@/lib/i18n/context";
import { Calendar } from "lucide-react";

interface ScheduleItem {
  id: string;
  visit_type: string;
  status: string;
  created_at: string;
  patientName: string;
  patientCode: string;
  diagnosis: string;
}

interface TodayScheduleProps {
  items: ScheduleItem[];
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
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
                    {t("table.status")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-medical-border">
                {displayItems.map((item) => (
                  <tr key={item.id} className="transition hover:bg-slate-50/70">
                    <td className="px-4 py-3">
                      <span className="font-semibold text-medical-text text-sm">
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
                      <StatusBadge status={item.status} />
                    </td>
                    {/* Day column removed */}
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
