"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, CheckCircle2, AlertCircle, Plus, AlarmClockOff } from "lucide-react";

interface FollowUp {
  id: string;
  patient_id: string;
  type: string;
  title: string;
  description: string | null;
  due_date: string;
  priority: string;
  status: string;
  auto_generated: boolean;
}

interface FollowUpManagerProps {
  patientId?: string;
  compact?: boolean;
}

const priorityColors: Record<string, string> = {
  urgent: "bg-red-100 text-red-800",
  high: "bg-orange-100 text-orange-800",
  medium: "bg-yellow-100 text-yellow-800",
  low: "bg-blue-100 text-blue-800",
};

const statusIcons: Record<string, typeof CheckCircle2> = {
  pending: Clock,
  overdue: AlertCircle,
  completed: CheckCircle2,
};

export function FollowUpManager({ patientId, compact = false }: FollowUpManagerProps) {
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newFollowUp, setNewFollowUp] = useState({ title: "", type: "appointment", due_date: "", priority: "medium" });

  const fetchFollowUps = useCallback(async () => {
    const params = new URLSearchParams();
    if (patientId) params.set("patient_id", patientId);

    const response = await fetch(`/api/follow-ups?${params}`);
    if (response.ok) {
      const { data } = await response.json();
      setFollowUps(data);
    }
    setLoading(false);
  }, [patientId]);

  useEffect(() => { fetchFollowUps(); }, [fetchFollowUps]);

  const completeFollowUp = async (id: string) => {
    await fetch("/api/follow-ups", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status: "completed" }),
    });
    fetchFollowUps();
  };

  const snoozeFollowUp = async (id: string) => {
    const snoozeDate = new Date();
    snoozeDate.setDate(snoozeDate.getDate() + 7);
    await fetch("/api/follow-ups", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, snoozed_until: snoozeDate.toISOString().split("T")[0] }),
    });
    fetchFollowUps();
  };

  const addFollowUp = async () => {
    if (!newFollowUp.title || !newFollowUp.due_date) return;
    await fetch("/api/follow-ups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...newFollowUp, patient_id: patientId }),
    });
    setShowAdd(false);
    setNewFollowUp({ title: "", type: "appointment", due_date: "", priority: "medium" });
    fetchFollowUps();
  };

  const formatDate = (d: string) => new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  const isOverdue = (d: string) => new Date(d) < new Date();

  if (loading) return <Card><CardContent className="p-4"><p className="text-sm text-medical-muted">Loading follow-ups...</p></CardContent></Card>;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Calendar className="w-4 h-4 text-brand-600" />
            Follow-Up Queue {followUps.length > 0 && <Badge variant="secondary">{followUps.length}</Badge>}
          </CardTitle>
          <Button size="sm" variant="outline" onClick={() => setShowAdd(!showAdd)}>
            <Plus className="w-3 h-3 mr-1" /> Add
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 pt-0">
        {showAdd && (
          <div className="p-3 border border-brand-200 rounded-lg space-y-2 bg-brand-50/30">
            <Input placeholder="Follow-up title..." value={newFollowUp.title} onChange={(e) => setNewFollowUp({ ...newFollowUp, title: e.target.value })} />
            <div className="flex gap-2">
              <Input type="date" value={newFollowUp.due_date} onChange={(e) => setNewFollowUp({ ...newFollowUp, due_date: e.target.value })} className="flex-1" />
              <select value={newFollowUp.type} onChange={(e) => setNewFollowUp({ ...newFollowUp, type: e.target.value })} className="border rounded px-2 text-sm">
                <option value="appointment">Appointment</option>
                <option value="lab_review">Lab Review</option>
                <option value="medication_check">Medication Check</option>
                <option value="screening">Screening</option>
                <option value="referral_outcome">Referral Outcome</option>
                <option value="symptom_check">Symptom Check</option>
                <option value="custom">Custom</option>
              </select>
            </div>
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="ghost" onClick={() => setShowAdd(false)}>Cancel</Button>
              <Button size="sm" onClick={addFollowUp}>Save</Button>
            </div>
          </div>
        )}

        {followUps.length === 0 ? (
          <p className="text-xs text-medical-muted text-center py-4">No pending follow-ups</p>
        ) : (
          followUps.slice(0, compact ? 5 : undefined).map((f) => {
            const StatusIcon = statusIcons[f.status] || Clock;
            return (
              <div key={f.id} className={`flex items-start justify-between p-2.5 rounded-lg border ${isOverdue(f.due_date) && f.status !== "completed" ? "border-red-200 bg-red-50 dark:bg-red-900/10" : "border-medical-border"}`}>
                <div className="flex items-start gap-2">
                  <StatusIcon className={`w-4 h-4 mt-0.5 ${f.status === "overdue" ? "text-red-500" : f.status === "completed" ? "text-green-500" : "text-medical-muted"}`} />
                  <div>
                    <p className="text-sm font-medium text-medical-text">{f.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-medical-muted">Due {formatDate(f.due_date)}</span>
                      <Badge className={`text-xs ${priorityColors[f.priority]}`}>{f.priority}</Badge>
                      {f.auto_generated && <Badge variant="outline" className="text-xs">AI</Badge>}
                    </div>
                  </div>
                </div>
                {f.status !== "completed" && (
                  <div className="flex gap-1 shrink-0">
                    <Button size="sm" variant="ghost" onClick={() => snoozeFollowUp(f.id)} title="Snooze 7 days">
                      <AlarmClockOff className="w-3.5 h-3.5" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => completeFollowUp(f.id)} title="Mark complete">
                      <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                    </Button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
