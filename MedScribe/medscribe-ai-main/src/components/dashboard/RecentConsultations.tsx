"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/utils";
import { Activity } from "lucide-react";
import { useTranslation } from "@/lib/i18n/context";

interface ConsultationItem {
  id: string;
  visit_type: string;
  status: string;
  created_at: string;
  patientName: string;
}

interface RecentConsultationsProps {
  items: ConsultationItem[];
}

export function RecentConsultations({ items }: RecentConsultationsProps) {
  const { t } = useTranslation();

  return (
    <Card className="elev-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-brand-700" />
          {t("dashboard.recentConsultations")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {items.length > 0 ? (
          items.map((consultation) => (
            <div
              key={consultation.id}
              className="rounded-xl border border-medical-border/70 bg-white px-4 py-3 transition hover:border-brand-200 hover:bg-brand-50/30"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <Link
                    href={`/consultation/${consultation.id}/note`}
                    className="font-semibold text-medical-text hover:text-brand-700"
                  >
                    {consultation.patientName}
                  </Link>
                  <p className="mt-1 text-xs text-medical-muted">
                    {consultation.visit_type} &bull;{" "}
                    {formatDateTime(consultation.created_at)}
                  </p>
                </div>
                <StatusBadge status={consultation.status} />
              </div>
            </div>
          ))
        ) : (
          <div className="py-8 text-center text-medical-muted">
            {t("dashboard.noConsultationsYet")}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
