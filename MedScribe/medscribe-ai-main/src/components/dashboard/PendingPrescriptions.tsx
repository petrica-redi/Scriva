"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText } from "lucide-react";

export interface PendingPrescription {
  id: string;
  patientName: string;
  mrn: string;
  medication: string;
  dosage: string;
  expiresIn: number; // days until expiry (negative = overdue)
  status: "overdue" | "urgent" | "upcoming";
  lastRefill?: string;
}

interface PendingPrescriptionsProps {
  prescriptions: PendingPrescription[];
}

const statusStyles: Record<string, { badge: string; text: string }> = {
  overdue: { badge: "bg-red-100 text-red-700", text: "Overdue" },
  urgent: { badge: "bg-orange-100 text-orange-700", text: "Expiring soon" },
  upcoming: { badge: "bg-yellow-100 text-yellow-700", text: "Due soon" },
};

export function PendingPrescriptions({ prescriptions }: PendingPrescriptionsProps) {
  if (prescriptions.length === 0) return null;

  const overdueCount = prescriptions.filter((p) => p.status === "overdue").length;
  const urgentCount = prescriptions.filter((p) => p.status === "urgent").length;

  return (
    <Card>
      <CardHeader className="pb-2 pt-4 px-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-amber-600" />
            <CardTitle className="text-sm">Pending Prescriptions</CardTitle>
          </div>
          <div className="flex gap-2">
            {overdueCount > 0 && (
              <span className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-medium bg-red-100 text-red-700">
                <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                {overdueCount} Overdue
              </span>
            )}
            {urgentCount > 0 && (
              <span className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-medium bg-orange-100 text-orange-700">
                <span className="h-1.5 w-1.5 rounded-full bg-orange-500" />
                {urgentCount} Urgent
              </span>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-medical-border bg-gray-50">
                <th className="px-3 py-2 text-left font-semibold text-medical-muted">Patient</th>
                <th className="px-3 py-2 text-left font-semibold text-medical-muted">Medication</th>
                <th className="px-3 py-2 text-left font-semibold text-medical-muted">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-medical-border">
              {prescriptions.slice(0, 6).map((rx) => (
                <tr key={rx.id} className="hover:bg-gray-50 transition">
                  <td className="px-3 py-2">
                    <span className="font-medium text-medical-text">{rx.patientName}</span>
                  </td>
                  <td className="px-3 py-2">
                    <p className="font-medium text-medical-text">{rx.medication}</p>
                    <p className="text-[10px] text-medical-muted">{rx.dosage}</p>
                  </td>
                  <td className="px-3 py-2">
                    <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] font-medium ${statusStyles[rx.status].badge}`}>
                      {rx.expiresIn < 0
                        ? `${Math.abs(rx.expiresIn)}d overdue`
                        : rx.expiresIn === 0
                          ? "Today"
                          : `${rx.expiresIn}d left`
                      }
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
