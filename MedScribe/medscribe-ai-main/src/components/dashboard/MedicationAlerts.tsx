"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Pill, FlaskConical, AlertCircle, TriangleAlert } from "lucide-react";

export interface MedicationAlert {
  id: string;
  patientName: string;
  mrn: string;
  type: "lab_due" | "interaction" | "renewal" | "monitoring";
  severity: "critical" | "high" | "medium";
  title: string;
  detail: string;
  dueDate?: string;
  daysPast?: number;
}

interface MedicationAlertsProps {
  alerts: MedicationAlert[];
}

const typeIcons: Record<string, React.ReactNode> = {
  lab_due: <FlaskConical className="h-3.5 w-3.5" />,
  interaction: <TriangleAlert className="h-3.5 w-3.5" />,
  renewal: <Pill className="h-3.5 w-3.5" />,
  monitoring: <AlertCircle className="h-3.5 w-3.5" />,
};

const typeLabels: Record<string, string> = {
  lab_due: "Lab Due",
  interaction: "Interaction",
  renewal: "Renewal",
  monitoring: "Monitoring",
};

const severityStyles: Record<string, string> = {
  critical: "bg-red-100 text-red-700 border-red-200",
  high: "bg-orange-100 text-orange-700 border-orange-200",
  medium: "bg-yellow-100 text-yellow-700 border-yellow-200",
};

const severityDot: Record<string, string> = {
  critical: "bg-red-500",
  high: "bg-orange-500",
  medium: "bg-yellow-500",
};

export function MedicationAlerts({ alerts }: MedicationAlertsProps) {
  if (alerts.length === 0) return null;

  const criticalCount = alerts.filter((a) => a.severity === "critical").length;
  const highCount = alerts.filter((a) => a.severity === "high").length;

  return (
    <Card>
      <CardHeader className="pb-2 pt-4 px-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Pill className="h-5 w-5 text-violet-600" />
            <CardTitle className="text-sm">Medication Alerts</CardTitle>
          </div>
          <div className="flex gap-2">
            {criticalCount > 0 && (
              <span className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-medium bg-red-100 text-red-700">
                <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                {criticalCount} Critical
              </span>
            )}
            {highCount > 0 && (
              <span className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-medium bg-orange-100 text-orange-700">
                <span className="h-1.5 w-1.5 rounded-full bg-orange-500" />
                {highCount} High
              </span>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-3 pt-1">
        <div className="space-y-1.5">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className={`flex items-start gap-3 rounded-lg border px-3 py-2 ${severityStyles[alert.severity]}`}
            >
              <div className="mt-0.5 shrink-0">
                {typeIcons[alert.type]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-xs">{alert.patientName}</span>
                  <span className="font-mono text-[10px] opacity-60">{alert.mrn}</span>
                </div>
                <p className="text-xs font-medium mt-0.5">{alert.title}</p>
                <p className="text-[10px] opacity-75 mt-0.5">{alert.detail}</p>
              </div>
              <div className="shrink-0 text-right">
                <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] font-medium ${severityStyles[alert.severity]}`}>
                  {typeLabels[alert.type]}
                </span>
                {alert.dueDate && (
                  <p className="text-[9px] mt-0.5 opacity-60">{alert.dueDate}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
