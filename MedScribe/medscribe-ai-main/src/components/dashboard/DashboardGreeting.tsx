"use client";

import Link from "next/link";
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
    <section className="surface-elevated px-6 py-8 sm:px-8">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-medical-text sm:text-4xl" suppressHydrationWarning>
            {greeting}, {displayName.startsWith("Dr.") ? displayName : `Dr. ${displayName}`}
          </h1>
          <p className="mt-2 text-sm text-medical-muted sm:text-base">
            {t("dashboard.subtitle")}
          </p>
        </div>
        <Link
          href="/consultation/new"
          className="rounded-xl bg-brand-700 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-800 hover:shadow-md"
        >
          {t("dashboard.startConsultation")}
        </Link>
      </div>
    </section>
  );
}
