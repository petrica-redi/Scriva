"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, FileText, Pill, FlaskConical, Phone } from "lucide-react";
import { useTranslation } from "@/lib/i18n/context";

export interface FollowUpItem {
  id: string;
  type: "review" | "prescription" | "lab" | "callback" | "note";
  patientName: string;
  severity: "critical" | "high" | "medium";
  title: string;
  detail: string;
  actionLabel?: string;
  actionHref?: string;
}

interface PriorityQueueProps {
  items: FollowUpItem[];
}

const typeIcons: Record<string, React.ReactNode> = {
  review: <FileText className="h-3.5 w-3.5" />,
  prescription: <Pill className="h-3.5 w-3.5" />,
  lab: <FlaskConical className="h-3.5 w-3.5" />,
  callback: <Phone className="h-3.5 w-3.5" />,
  note: <FileText className="h-3.5 w-3.5" />,
};

const severityStyles: Record<string, string> = {
  critical: "border-red-200 bg-red-50",
  high: "border-orange-200 bg-orange-50",
  medium: "border-yellow-200 bg-yellow-50",
};

const severityBadge: Record<string, string> = {
  critical: "bg-red-100 text-red-700",
  high: "bg-orange-100 text-orange-700",
  medium: "bg-yellow-100 text-yellow-700",
};

const typeLabels: Record<string, string> = {
  review: "Review",
  prescription: "Rx",
  lab: "Lab",
  callback: "Callback",
  note: "Note",
};

export function PriorityQueue({ items }: PriorityQueueProps) {
  const { t } = useTranslation();

  if (items.length === 0) return null;

  return (
    <Card className="elev-card border-rose-200 bg-gradient-to-r from-rose-50/80 to-white">
      <CardHeader className="pb-1 pt-3 px-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-rose-800 text-sm">
            <AlertTriangle className="h-4 w-4" />
            Priority Follow-up Queue
          </CardTitle>
          <span className="text-[10px] text-medical-muted">{items.length} items</span>
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-3 pt-1 space-y-1.5">
        {items.map((item) => (
          <div
            key={item.id}
            className={`flex items-center gap-3 rounded-lg border px-3 py-2 ${severityStyles[item.severity]}`}
          >
            <div className="shrink-0 opacity-70">
              {typeIcons[item.type]}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-xs text-medical-text">{item.patientName}</span>
                <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] font-medium ${severityBadge[item.severity]}`}>
                  {typeLabels[item.type]}
                </span>
              </div>
              <p className="text-[10px] text-medical-muted mt-0.5">{item.detail}</p>
            </div>
            <Link
              href={item.actionHref || "#"}
              className="shrink-0 rounded-md bg-rose-600 px-2.5 py-1 text-[10px] font-semibold text-white transition hover:bg-rose-700"
            >
              Open Case
            </Link>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
