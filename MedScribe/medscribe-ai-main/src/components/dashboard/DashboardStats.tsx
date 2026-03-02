"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { formatDateTime } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n/context";
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
} from "lucide-react";
import type { ComponentType, SVGProps } from "react";

type IconComponent = ComponentType<SVGProps<SVGSVGElement> & { className?: string }>;

export interface StatConsultation {
  id: string;
  patient_id: string | null;
  visit_type: string;
  status: string;
  created_at: string;
  patientName: string;
  diagnosis?: string;
  riskStatus?: string;
  pendingActions?: string;
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

interface StatCardConfig {
  key: string;
  title: string;
  value: number;
  tone: string;
  bg: string;
  icon: IconComponent;
  items: StatConsultation[];
  emptyMessage: string;
  linkLabel: string;
  linkHref: (id: string) => string;
}

interface DashboardStatsProps {
  todayCount: number;
  pendingCount: number;
  finalizedCount: number;
  attentionCount: number;
  todayConsultations: StatConsultation[];
  pendingConsultations: StatConsultation[];
  finalizedConsultations: StatConsultation[];
  attentionConsultations: StatConsultation[];
}

export function DashboardStats({
  todayCount,
  pendingCount,
  finalizedCount,
  attentionCount,
  todayConsultations,
  pendingConsultations,
  finalizedConsultations,
  attentionConsultations,
}: DashboardStatsProps) {
  const { t } = useTranslation();
  const [expandedKey, setExpandedKey] = useState<string | null>(null);

  const cards: StatCardConfig[] = [
    {
      key: "today",
      title: t("dashboard.todayConsultations"),
      value: todayCount,
      tone: "text-brand-700",
      bg: "bg-brand-50",
      icon: CalendarClock,
      items: todayConsultations,
      emptyMessage: t("stats.emptyToday"),
      linkLabel: t("stats.open"),
      linkHref: (id) => `/consultation/${id}/note`,
    },
    {
      key: "pending",
      title: t("dashboard.pendingReviews"),
      value: pendingCount,
      tone: "text-amber-700",
      bg: "bg-amber-50",
      icon: ClipboardList,
      items: pendingConsultations,
      emptyMessage: t("stats.emptyPending"),
      linkLabel: t("stats.review"),
      linkHref: (id) => `/consultation/${id}/note`,
    },
    {
      key: "finalized",
      title: t("dashboard.notesFinalized"),
      value: finalizedCount,
      tone: "text-emerald-700",
      bg: "bg-emerald-50",
      icon: CheckCircle2,
      items: finalizedConsultations,
      emptyMessage: t("stats.emptyFinalized"),
      linkLabel: t("stats.view"),
      linkHref: (id) => `/consultation/${id}/note`,
    },
    {
      key: "attention",
      title: t("dashboard.attentionQueue"),
      value: attentionCount,
      tone: "text-rose-700",
      bg: "bg-rose-50",
      icon: AlertTriangle,
      items: attentionConsultations,
      emptyMessage: t("stats.emptyAttention"),
      linkLabel: t("dashboard.openCase"),
      linkHref: (id) => `/consultation/${id}/note`,
    },
  ];

  const expanded = cards.find((c) => c.key === expandedKey) ?? null;

  return (
    <div className="flex flex-col gap-4">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((item, idx) => {
          const Icon = item.icon;
          const isActive = expandedKey === item.key;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() =>
                setExpandedKey(isActive ? null : item.key)
              }
              className="text-left"
            >
              <Card
                className={`elev-card stagger-item border-white/70 transition-all duration-200 cursor-pointer hover:shadow-md ${
                  isActive
                    ? "ring-2 ring-offset-1 ring-brand-400 shadow-lg"
                    : ""
                }`}
                style={{ animationDelay: `${idx * 70}ms` }}
              >
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-semibold text-medical-muted">
                        {item.title}
                      </p>
                      <p className={`mt-1 text-3xl font-bold ${item.tone}`}>
                        {item.value}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className={`rounded-xl p-2.5 ${item.bg}`}>
                        <Icon className={`h-5 w-5 ${item.tone}`} />
                      </div>
                      <ChevronDown
                        className={`h-4 w-4 text-medical-muted transition-transform duration-200 ${
                          isActive ? "rotate-180" : ""
                        }`}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </button>
          );
        })}
      </section>

      {expanded && (
        <Card className="elev-card animate-in fade-in slide-in-from-top-2 duration-200 border-medical-border">
          <div className="border-b border-medical-border px-6 py-4 flex items-center justify-between">
            <h3 className={`font-semibold ${expanded.tone}`}>
              {expanded.title}{" "}
              <span className="text-medical-muted font-normal text-sm">
                ({expanded.items.length}{" "}
                {expanded.items.length !== 1 ? t("stats.items") : t("stats.item")})
              </span>
            </h3>
            <button
              type="button"
              onClick={() => setExpandedKey(null)}
              className="text-xs font-semibold text-medical-muted hover:text-medical-text"
            >
              {t("stats.close")}
            </button>
          </div>
          <div className="p-0">
            {expanded.items.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-medical-border bg-slate-50/80">
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.08em] text-medical-muted">
                        {t("stats.patient")}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.08em] text-medical-muted">
                        {t("stats.visitType")}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.08em] text-medical-muted">
                        Risk Level
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.08em] text-medical-muted">
                        Pending Actions
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.08em] text-medical-muted">
                        {t("stats.date")}
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-[0.08em] text-medical-muted">
                        {t("stats.action")}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-medical-border">
                    {expanded.items.map((item) => (
                      <tr
                        key={item.id}
                        className="transition hover:bg-slate-50/70"
                      >
                        <td className="px-6 py-3">
                          <p className="font-semibold text-medical-text">
                            {item.patientName}
                          </p>
                          {item.diagnosis && (
                            <p className="text-xs text-medical-muted">
                              {item.diagnosis}
                            </p>
                          )}
                        </td>
                        <td className="px-6 py-3 text-medical-muted capitalize">
                          {item.visit_type?.replace(/_/g, " ") || "—"}
                        </td>
                        <td className="px-6 py-3">
                          <RiskBadge risk={item.riskStatus} />
                        </td>
                        <td className="px-6 py-3 text-xs text-medical-muted">
                          {item.pendingActions || "—"}
                        </td>
                        <td className="px-6 py-3 text-xs text-medical-muted">
                          {formatDateTime(item.created_at)}
                        </td>
                        <td className="px-6 py-3 text-right">
                          <Link
                            href={expanded.linkHref(item.id)}
                            className={`inline-flex items-center rounded-lg px-3 py-1.5 text-xs font-semibold text-white transition ${
                              expanded.key === "attention"
                                ? "bg-rose-600 hover:bg-rose-700"
                                : expanded.key === "pending"
                                ? "bg-amber-600 hover:bg-amber-700"
                                : "bg-brand-700 hover:bg-brand-800"
                            }`}
                          >
                            {expanded.linkLabel}
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="px-6 py-10 text-center text-medical-muted">
                {expanded.emptyMessage}
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
