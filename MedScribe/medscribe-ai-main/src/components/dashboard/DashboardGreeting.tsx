"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import { useTranslation } from "@/lib/i18n/context";

interface DashboardGreetingProps {
  displayName: string;
}

export function DashboardGreeting({ displayName }: DashboardGreetingProps) {
  const { t } = useTranslation();

  const hour = new Date().getHours();
  const greeting =
    hour < 12
      ? t("dashboard.greeting.morning")
      : hour < 18
        ? t("dashboard.greeting.afternoon")
        : t("dashboard.greeting.evening");

  return (
    <section className="glass-panel relative overflow-hidden rounded-3xl px-6 py-8 sm:px-8">
      <div className="absolute -right-10 -top-10 h-44 w-44 rounded-full bg-brand-100/60 blur-2xl" />
      <div className="absolute bottom-0 left-1/3 h-24 w-24 rounded-full bg-amber-100/50 blur-2xl" />
      <div className="relative flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-2 inline-flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-brand-700">
            <Sparkles className="h-3.5 w-3.5" />
            {t("dashboard.dailyCommandCenter")}
          </p>
          <h1 className="dashboard-title text-4xl sm:text-5xl">
            {greeting}, {displayName.startsWith("Dr.") ? displayName : `Dr. ${displayName}`}
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-medical-muted sm:text-base">
            {t("dashboard.subtitle")}
          </p>
        </div>
        <Link href="/consultation/new">
          <Button
            size="lg"
            className="rounded-xl bg-brand-700 px-6 text-white hover:bg-brand-800"
          >
            {t("dashboard.startConsultation")}
          </Button>
        </Link>
      </div>
    </section>
  );
}
