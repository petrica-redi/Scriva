"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart3, Clock, Users, TrendingUp, Stethoscope, ArrowUpRight, FileCheck } from "lucide-react";

interface AnalyticsData {
  summary: {
    total_consultations: number;
    total_patients: number;
    ai_generated_notes: number;
    time_saved_minutes: number;
    time_saved_hours: number;
    avg_recording_seconds: number;
    follow_up_compliance: number;
    referrals_sent: number;
  };
  diagnosis_trends: Array<{ code: string; description: string; count: number }>;
  patient_retention: { oneVisit: number; twoToFour: number; fivePlus: number };
  new_vs_returning: { new: number; returning: number };
  weekly_volume: Array<{ week: string; count: number }>;
  visit_type_distribution: Array<{ type: string; count: number }>;
  follow_up_stats: { total: number; completed: number; pending: number; overdue: number };
}

export function AdvancedAnalyticsDashboard() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState(90);

  useEffect(() => {
    fetch(`/api/analytics/advanced?days=${period}`)
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d) setData(d); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [period]);

  if (loading) return <div className="text-sm text-medical-muted">Loading advanced analytics...</div>;
  if (!data) return null;

  const maxVolume = Math.max(...data.weekly_volume.map((w) => w.count), 1);
  const totalRetention = data.patient_retention.oneVisit + data.patient_retention.twoToFour + data.patient_retention.fivePlus;

  return (
    <div className="space-y-4">
      {/* Period Selector */}
      <div className="flex gap-2">
        {[30, 60, 90, 180, 365].map((d) => (
          <button key={d} className={`px-3 py-1 text-xs rounded-full border transition-colors ${period === d ? "bg-brand-50 border-brand-300 text-brand-700" : "border-medical-border text-medical-muted hover:bg-gray-50"}`} onClick={() => setPeriod(d)}>
            {d}d
          </button>
        ))}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-1"><Clock className="w-4 h-4 text-green-500" /><span className="text-xs text-medical-muted">Time Saved</span></div>
            <p className="text-2xl font-bold text-medical-text">{data.summary.time_saved_hours}h</p>
            <p className="text-xs text-medical-muted">{data.summary.ai_generated_notes} AI notes</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-1"><Users className="w-4 h-4 text-blue-500" /><span className="text-xs text-medical-muted">Total Patients</span></div>
            <p className="text-2xl font-bold text-medical-text">{data.summary.total_patients}</p>
            <p className="text-xs text-medical-muted">{data.new_vs_returning.new} new this month</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-1"><FileCheck className="w-4 h-4 text-purple-500" /><span className="text-xs text-medical-muted">Follow-Up Rate</span></div>
            <p className="text-2xl font-bold text-medical-text">{data.summary.follow_up_compliance}%</p>
            <p className="text-xs text-medical-muted">{data.follow_up_stats.overdue} overdue</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-1"><ArrowUpRight className="w-4 h-4 text-orange-500" /><span className="text-xs text-medical-muted">Referrals</span></div>
            <p className="text-2xl font-bold text-medical-text">{data.summary.referrals_sent}</p>
            <p className="text-xs text-medical-muted">sent this period</p>
          </CardContent>
        </Card>
      </div>

      {/* Weekly Volume Chart */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><BarChart3 className="w-4 h-4" /> Weekly Consultation Volume</CardTitle></CardHeader>
        <CardContent>
          <div className="flex items-end gap-1 h-32">
            {data.weekly_volume.slice(-12).map((w, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full bg-brand-200 rounded-t" style={{ height: `${(w.count / maxVolume) * 100}%`, minHeight: w.count > 0 ? "4px" : "0" }} />
                <span className="text-xs text-medical-muted transform -rotate-45 origin-top-left whitespace-nowrap">{w.week.slice(5)}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Diagnosis Trends */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Stethoscope className="w-4 h-4" /> Top Diagnoses</CardTitle></CardHeader>
          <CardContent className="space-y-1.5">
            {data.diagnosis_trends.slice(0, 10).map((d, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-brand-600 w-14">{d.code}</span>
                  <span className="text-medical-text truncate">{d.description}</span>
                </div>
                <Badge variant="secondary">{d.count}</Badge>
              </div>
            ))}
            {data.diagnosis_trends.length === 0 && <p className="text-xs text-medical-muted text-center py-4">No diagnosis data yet</p>}
          </CardContent>
        </Card>

        {/* Patient Retention */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><TrendingUp className="w-4 h-4" /> Patient Retention</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {totalRetention > 0 ? (
              <>
                <div className="flex h-4 rounded-full overflow-hidden bg-gray-100">
                  <div className="bg-red-400" style={{ width: `${(data.patient_retention.oneVisit / totalRetention) * 100}%` }} />
                  <div className="bg-yellow-400" style={{ width: `${(data.patient_retention.twoToFour / totalRetention) * 100}%` }} />
                  <div className="bg-green-400" style={{ width: `${(data.patient_retention.fivePlus / totalRetention) * 100}%` }} />
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div><p className="text-lg font-semibold text-red-600">{data.patient_retention.oneVisit}</p><p className="text-xs text-medical-muted">1 visit</p></div>
                  <div><p className="text-lg font-semibold text-yellow-600">{data.patient_retention.twoToFour}</p><p className="text-xs text-medical-muted">2-4 visits</p></div>
                  <div><p className="text-lg font-semibold text-green-600">{data.patient_retention.fivePlus}</p><p className="text-xs text-medical-muted">5+ visits</p></div>
                </div>
              </>
            ) : (
              <p className="text-xs text-medical-muted text-center py-4">No retention data yet</p>
            )}

            <div className="pt-2 border-t border-medical-border">
              <p className="text-xs font-medium text-medical-text mb-1.5">Visit Types</p>
              {data.visit_type_distribution.slice(0, 5).map((v, i) => (
                <div key={i} className="flex items-center justify-between text-xs py-0.5">
                  <span className="text-medical-muted">{v.type}</span>
                  <span className="font-medium">{v.count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
