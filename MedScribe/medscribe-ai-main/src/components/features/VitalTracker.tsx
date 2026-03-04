"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Activity, TrendingUp, TrendingDown, Minus, Plus } from "lucide-react";

interface VitalReading {
  id: string;
  reading_type: string;
  value: number;
  unit: string;
  secondary_value: number | null;
  secondary_unit: string | null;
  recorded_at: string;
  is_abnormal: boolean;
  device_type: string;
}

interface VitalTrend {
  avg: number;
  min: number;
  max: number;
  trend: string;
  latest: number;
}

interface VitalTrackerProps {
  patientId: string;
  compact?: boolean;
}

const READING_TYPES = [
  { value: "systolic_bp", label: "Systolic BP", unit: "mmHg" },
  { value: "diastolic_bp", label: "Diastolic BP", unit: "mmHg" },
  { value: "heart_rate", label: "Heart Rate", unit: "bpm" },
  { value: "temperature", label: "Temperature", unit: "°C" },
  { value: "spo2", label: "SpO2", unit: "%" },
  { value: "blood_glucose", label: "Blood Glucose", unit: "mg/dL" },
  { value: "weight", label: "Weight", unit: "kg" },
  { value: "respiratory_rate", label: "Respiratory Rate", unit: "/min" },
];

const TrendIcon = ({ trend }: { trend: string }) => {
  if (trend === "increasing") return <TrendingUp className="w-3.5 h-3.5 text-orange-500" />;
  if (trend === "decreasing") return <TrendingDown className="w-3.5 h-3.5 text-blue-500" />;
  return <Minus className="w-3.5 h-3.5 text-green-500" />;
};

export function VitalTracker({ patientId, compact = false }: VitalTrackerProps) {
  const [readings, setReadings] = useState<VitalReading[]>([]);
  const [trends, setTrends] = useState<Record<string, VitalTrend>>({});
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newReading, setNewReading] = useState({ reading_type: "systolic_bp", value: "", device_type: "manual" });

  const fetchVitals = useCallback(async () => {
    const response = await fetch(`/api/vitals?patient_id=${patientId}`);
    if (response.ok) {
      const data = await response.json();
      setReadings(data.data);
      setTrends(data.trends);
    }
    setLoading(false);
  }, [patientId]);

  useEffect(() => { fetchVitals(); }, [fetchVitals]);

  const addReading = async () => {
    if (!newReading.value) return;
    const typeInfo = READING_TYPES.find((t) => t.value === newReading.reading_type);
    await fetch("/api/vitals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        patient_id: patientId,
        reading_type: newReading.reading_type,
        value: parseFloat(newReading.value),
        unit: typeInfo?.unit || "",
        device_type: newReading.device_type,
      }),
    });
    setShowAdd(false);
    setNewReading({ reading_type: "systolic_bp", value: "", device_type: "manual" });
    fetchVitals();
  };

  if (loading) return <Card><CardContent className="p-4"><p className="text-sm text-medical-muted">Loading vitals...</p></CardContent></Card>;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Activity className="w-4 h-4 text-green-600" />
            Vital Signs {Object.keys(trends).length > 0 && <Badge variant="secondary">{Object.keys(trends).length} tracked</Badge>}
          </CardTitle>
          <Button size="sm" variant="outline" onClick={() => setShowAdd(!showAdd)}>
            <Plus className="w-3 h-3 mr-1" /> Record
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 pt-0">
        {showAdd && (
          <div className="p-3 border border-brand-200 rounded-lg space-y-2 bg-brand-50/30">
            <div className="flex gap-2">
              <select value={newReading.reading_type} onChange={(e) => setNewReading({ ...newReading, reading_type: e.target.value })} className="border rounded px-2 text-sm flex-1">
                {READING_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label} ({t.unit})</option>)}
              </select>
              <Input type="number" placeholder="Value" value={newReading.value} onChange={(e) => setNewReading({ ...newReading, value: e.target.value })} className="w-24" />
            </div>
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="ghost" onClick={() => setShowAdd(false)}>Cancel</Button>
              <Button size="sm" onClick={addReading}>Save</Button>
            </div>
          </div>
        )}

        {/* Trend Summary */}
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(trends).slice(0, compact ? 4 : 8).map(([type, trend]) => {
            const typeInfo = READING_TYPES.find((t) => t.value === type);
            return (
              <div key={type} className={`p-2.5 rounded-lg border ${trend.latest && (READING_TYPES.find((t) => t.value === type) ? false : false) ? "border-red-200 bg-red-50" : "border-medical-border"}`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-medical-muted">{typeInfo?.label || type}</span>
                  <TrendIcon trend={trend.trend} />
                </div>
                <p className="text-lg font-semibold text-medical-text">{trend.latest} <span className="text-xs font-normal text-medical-muted">{typeInfo?.unit}</span></p>
                <p className="text-xs text-medical-muted">Avg: {trend.avg} | Range: {trend.min}-{trend.max}</p>
              </div>
            );
          })}
        </div>

        {Object.keys(trends).length === 0 && (
          <p className="text-xs text-medical-muted text-center py-4">No vital readings recorded yet</p>
        )}
      </CardContent>
    </Card>
  );
}
