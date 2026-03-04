"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ClipboardList, Plus, Trash2, GripVertical, ExternalLink, Copy } from "lucide-react";

interface IntakeQuestion {
  id: string;
  text: string;
  type: "text" | "textarea" | "select" | "multiselect" | "boolean" | "number" | "date" | "scale";
  options?: string[];
  required: boolean;
  order: number;
}

interface IntakeForm {
  id: string;
  name: string;
  form_type: string;
  questions: IntakeQuestion[];
  is_active: boolean;
  created_at: string;
}

export function IntakeFormBuilder() {
  const [forms, setForms] = useState<IntakeForm[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingForm, setEditingForm] = useState<{ name: string; form_type: string; questions: IntakeQuestion[] } | null>(null);

  useEffect(() => {
    fetch("/api/intake/forms")
      .then((r) => r.ok ? r.json() : { data: [] })
      .then((data) => setForms(data.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const addQuestion = () => {
    if (!editingForm) return;
    const newQ: IntakeQuestion = {
      id: crypto.randomUUID(),
      text: "",
      type: "text",
      required: false,
      order: editingForm.questions.length + 1,
    };
    setEditingForm({ ...editingForm, questions: [...editingForm.questions, newQ] });
  };

  const updateQuestion = (id: string, updates: Partial<IntakeQuestion>) => {
    if (!editingForm) return;
    setEditingForm({
      ...editingForm,
      questions: editingForm.questions.map((q) => q.id === id ? { ...q, ...updates } : q),
    });
  };

  const removeQuestion = (id: string) => {
    if (!editingForm) return;
    setEditingForm({
      ...editingForm,
      questions: editingForm.questions.filter((q) => q.id !== id),
    });
  };

  const saveForm = async () => {
    if (!editingForm || !editingForm.name) return;
    const response = await fetch("/api/intake/forms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editingForm),
    });
    if (response.ok) {
      const form = await response.json();
      setForms([form, ...forms]);
      setEditingForm(null);
    }
  };

  const copyShareLink = (formId: string) => {
    const link = `${window.location.origin}/intake/${formId}`;
    navigator.clipboard.writeText(link);
  };

  if (loading) return <Card><CardContent className="p-4"><p className="text-sm text-medical-muted">Loading forms...</p></CardContent></Card>;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-brand-600" />
            Intake Forms
          </CardTitle>
          <Button size="sm" onClick={() => setEditingForm({ name: "", form_type: "pre_visit", questions: [] })}>
            <Plus className="w-3 h-3 mr-1" /> New Form
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {editingForm && (
          <div className="p-4 border-2 border-brand-200 rounded-lg space-y-3 bg-brand-50/30">
            <Input placeholder="Form name" value={editingForm.name} onChange={(e) => setEditingForm({ ...editingForm, name: e.target.value })} />
            <select value={editingForm.form_type} onChange={(e) => setEditingForm({ ...editingForm, form_type: e.target.value })} className="w-full border rounded-md px-3 py-2 text-sm">
              <option value="pre_visit">Pre-Visit</option>
              <option value="new_patient">New Patient</option>
              <option value="follow_up">Follow-Up</option>
              <option value="screening">Screening</option>
              <option value="custom">Custom</option>
            </select>

            <div className="space-y-2">
              {editingForm.questions.map((q, i) => (
                <div key={q.id} className="flex items-start gap-2 p-2.5 bg-white dark:bg-gray-800 rounded border border-medical-border">
                  <GripVertical className="w-4 h-4 text-medical-muted mt-2 shrink-0 cursor-grab" />
                  <div className="flex-1 space-y-1.5">
                    <Input placeholder="Question text" value={q.text} onChange={(e) => updateQuestion(q.id, { text: e.target.value })} />
                    <div className="flex gap-2">
                      <select value={q.type} onChange={(e) => updateQuestion(q.id, { type: e.target.value as IntakeQuestion["type"] })} className="border rounded px-2 py-1 text-xs">
                        <option value="text">Short Text</option>
                        <option value="textarea">Long Text</option>
                        <option value="select">Dropdown</option>
                        <option value="boolean">Yes/No</option>
                        <option value="number">Number</option>
                        <option value="date">Date</option>
                        <option value="scale">Scale (1-10)</option>
                      </select>
                      <label className="flex items-center gap-1 text-xs">
                        <input type="checkbox" checked={q.required} onChange={(e) => updateQuestion(q.id, { required: e.target.checked })} />
                        Required
                      </label>
                    </div>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => removeQuestion(q.id)}>
                    <Trash2 className="w-3.5 h-3.5 text-red-400" />
                  </Button>
                </div>
              ))}
            </div>

            <Button size="sm" variant="outline" onClick={addQuestion} className="w-full">
              <Plus className="w-3 h-3 mr-1" /> Add Question
            </Button>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button variant="ghost" onClick={() => setEditingForm(null)}>Cancel</Button>
              <Button onClick={saveForm} disabled={!editingForm.name || editingForm.questions.length === 0}>Save Form</Button>
            </div>
          </div>
        )}

        {forms.length === 0 && !editingForm && (
          <p className="text-sm text-medical-muted text-center py-6">No intake forms yet. Create one to streamline patient intake.</p>
        )}

        {forms.map((form) => (
          <div key={form.id} className="flex items-center justify-between p-3 border border-medical-border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">
            <div>
              <p className="text-sm font-medium text-medical-text">{form.name}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <Badge variant="secondary" className="text-xs">{form.form_type.replace("_", " ")}</Badge>
                <span className="text-xs text-medical-muted">{form.questions.length} questions</span>
              </div>
            </div>
            <div className="flex gap-1">
              <Button size="sm" variant="ghost" onClick={() => copyShareLink(form.id)} title="Copy share link">
                <Copy className="w-3.5 h-3.5" />
              </Button>
              <Button size="sm" variant="ghost" onClick={() => window.open(`/intake/${form.id}`, "_blank")} title="Preview">
                <ExternalLink className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
