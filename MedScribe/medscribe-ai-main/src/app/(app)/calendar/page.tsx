"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/utils";
import Link from "next/link";
import { useTranslation } from "@/lib/i18n/context";

interface CalendarConsultation {
  id: string;
  visit_type: string;
  status: string;
  created_at: string;
  metadata: Record<string, unknown>;
  patientName: string;
}

export default function CalendarPage() {
  const supabase = createClient();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [consultations, setConsultations] = useState<CalendarConsultation[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"month" | "week" | "day">("week");
  const { t, locale } = useTranslation();

  const dateLocale = locale === "ro" ? "ro-RO" : "en-US";
  const viewLabels: Record<string, string> = { day: t("calendar.day"), week: t("calendar.week"), month: t("calendar.month") };

  const startOfWeek = (d: Date) => {
    const date = new Date(d);
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    date.setDate(diff);
    date.setHours(0, 0, 0, 0);
    return date;
  };

  const fetchConsultations = useCallback(async () => {
    setLoading(true);
    try {
      let start: Date, end: Date;
      if (viewMode === "month") {
        start = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        end = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0, 23, 59, 59);
      } else if (viewMode === "week") {
        start = startOfWeek(currentDate);
        end = new Date(start);
        end.setDate(end.getDate() + 6);
        end.setHours(23, 59, 59);
      } else {
        start = new Date(currentDate);
        start.setHours(0, 0, 0, 0);
        end = new Date(currentDate);
        end.setHours(23, 59, 59);
      }

      const { data } = await supabase
        .from("consultations")
        .select("id, visit_type, status, created_at, metadata")
        .gte("created_at", start.toISOString())
        .lte("created_at", end.toISOString())
        .order("created_at", { ascending: true });

      setConsultations(
        (data || []).map((c) => ({
          ...c,
          patientName: (c.metadata as Record<string, unknown>)?.patient_name as string || "Unnamed Patient",
        }))
      );
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [currentDate, viewMode, supabase]);

  useEffect(() => { fetchConsultations(); }, [fetchConsultations]);

  const navigate = (dir: number) => {
    const d = new Date(currentDate);
    if (viewMode === "month") d.setMonth(d.getMonth() + dir);
    else if (viewMode === "week") d.setDate(d.getDate() + dir * 7);
    else d.setDate(d.getDate() + dir);
    setCurrentDate(d);
  };

  const getWeekDays = () => {
    const start = startOfWeek(currentDate);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      return d;
    });
  };

  const getMonthDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const offset = firstDay === 0 ? 6 : firstDay - 1;
    const days: (Date | null)[] = [];
    for (let i = 0; i < offset; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(new Date(year, month, i));
    return days;
  };

  const getConsultationsForDay = (d: Date) => {
    const ds = d.toISOString().split("T")[0];
    return consultations.filter((c) => c.created_at.startsWith(ds));
  };

  const isToday = (d: Date) => {
    const t = new Date();
    return d.getDate() === t.getDate() && d.getMonth() === t.getMonth() && d.getFullYear() === t.getFullYear();
  };

  const headerLabel = viewMode === "month"
    ? currentDate.toLocaleDateString(dateLocale, { month: "long", year: "numeric" })
    : viewMode === "week"
      ? `${t("calendar.weekOf")} ${startOfWeek(currentDate).toLocaleDateString(dateLocale, { month: "short", day: "numeric" })} — ${(() => { const e = new Date(startOfWeek(currentDate)); e.setDate(e.getDate() + 6); return e.toLocaleDateString(dateLocale, { month: "short", day: "numeric", year: "numeric" }); })()}`
      : currentDate.toLocaleDateString(dateLocale, { weekday: "long", month: "long", day: "numeric", year: "numeric" });

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-medical-text">{t("calendar.title")}</h1>
          <p className="text-sm text-medical-muted mt-1">{t("calendar.subtitle")}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())}>{t("calendar.today")}</Button>
          <Link href="/consultation/new"><Button size="sm">{t("calendar.newConsultation")}</Button></Link>
        </div>
      </div>

      {/* Navigation + View Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 rounded-lg hover:bg-gray-100 transition">
            <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" /></svg>
          </button>
          <h2 className="text-lg font-semibold text-medical-text min-w-[260px] text-center">{headerLabel}</h2>
          <button onClick={() => navigate(1)} className="p-2 rounded-lg hover:bg-gray-100 transition">
            <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" /></svg>
          </button>
        </div>
        <div className="flex rounded-lg border border-medical-border overflow-hidden">
          {(["day", "week", "month"] as const).map((m) => (
            <button key={m} onClick={() => setViewMode(m)} className={`px-4 py-1.5 text-xs font-medium capitalize transition ${viewMode === m ? "bg-blue-500 text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}>{viewLabels[m] || m}</button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="py-12 text-center text-medical-muted">{t("calendar.loadingSchedule")}</div>
      ) : viewMode === "month" ? (
        /* Month View */
        <Card>
          <CardContent className="p-0">
            <div className="grid grid-cols-7 border-b border-medical-border">
              {[t("calendar.mon"), t("calendar.tue"), t("calendar.wed"), t("calendar.thu"), t("calendar.fri"), t("calendar.sat"), t("calendar.sun")].map((d) => (
                <div key={d} className="px-2 py-3 text-center text-xs font-semibold text-medical-muted uppercase">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {getMonthDays().map((day, i) => {
                const dayConsultations = day ? getConsultationsForDay(day) : [];
                return (
                  <div key={i} className={`min-h-[90px] border-b border-r border-medical-border p-1.5 ${day && isToday(day) ? "bg-blue-50" : ""} ${!day ? "bg-gray-50" : ""}`}>
                    {day && (
                      <>
                        <p className={`text-xs font-medium mb-1 ${isToday(day) ? "text-blue-600" : "text-medical-text"}`}>{day.getDate()}</p>
                        {dayConsultations.slice(0, 2).map((c) => (
                          <Link key={c.id} href={`/consultation/${c.id}/note`} className="block mb-0.5 rounded bg-blue-100 px-1.5 py-0.5 text-[10px] text-blue-800 truncate hover:bg-blue-200 transition">
                            {c.patientName}
                          </Link>
                        ))}
                        {dayConsultations.length > 2 && <p className="text-[10px] text-medical-muted">+{dayConsultations.length - 2} {t("calendar.more")}</p>}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ) : viewMode === "week" ? (
        /* Week View */
        <div className="grid grid-cols-7 gap-3">
          {getWeekDays().map((day) => {
            const dayConsultations = getConsultationsForDay(day);
            return (
              <Card key={day.toISOString()} className={isToday(day) ? "ring-2 ring-blue-400" : ""}>
                <CardHeader className="pb-2 pt-4 px-3">
                  <p className={`text-xs font-semibold uppercase ${isToday(day) ? "text-blue-600" : "text-medical-muted"}`}>
                    {day.toLocaleDateString(dateLocale, { weekday: "short" })}
                  </p>
                  <p className={`text-lg font-bold ${isToday(day) ? "text-blue-600" : "text-medical-text"}`}>{day.getDate()}</p>
                </CardHeader>
                <CardContent className="px-3 pb-3 space-y-1.5">
                  {dayConsultations.length === 0 ? (
                    <p className="text-[10px] text-medical-muted italic">{t("calendar.noConsultations")}</p>
                  ) : dayConsultations.map((c) => (
                    <Link key={c.id} href={`/consultation/${c.id}/note`} className="block rounded-lg border border-medical-border bg-white p-2 hover:bg-blue-50 transition">
                      <p className="text-xs font-medium text-medical-text truncate">{c.patientName}</p>
                      <p className="text-[10px] text-medical-muted">{c.visit_type}</p>
                      <StatusBadge status={c.status} />
                    </Link>
                  ))}
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        /* Day View */
        <Card>
          <CardHeader><CardTitle>{t("calendar.scheduleFor")} {currentDate.toLocaleDateString(dateLocale, { weekday: "long", month: "long", day: "numeric" })}</CardTitle></CardHeader>
          <CardContent>
            {consultations.length === 0 ? (
              <div className="py-8 text-center text-medical-muted">
                <p>{t("calendar.noScheduled")}</p>
                <Link href="/consultation/new" className="mt-2 inline-block text-sm text-brand-600 hover:underline">{t("calendar.startNew")}</Link>
              </div>
            ) : (
              <div className="divide-y divide-medical-border">
                {consultations.map((c) => (
                  <div key={c.id} className="flex items-center justify-between py-4">
                    <div className="flex-1">
                      <Link href={`/consultation/${c.id}/note`} className="font-medium text-medical-text hover:text-brand-600">{c.patientName}</Link>
                      <p className="text-sm text-medical-muted">{c.visit_type} &middot; {formatDateTime(c.created_at)}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <StatusBadge status={c.status} />
                      <Link href={`/consultation/${c.id}/note`} className="text-sm text-brand-600 hover:underline">{t("common.view")}</Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
