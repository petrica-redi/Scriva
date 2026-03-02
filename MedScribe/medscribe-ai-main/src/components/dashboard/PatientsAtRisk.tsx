"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslation } from "@/lib/i18n/context";

export interface RiskPatient {
  id: string;
  patientName: string;
  mrn: string;
  diagnosis: string;
  icd10: string;
  riskLevel: "high" | "medium";
  riskSignals: { label: string; severity: "critical" | "high" | "medium" | "low" }[];
}

interface PatientsAtRiskProps {
  patients: RiskPatient[];
}

export function PatientsAtRisk({ patients }: PatientsAtRiskProps) {
  const { t } = useTranslation();

  if (patients.length === 0) return null;

  const displayPatients = patients.slice(0, 6);
  const highCount = patients.filter((p) => p.riskLevel === "high").length;
  const mediumCount = patients.filter((p) => p.riskLevel === "medium").length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">⚠️</span>
            <CardTitle>Patients at Risk</CardTitle>
          </div>
          <div className="flex gap-2">
            {highCount > 0 && (
              <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium bg-red-100 text-red-700">
                <span className="h-2 w-2 rounded-full bg-red-500" />
                {highCount} High
              </span>
            )}
            {mediumCount > 0 && (
              <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium bg-orange-100 text-orange-700">
                <span className="h-2 w-2 rounded-full bg-orange-500" />
                {mediumCount} Medium
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
                <th className="px-3 py-2 text-left font-semibold text-medical-muted">MRN</th>
                <th className="px-3 py-2 text-left font-semibold text-medical-muted">Diagnosis</th>
                <th className="px-3 py-2 text-left font-semibold text-medical-muted">ICD-10</th>
                <th className="px-3 py-2 text-left font-semibold text-medical-muted">Risk</th>
                <th className="px-3 py-2 text-left font-semibold text-medical-muted">Risk Signals</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-medical-border">
              {displayPatients.map((patient) => (
                <tr key={patient.id} className="hover:bg-gray-50 transition">
                  <td className="px-3 py-2 font-medium text-medical-text">
                    <Link href={`/patients/${patient.id}`} className="hover:text-brand-600 hover:underline">
                      {patient.patientName}
                    </Link>
                  </td>
                  <td className="px-3 py-2 font-mono text-medical-muted">{patient.mrn}</td>
                  <td className="px-3 py-2 text-medical-muted">{patient.diagnosis}</td>
                  <td className="px-3 py-2 font-mono text-medical-muted">{patient.icd10}</td>
                  <td className="px-3 py-2">
                    {patient.riskLevel === "high" ? (
                      <span className="text-red-600 font-medium">High</span>
                    ) : (
                      <span className="text-amber-600 font-medium">Medium</span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-1">
                      {patient.riskSignals.map((signal, i) => (
                        <span
                          key={i}
                          className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] ${
                            signal.severity === "critical"
                              ? "bg-red-100 text-red-700"
                              : signal.severity === "high"
                                ? "bg-orange-100 text-orange-700"
                                : signal.severity === "medium"
                                  ? "bg-yellow-100 text-yellow-700"
                                  : "bg-green-100 text-green-700"
                          }`}
                        >
                          {signal.label}
                        </span>
                      ))}
                    </div>
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
