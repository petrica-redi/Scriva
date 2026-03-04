"use client";

import { useState, useEffect, use } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ClipboardList, Send, CheckCircle2 } from "lucide-react";

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
  description: string | null;
  form_type: string;
  questions: IntakeQuestion[];
}

export default function IntakePage({ params }: { params: Promise<{ formId: string }> }) {
  const { formId } = use(params);
  const [form, setForm] = useState<IntakeForm | null>(null);
  const [responses, setResponses] = useState<Record<string, unknown>>({});
  const [respondentName, setRespondentName] = useState("");
  const [respondentEmail, setRespondentEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/intake/forms`)
      .then((r) => r.ok ? r.json() : { data: [] })
      .then((data) => {
        const found = (data.data || []).find((f: IntakeForm) => f.id === formId);
        if (found) setForm(found);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [formId]);

  const handleSubmit = async () => {
    if (!form) return;
    setSubmitting(true);

    await fetch("/api/intake/responses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        form_id: formId,
        respondent_name: respondentName,
        respondent_email: respondentEmail,
        responses,
      }),
    });

    setSubmitted(true);
    setSubmitting(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-medical-muted">Loading form...</p>
      </div>
    );
  }

  if (!form) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="max-w-md w-full"><CardContent className="p-8 text-center">
          <p className="text-medical-muted">Form not found or no longer available.</p>
        </CardContent></Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="max-w-md w-full"><CardContent className="p-8 text-center">
          <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-3" />
          <h2 className="text-lg font-semibold text-medical-text mb-1">Thank you!</h2>
          <p className="text-sm text-medical-muted">Your responses have been submitted. Your healthcare provider will review them before your visit.</p>
        </CardContent></Card>
      </div>
    );
  }

  const renderQuestion = (q: IntakeQuestion) => {
    switch (q.type) {
      case "textarea":
        return <textarea className="w-full p-2 border border-medical-border rounded-md text-sm resize-none" rows={3} value={(responses[q.id] as string) || ""} onChange={(e) => setResponses({ ...responses, [q.id]: e.target.value })} />;
      case "boolean":
        return (
          <div className="flex gap-3">
            {["Yes", "No"].map((opt) => (
              <button key={opt} className={`px-4 py-2 rounded-md border text-sm transition-colors ${responses[q.id] === opt ? "bg-brand-50 border-brand-300 text-brand-700" : "border-medical-border hover:bg-gray-50"}`} onClick={() => setResponses({ ...responses, [q.id]: opt })}>
                {opt}
              </button>
            ))}
          </div>
        );
      case "select":
        return (
          <select className="w-full p-2 border border-medical-border rounded-md text-sm" value={(responses[q.id] as string) || ""} onChange={(e) => setResponses({ ...responses, [q.id]: e.target.value })}>
            <option value="">Select...</option>
            {(q.options || []).map((opt) => <option key={opt} value={opt}>{opt}</option>)}
          </select>
        );
      case "scale":
        return (
          <div className="flex gap-1">
            {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
              <button key={n} className={`w-8 h-8 rounded text-sm font-medium transition-colors ${responses[q.id] === n ? "bg-brand-600 text-white" : "border border-medical-border hover:bg-gray-50"}`} onClick={() => setResponses({ ...responses, [q.id]: n })}>
                {n}
              </button>
            ))}
          </div>
        );
      case "number":
        return <Input type="number" value={(responses[q.id] as string) || ""} onChange={(e) => setResponses({ ...responses, [q.id]: e.target.value })} />;
      case "date":
        return <Input type="date" value={(responses[q.id] as string) || ""} onChange={(e) => setResponses({ ...responses, [q.id]: e.target.value })} />;
      default:
        return <Input value={(responses[q.id] as string) || ""} onChange={(e) => setResponses({ ...responses, [q.id]: e.target.value })} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-brand-600" />
              {form.name}
            </CardTitle>
            {form.description && <p className="text-sm text-medical-muted">{form.description}</p>}
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-medical-text">Your Name</label>
                <Input className="mt-1" value={respondentName} onChange={(e) => setRespondentName(e.target.value)} placeholder="Full name" />
              </div>
              <div>
                <label className="text-sm font-medium text-medical-text">Your Email</label>
                <Input className="mt-1" type="email" value={respondentEmail} onChange={(e) => setRespondentEmail(e.target.value)} placeholder="Email address" />
              </div>
            </div>

            <div className="border-t border-medical-border pt-4 space-y-4">
              {form.questions.sort((a, b) => a.order - b.order).map((q) => (
                <div key={q.id}>
                  <label className="text-sm font-medium text-medical-text">
                    {q.text} {q.required && <span className="text-red-500">*</span>}
                  </label>
                  <div className="mt-1.5">{renderQuestion(q)}</div>
                </div>
              ))}
            </div>

            <Button onClick={handleSubmit} disabled={submitting} className="w-full" size="lg">
              <Send className="w-4 h-4 mr-2" />
              {submitting ? "Submitting..." : "Submit Responses"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
