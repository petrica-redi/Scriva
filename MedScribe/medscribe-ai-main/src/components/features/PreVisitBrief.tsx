"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Pill, AlertCircle, Activity, Calendar, Clock } from "lucide-react";

interface PreVisitBriefProps {
  patientId: string;
}

interface Brief {
  patient: { name: string; age: number | null; gender: string | null; mrn: string | null };
  lastVisit: { date: string; visit_type: string; summary: string } | null;
  activeMedications: Array<{ name: string; dosage: string; since: string }>;
  pendingFollowUps: Array<{ title: string; due_date: string; type: string }>;
  recentVitals: Array<{ type: string; value: number; unit: string; date: string; abnormal: boolean }>;
  riskFactors: string[];
  recentAlerts: Array<{ title: string; severity: string }>;
}

export function PreVisitBrief({ patientId }: PreVisitBriefProps) {
  const [brief, setBrief] = useState<Brief | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!patientId) return;

    fetch(`/api/ai/pre-visit-brief?patient_id=${patientId}`)
      .then((r) => r.ok ? r.json() : null)
      .then((data) => { if (data) setBrief(data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [patientId]);

  if (loading) {
    return (
      <Card className="border-brand-200 animate-pulse">
        <CardContent className="p-4">
          <div className="h-4 bg-gray-200 rounded w-1/3 mb-2" />
          <div className="h-3 bg-gray-200 rounded w-2/3" />
        </CardContent>
      </Card>
    );
  }

  if (!brief) return null;

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  };

  return (
    <Card className="border-brand-200 bg-gradient-to-r from-brand-50/50 to-transparent">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <FileText className="w-4 h-4 text-brand-600" />
          Pre-Visit Intelligence Brief
        </CardTitle>
        <p className="text-xs text-medical-muted">
          {brief.patient.name} {brief.patient.age ? `(${brief.patient.age}y, ${brief.patient.gender || "Unknown"})` : ""} {brief.patient.mrn ? `MRN: ${brief.patient.mrn}` : ""}
        </p>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        {/* Last Visit */}
        {brief.lastVisit && (
          <div className="flex items-start gap-2 p-2 bg-white dark:bg-gray-800 rounded border border-medical-border">
            <Clock className="w-4 h-4 text-medical-muted mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-medium text-medical-text">Last Visit: {formatDate(brief.lastVisit.date)}</p>
              <p className="text-xs text-medical-muted">{brief.lastVisit.visit_type} - {brief.lastVisit.summary}</p>
            </div>
          </div>
        )}

        {/* Active Medications */}
        {brief.activeMedications.length > 0 && (
          <div className="p-2 bg-white dark:bg-gray-800 rounded border border-medical-border">
            <div className="flex items-center gap-1.5 mb-1.5">
              <Pill className="w-3.5 h-3.5 text-blue-500" />
              <span className="text-xs font-medium text-medical-text">Active Medications ({brief.activeMedications.length})</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {brief.activeMedications.map((med, i) => (
                <Badge key={i} variant="secondary" className="text-xs">{med.name} {med.dosage}</Badge>
              ))}
            </div>
          </div>
        )}

        {/* Recent Vitals */}
        {brief.recentVitals.length > 0 && (
          <div className="p-2 bg-white dark:bg-gray-800 rounded border border-medical-border">
            <div className="flex items-center gap-1.5 mb-1.5">
              <Activity className="w-3.5 h-3.5 text-green-500" />
              <span className="text-xs font-medium text-medical-text">Recent Vitals</span>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {brief.recentVitals.slice(0, 6).map((v, i) => (
                <div key={i} className={`text-xs p-1.5 rounded ${v.abnormal ? "bg-red-50 text-red-700" : "bg-gray-50 text-medical-muted"}`}>
                  <span className="font-medium">{v.type}:</span> {v.value} {v.unit}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Pending Follow-Ups */}
        {brief.pendingFollowUps.length > 0 && (
          <div className="p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded border border-yellow-200">
            <div className="flex items-center gap-1.5 mb-1.5">
              <Calendar className="w-3.5 h-3.5 text-yellow-600" />
              <span className="text-xs font-medium text-yellow-800">Pending Follow-Ups ({brief.pendingFollowUps.length})</span>
            </div>
            {brief.pendingFollowUps.slice(0, 3).map((f, i) => (
              <p key={i} className="text-xs text-yellow-700">{f.title} - due {formatDate(f.due_date)}</p>
            ))}
          </div>
        )}

        {/* Risk Factors & Alerts */}
        {(brief.riskFactors.length > 0 || brief.recentAlerts.length > 0) && (
          <div className="p-2 bg-red-50 dark:bg-red-900/20 rounded border border-red-200">
            <div className="flex items-center gap-1.5 mb-1.5">
              <AlertCircle className="w-3.5 h-3.5 text-red-500" />
              <span className="text-xs font-medium text-red-800">Alerts & Risk Factors</span>
            </div>
            {brief.riskFactors.map((r, i) => (
              <Badge key={i} className="text-xs bg-red-100 text-red-700 mr-1 mb-1">{r}</Badge>
            ))}
            {brief.recentAlerts.map((a, i) => (
              <p key={i} className="text-xs text-red-700">{a.title}</p>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
