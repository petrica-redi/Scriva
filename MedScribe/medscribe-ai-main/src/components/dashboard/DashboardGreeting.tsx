"use client";

import Link from "next/link";
import { useTranslation } from "@/lib/i18n/context";
import { Mic, Video, Clock, Calendar } from "lucide-react";

interface DashboardGreetingProps {
  displayName: string;
}

export function DashboardGreeting({ displayName }: DashboardGreetingProps) {
  const { t } = useTranslation();

  const now = new Date();
  const hour = now.getHours();
  const greeting =
    hour < 12
      ? t("dashboard.greeting.morning")
      : hour < 18
        ? t("dashboard.greeting.afternoon")
        : t("dashboard.greeting.evening");

  const timeStr = now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false });
  const dateStr = now.toLocaleDateString("en-GB", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });
  const doctorName = displayName.startsWith("Dr.") ? displayName : `Dr. ${displayName}`;

  return (
    <section className="overflow-hidden rounded-2xl bg-gradient-to-br from-[#0d1b2a] via-[#0f2233] to-[#0a1f1f] px-6 py-7 sm:px-8 sm:py-8">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">

        {/* Left: greeting + time */}
        <div className="flex-1">
          <div className="mb-1 flex items-center gap-2 text-teal-400/70">
            <Clock className="h-3.5 w-3.5" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.18em]" suppressHydrationWarning>
              {timeStr} · {dateStr}
            </span>
          </div>
          <h1
            className="text-2xl font-bold tracking-tight text-white sm:text-3xl"
            suppressHydrationWarning
          >
            {greeting}, {doctorName}
          </h1>
          <p className="mt-1.5 text-sm text-slate-400">
            {t("dashboard.subtitle")}
          </p>
        </div>

        {/* Right: quick-start actions */}
        <div className="flex flex-col gap-2 sm:min-w-[220px]">
          <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            Start consultation
          </p>

          {/* In-person consultation */}
          <Link
            href="/consultation/new?mode=inperson"
            className="group flex items-center gap-3 rounded-xl bg-teal-500 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-teal-500/30 transition-all hover:bg-teal-400 hover:shadow-teal-400/40 hover:scale-[1.02] active:scale-[0.99]"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/20">
              <Mic className="h-4 w-4" />
            </div>
            <div className="text-left">
              <p className="leading-tight">In-Person</p>
              <p className="text-[10px] font-normal text-teal-100/80">Microphone only</p>
            </div>
          </Link>

          {/* Remote consultation */}
          <Link
            href="/consultation/new?mode=remote"
            className="group flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white/80 backdrop-blur-sm transition-all hover:bg-white/10 hover:text-white hover:scale-[1.02] active:scale-[0.99]"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/10">
              <Video className="h-4 w-4" />
            </div>
            <div className="text-left">
              <p className="leading-tight">Remote via Meet</p>
              <p className="text-[10px] font-normal text-slate-400">Google Meet + AI</p>
            </div>
          </Link>

          {/* Schedule */}
          <Link
            href="/calendar"
            className="flex items-center gap-2 rounded-xl px-3 py-2 text-[12px] text-slate-500 transition hover:text-slate-300"
          >
            <Calendar className="h-3.5 w-3.5" />
            View today&apos;s schedule
          </Link>
        </div>
      </div>
    </section>
  );
}
