"use client";

import { useState, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n/i18n-context";
import type { Patient } from "@/types";

interface AIResponse {
  response: string;
  loading: boolean;
}

export default function AIAssistantPage() {
  const supabase = useMemo(() => createClient(), []);
  const { t } = useI18n();
  const [query, setQuery] = useState("");
  const [scope, setScope] = useState<"general" | "patient" | "icd">("general");
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [selectedPatientName, setSelectedPatientName] = useState("");
  const [icdCode, setIcdCode] = useState("");
  const [patients, setPatients] = useState<Patient[]>([]);
  const [patientSearch, setPatientSearch] = useState("");
  const [conversation, setConversation] = useState<{ role: "user" | "assistant"; text: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Search patients for selection
  const searchPatients = useCallback(async (search: string) => {
    setPatientSearch(search);
    if (search.length < 2) { setPatients([]); return; }
    try {
      const res = await fetch(`/api/patients?search=${encodeURIComponent(search)}&limit=8`);
      if (res.ok) {
        const json = await res.json();
        setPatients(json.data || []);
      }
    } catch { /* ignore */ }
  }, []);

  const handleAsk = async () => {
    if (!query.trim()) return;
    setError(null);
    setLoading(true);

    const userMessage = query.trim();
    setConversation((prev) => [...prev, { role: "user", text: userMessage }]);
    setQuery("");

    try {
      // Build context based on scope
      let contextInfo = "";
      if (scope === "patient" && selectedPatientId) {
        // Fetch patient consultations for context
        const { data: consultations } = await supabase
          .from("consultations")
          .select("id, visit_type, status, created_at, metadata")
          .eq("patient_id", selectedPatientId)
          .order("created_at", { ascending: false })
          .limit(10);

        const { data: notes } = await supabase
          .from("clinical_notes")
          .select("sections, billing_codes, status, created_at")
          .in("consultation_id", (consultations || []).map((c: any) => c.id))
          .order("created_at", { ascending: false })
          .limit(5);

        contextInfo = `\n\nPatient Context - ${selectedPatientName}:\n` +
          `Consultations: ${consultations?.length || 0}\n` +
          (notes || []).map((n: any) =>
            `Note (${n.status}): ${((n.sections as { title: string; content: string }[]) || []).map((s: any) => `${s.title}: ${s.content.substring(0, 200)}`).join("; ")}`
          ).join("\n");
      } else if (scope === "icd" && icdCode) {
        contextInfo = `\n\nFocus on ICD-10 code: ${icdCode}. Provide clinical information about this diagnosis code, including typical presentation, workup, management, and coding guidelines.`;
      }

      const res = await fetch("/api/ai/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: userMessage, context: contextInfo }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "AI request failed");
      }

      const data = await res.json();
      setConversation((prev) => [...prev, { role: "assistant", text: data.response }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to get AI response");
      setConversation((prev) => prev.slice(0, -1)); // remove the user message on failure
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    if (conversation.length === 0) return;
    const text = conversation.map((m) => `[${m.role === "user" ? "You" : "AI Assistant"}]\n${m.text}`).join("\n\n---\n\n");
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ai-assistant-${new Date().toISOString().split("T")[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col gap-6 p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-medical-text">{t('ai.title')}</h1>
          <p className="text-sm text-medical-muted mt-1">{t('ai.subtitle')}</p>
        </div>
        {conversation.length > 0 && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleExport}>{t('ai.exportConversation')}</Button>
            <Button variant="outline" size="sm" onClick={() => setConversation([])}>{t('ai.clear')}</Button>
          </div>
        )}
      </div>

      {/* Scope Selector */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex gap-2">
            {[
              { key: "general" as const, label: t('ai.generalQuery'), desc: t('ai.generalDesc') },
              { key: "patient" as const, label: t('ai.patientSpecific'), desc: t('ai.patientDesc') },
              { key: "icd" as const, label: t('ai.icdLookup'), desc: t('ai.icdDesc') },
            ].map((s) => (
              <button
                key={s.key}
                onClick={() => setScope(s.key)}
                className={`flex-1 rounded-lg border-2 p-3 text-left transition ${
                  scope === s.key ? "border-brand-500 bg-brand-50" : "border-medical-border hover:border-gray-300"
                }`}
              >
                <p className={`text-sm font-medium ${scope === s.key ? "text-brand-700" : "text-medical-text"}`}>{s.label}</p>
                <p className="text-xs text-medical-muted mt-0.5">{s.desc}</p>
              </button>
            ))}
          </div>

          {/* Patient Selector */}
          {scope === "patient" && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-medical-text">Select Patient</label>
              <input
                type="text"
                value={patientSearch}
                onChange={(e) => searchPatients(e.target.value)}
                placeholder="Search by patient name or MRN..."
                className="w-full rounded-lg border border-medical-border px-4 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
              {patients.length > 0 && (
                <div className="rounded-lg border border-medical-border bg-white max-h-40 overflow-y-auto">
                  {patients.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => { setSelectedPatientId(p.id); setSelectedPatientName(p.full_name); setPatients([]); setPatientSearch(p.full_name); }}
                      className={`w-full px-4 py-2 text-left text-sm hover:bg-blue-50 transition ${selectedPatientId === p.id ? "bg-blue-50 font-medium" : ""}`}
                    >
                      {p.full_name} {p.mrn && <span className="text-xs text-medical-muted">MRN: {p.mrn}</span>}
                    </button>
                  ))}
                </div>
              )}
              {selectedPatientId && (
                <p className="text-xs text-green-600 font-medium">Selected: {selectedPatientName}</p>
              )}
            </div>
          )}

          {/* ICD Code Input */}
          {scope === "icd" && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-medical-text">ICD-10 Code or Disease Name</label>
              <input
                type="text"
                value={icdCode}
                onChange={(e) => setIcdCode(e.target.value)}
                placeholder="e.g. J06.9, F32.1, or 'Major Depressive Disorder'"
                className="w-full rounded-lg border border-medical-border px-4 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Conversation */}
      <Card className="flex-1">
        <CardContent className="pt-6">
          <div className="min-h-[300px] max-h-[500px] overflow-y-auto space-y-4 mb-4">
            {conversation.length === 0 ? (
              <div className="text-center py-12">
                <div className="flex justify-center mb-4">
                  <div className="h-12 w-12 rounded-full bg-indigo-100 flex items-center justify-center">
                    <svg className="h-6 w-6 text-indigo-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" />
                    </svg>
                  </div>
                </div>
                <p className="text-medical-text font-medium">{t('ai.howCanIHelp')}</p>
                <p className="text-sm text-medical-muted mt-1">{t('ai.askClinicalQuestions')}</p>
                
                {/* General Suggested Prompts */}
                <p className="text-xs font-semibold text-medical-muted uppercase tracking-wide mt-4 mb-2">{t('ai.suggestedPrompts')}</p>
                <div className="flex flex-wrap justify-center gap-2">
                  {[
                    t('ai.prompt.differentialChestPain'),
                    t('ai.prompt.hypertension'),
                    t('ai.prompt.warfarin'),
                  ].map((q) => (
                    <button key={q} onClick={() => setQuery(q)} className="rounded-full border border-medical-border bg-white px-3 py-1.5 text-xs text-medical-muted hover:bg-blue-50 hover:text-blue-600 transition">
                      {q}
                    </button>
                  ))}
                </div>

                {/* Psychiatric Prompts */}
                <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wide mt-4 mb-2">🧠 {t('mental.psychiatricEval')}</p>
                <div className="flex flex-wrap justify-center gap-2">
                  {[
                    t('ai.prompt.suicideRisk'),
                    t('ai.prompt.ssriTaper'),
                    t('ai.prompt.psychoticEpisode'),
                    t('ai.prompt.anxietyTreatment'),
                    t('ai.prompt.substanceScreening'),
                    t('ai.prompt.moodStabilizers'),
                  ].map((q) => (
                    <button key={q} onClick={() => setQuery(q)} className="rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs text-indigo-600 hover:bg-indigo-100 transition">
                      {q}
                    </button>
                  ))}
                </div>

                {/* Risk Assessment Templates */}
                <p className="text-xs font-semibold text-red-600 uppercase tracking-wide mt-4 mb-2">📋 {t('ai.riskAssessment')}</p>
                <div className="flex flex-wrap justify-center gap-2">
                  {[
                    t('ai.prompt.phq9'),
                    t('ai.prompt.gad7'),
                    t('ai.prompt.cssrs'),
                  ].map((q) => (
                    <button key={q} onClick={() => setQuery(q)} className="rounded-full border border-red-200 bg-red-50 px-3 py-1.5 text-xs text-red-600 hover:bg-red-100 transition">
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              conversation.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${
                    msg.role === "user"
                      ? "bg-blue-500 text-white rounded-br-md"
                      : "bg-gray-100 text-medical-text rounded-bl-md"
                  }`}>
                    <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                  </div>
                </div>
              ))
            )}
            {loading && (
              <div className="flex justify-start">
                <div className="rounded-2xl bg-gray-100 px-4 py-3 rounded-bl-md">
                  <div className="flex gap-1">
                    {[0, 1, 2].map((i) => (
                      <div key={i} className="h-2 w-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-2 mb-3 text-xs text-red-700">{error}</div>
          )}

          {/* Input */}
          <div className="flex gap-3">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleAsk()}
              placeholder={t('ai.askPlaceholder')}
              className="flex-1 rounded-lg border border-medical-border px-4 py-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              disabled={loading}
            />
            <Button onClick={handleAsk} disabled={loading || !query.trim()}>
              {loading ? t('ai.thinking') : t('ai.ask')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
