"use client";

import { useState, useCallback, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useTranslation } from "@/lib/i18n/context";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { Patient } from "@/types";

type ScopeKey = "general" | "patient" | "icd";

interface ChatMessage {
  role: "user" | "assistant";
  text: string;
}

interface ProviderStatus {
  anthropicConfigured: boolean;
  openaiConfigured: boolean;
  geminiConfigured: boolean;
  anthropicReachable: boolean;
  openaiReachable: boolean;
  geminiReachable: boolean;
  primary: "anthropic" | "openai" | "gemini" | null;
  fallbacks: ("anthropic" | "openai" | "gemini")[];
}

function getEmptyConversations(): Record<ScopeKey, ChatMessage[]> {
  return { general: [], patient: [], icd: [] };
}

export default function AIAssistantPage() {
  const supabase = createClient();
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const [scope, setScope] = useState<ScopeKey>("general");
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [selectedPatientName, setSelectedPatientName] = useState("");
  const [icdCode, setIcdCode] = useState("");
  const [patients, setPatients] = useState<Patient[]>([]);
  const [patientSearch, setPatientSearch] = useState("");
  const [conversationsByScope, setConversationsByScope] = useState<Record<ScopeKey, ChatMessage[]>>(getEmptyConversations());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [providerStatus, setProviderStatus] = useState<ProviderStatus | null>(null);

  const conversation = conversationsByScope[scope] ?? [];

  useEffect(() => {
    fetch("/api/ai/provider-status")
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => setProviderStatus(json))
      .catch(() => setProviderStatus(null));
  }, []);

  const searchPatients = useCallback(async (search: string) => {
    setPatientSearch(search);
    if (search.length < 2) {
      setPatients([]);
      return;
    }
    try {
      const res = await fetch(`/api/patients?search=${encodeURIComponent(search)}&limit=8`);
      if (res.ok) {
        const json = await res.json();
        setPatients(json.data || []);
      }
    } catch {
      // ignore
    }
  }, []);

  const handleAsk = async () => {
    if (!query.trim()) return;
    setError(null);
    setLoading(true);

    const userMessage = query.trim();
    const activeScope = scope;
    setConversationsByScope((prev) => ({
      ...prev,
      [activeScope]: [...(prev[activeScope] ?? []), { role: "user", text: userMessage }],
    }));
    setQuery("");

    try {
      let contextInfo = "";
      if (activeScope === "patient" && selectedPatientId) {
        const { data: consultations } = await supabase
          .from("consultations")
          .select("id, visit_type, status, created_at, metadata")
          .eq("patient_id", selectedPatientId)
          .order("created_at", { ascending: false })
          .limit(10);

        const { data: notes } = await supabase
          .from("clinical_notes")
          .select("sections, billing_codes, status, created_at")
          .in("consultation_id", (consultations || []).map((c) => c.id))
          .order("created_at", { ascending: false })
          .limit(5);

        contextInfo =
          `\n\nPatient Context - ${selectedPatientName}:\n` +
          `Consultations: ${consultations?.length || 0}\n` +
          (notes || [])
            .map(
              (n) =>
                `Note (${n.status}): ${
                  ((n.sections as { title: string; content: string }[]) || [])
                    .map((s) => `${s.title}: ${s.content.substring(0, 200)}`)
                    .join("; ")
                }`
            )
            .join("\n");
      } else if (activeScope === "icd" && icdCode) {
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
      setConversationsByScope((prev) => ({
        ...prev,
        [activeScope]: [...(prev[activeScope] ?? []), { role: "assistant", text: data.response }],
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to get AI response");
      setConversationsByScope((prev) => ({
        ...prev,
        [activeScope]: (prev[activeScope] ?? []).slice(0, -1),
      }));
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    if (conversation.length === 0) return;
    const text = conversation
      .map((m) => `[${m.role === "user" ? "You" : "AI Assistant"}]\n${m.text}`)
      .join("\n\n---\n\n");
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ai-assistant-${scope}-${new Date().toISOString().split("T")[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleClearCurrentChat = () => {
    setConversationsByScope((prev) => ({ ...prev, [scope]: [] }));
  };

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-medical-text">{t("ai.title")}</h1>
          <p className="mt-1 text-sm text-medical-muted">{t("ai.subtitle")}</p>
          {providerStatus && (
            <p className="mt-2 text-xs text-medical-muted">
              Powered by <span className="font-medium text-medical-text">MedScribe</span>
            </p>
          )}
        </div>
        {conversation.length > 0 && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleExport}>{t("ai.exportConversation")}</Button>
            <Button variant="outline" size="sm" onClick={handleClearCurrentChat}>{t("ai.clear")}</Button>
          </div>
        )}
      </div>

      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="flex gap-2">
            {[
              { key: "general" as const, label: t("ai.generalQuery"), desc: t("ai.generalDesc") },
              { key: "patient" as const, label: t("ai.patientSpecific"), desc: t("ai.patientDesc") },
              { key: "icd" as const, label: t("ai.icdLookup"), desc: t("ai.icdDesc") },
            ].map((s) => (
              <button
                key={s.key}
                onClick={() => setScope(s.key)}
                className={`flex-1 rounded-lg border-2 p-3 text-left transition ${
                  scope === s.key ? "border-brand-500 bg-brand-50" : "border-medical-border hover:border-gray-300"
                }`}
              >
                <p className={`text-sm font-medium ${scope === s.key ? "text-brand-700" : "text-medical-text"}`}>{s.label}</p>
                <p className="mt-0.5 text-xs text-medical-muted">{s.desc}</p>
              </button>
            ))}
          </div>

          {scope === "patient" && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-medical-text">{t("ai.selectPatient")}</label>
              <input
                type="text"
                value={patientSearch}
                onChange={(e) => searchPatients(e.target.value)}
                placeholder={t("ai.searchPatient")}
                className="w-full rounded-lg border border-medical-border px-4 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
              {patients.length > 0 && (
                <div className="max-h-40 overflow-y-auto rounded-lg border border-medical-border bg-white">
                  {patients.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => {
                        setSelectedPatientId(p.id);
                        setSelectedPatientName(p.full_name);
                        setPatients([]);
                        setPatientSearch(p.full_name);
                      }}
                      className={`w-full px-4 py-2 text-left text-sm transition hover:bg-blue-50 ${selectedPatientId === p.id ? "bg-blue-50 font-medium" : ""}`}
                    >
                      {p.full_name} {p.mrn && <span className="text-xs text-medical-muted">MRN: {p.mrn}</span>}
                    </button>
                  ))}
                </div>
              )}
              {selectedPatientId && (
                <p className="text-xs font-medium text-green-600">{t("ai.selected") + ":"} {selectedPatientName}</p>
              )}
            </div>
          )}

          {scope === "icd" && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-medical-text">{t("ai.icdLabel")}</label>
              <input
                type="text"
                value={icdCode}
                onChange={(e) => setIcdCode(e.target.value)}
                placeholder={t("ai.icdPlaceholder")}
                className="w-full rounded-lg border border-medical-border px-4 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="flex-1">
        <CardContent className="pt-6">
          <div className="mb-4 min-h-[300px] max-h-[500px] space-y-4 overflow-y-auto">
            {conversation.length === 0 ? (
              <div className="py-12 text-center">
                <div className="mb-4 flex justify-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100">
                    <svg className="h-6 w-6 text-indigo-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" />
                    </svg>
                  </div>
                </div>
                <p className="font-medium text-medical-text">{t("ai.greeting")}</p>
                <p className="mt-1 text-sm text-medical-muted">{t("ai.greetingDesc")}</p>
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  {[
                    "Care sunt diagnosticele diferențiale pentru anxietate cu insomnie de 3 luni?",
                    "Rezumat ghid NICE pentru depresie moderată (first-line)",
                    "Echivalență doză sertralină → escitalopram",
                    "Criterii DSM-5 pentru GAD și ce întrebări să pun pentru criteriul de timp",
                    "Linia 1 Maudsley pentru GAD; pacientul a încercat deja sertralină",
                  ].map((q) => (
                    <button key={q} onClick={() => setQuery(q)} className="rounded-full border border-medical-border bg-white px-3 py-1.5 text-xs text-medical-muted transition hover:bg-blue-50 hover:text-blue-600">
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              conversation.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${msg.role === "user" ? "rounded-br-md bg-blue-500 text-white" : "rounded-bl-md bg-gray-100 text-medical-text"}`}>
                    <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                  </div>
                </div>
              ))
            )}
            {loading && (
              <div className="flex justify-start">
                <div className="rounded-2xl rounded-bl-md bg-gray-100 px-4 py-3">
                  <div className="flex gap-1">
                    {[0, 1, 2].map((i) => (
                      <div key={i} className="h-2 w-2 animate-bounce rounded-full bg-gray-400" style={{ animationDelay: `${i * 0.15}s` }} />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {error && <div className="mb-3 rounded-lg border border-red-200 bg-red-50 p-2 text-xs text-red-700">{error}</div>}

          <div className="flex gap-3">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleAsk()}
              placeholder={t("ai.askPlaceholder")}
              className="flex-1 rounded-lg border border-medical-border px-4 py-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              disabled={loading}
            />
            <Button onClick={handleAsk} disabled={loading || !query.trim()}>
              {loading ? t("ai.thinking") : t("ai.ask")}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
