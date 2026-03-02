"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n/i18n-context";
import type { Consultation, Patient } from "@/types";

const VISIT_TYPES: Record<string, { en: string; ro: string }> = {
  "General Visit": { en: "General Visit", ro: "Consultație Generală" },
  "Follow-up": { en: "Follow-up", ro: "Control" },
  "New Patient": { en: "New Patient", ro: "Pacient Nou" },
  "Urgent Care": { en: "Urgent Care", ro: "Urgență" },
  "Specialist Referral": { en: "Specialist Referral", ro: "Trimitere la Specialist" },
  "Annual Checkup": { en: "Annual Checkup", ro: "Control Anual" },
};

export default function NewConsultationPage() {
  const router = useRouter();
  const { t, locale } = useI18n();
  const supabase = useMemo(() => createClient(), []);

  const [patientName, setPatientName] = useState("");
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [patientSuggestions, setPatientSuggestions] = useState<Patient[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const patientInputRef = useRef<HTMLDivElement>(null);
  const [visitType, setVisitType] = useState("General Visit");
  const [notes, setNotes] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  // Patient autocomplete search
  useEffect(() => {
    if (patientName.length < 2) { setPatientSuggestions([]); return; }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/patients?search=${encodeURIComponent(patientName)}&limit=5`);
        if (res.ok) {
          const json = await res.json();
          setPatientSuggestions(json.data || []);
          setShowSuggestions(true);
        }
      } catch { /* ignore */ }
    }, 250);
    return () => clearTimeout(timer);
  }, [patientName]);

  // Close suggestions on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (patientInputRef.current && !patientInputRef.current.contains(e.target as Node)) setShowSuggestions(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleStartRecording = async () => {
    setError("");
    setIsLoading(true);

    try {
      // Get current user session
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const currentUserId = session?.user?.id || "00000000-0000-0000-0000-000000000000";

      // Create new consultation record in Supabase
      const consultationData: Partial<Consultation> = {
        user_id: currentUserId,
        patient_id: selectedPatientId || null,
        visit_type: visitType,
        status: "recording",
        consent_given: false, // Will be set during recording phase
        consent_timestamp: null,
        recording_duration_seconds: null,
        metadata: {
          patient_name: patientName || null,
          initial_notes: notes || null,
        },
      };

      const { data, error: insertError } = await supabase
        .from("consultations")
        .insert([consultationData])
        .select()
        .single();

      if (insertError) {
        throw new Error(insertError.message || "Failed to create consultation");
      }

      if (!data?.id) {
        throw new Error("No consultation ID returned");
      }

      // Redirect to recording page with new consultation ID
      router.push(`/consultation/${data.id}/record`);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "An unexpected error occurred";
      setError(message);
      setIsLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-medical-text">{t('consultation.new')}</h1>
        <p className="mt-2 text-medical-muted">
          {t('consultation.newDesc')}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('consultation.details')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Error Alert */}
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* Patient Name Field with Autocomplete */}
          <div ref={patientInputRef} className="relative">
            <label htmlFor="patientName" className="block text-sm font-medium text-medical-text">
              {t('consultation.patientName')}
            </label>
            <input
              id="patientName"
              type="text"
              placeholder={t('consultation.searchPatient')}
              value={patientName}
              onChange={(e) => { setPatientName(e.target.value); setSelectedPatientId(null); }}
              onFocus={() => patientSuggestions.length > 0 && setShowSuggestions(true)}
              className="mt-2 block w-full rounded-lg border border-medical-border px-4 py-2.5 text-medical-text placeholder-medical-muted focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            />
            {selectedPatientId && (
              <span className="absolute right-3 top-[calc(50%+4px)] text-xs text-green-600 font-medium">{t('consultation.linked')}</span>
            )}
            {showSuggestions && patientSuggestions.length > 0 && (
              <div className="absolute left-0 right-0 top-full z-10 mt-1 rounded-lg border border-medical-border bg-white shadow-lg">
                {patientSuggestions.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => { setPatientName(p.full_name); setSelectedPatientId(p.id); setShowSuggestions(false); }}
                    className="w-full px-4 py-2.5 text-left text-sm hover:bg-blue-50 transition"
                  >
                    <span className="font-medium text-medical-text">{p.full_name}</span>
                    {p.mrn && <span className="ml-2 text-xs text-medical-muted">MRN: {p.mrn}</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Visit Type Dropdown */}
          <div>
            <label htmlFor="visitType" className="block text-sm font-medium text-medical-text">
              {t('consultation.visitType')} <span className="text-red-500">*</span>
            </label>
            <select
              id="visitType"
              value={visitType}
              onChange={(e) => setVisitType(e.target.value)}
              className="mt-2 block w-full rounded-lg border border-medical-border px-4 py-2.5 text-medical-text focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            >
              {Object.entries(VISIT_TYPES).map(([key, labels]) => (
                <option key={key} value={key}>
                  {labels[locale] || labels.en}
                </option>
              ))}
            </select>
          </div>

          {/* Notes Textarea */}
          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-medical-text">
              {t('consultation.initialNotes')}
            </label>
            <textarea
              id="notes"
              placeholder={t('consultation.notesPlaceholder')}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              className="mt-2 block w-full rounded-lg border border-medical-border px-4 py-2.5 text-medical-text placeholder-medical-muted focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            />
          </div>

          {/* Start Recording Button */}
          <div className="flex gap-3 pt-4">
            <Button
              onClick={handleStartRecording}
              disabled={isLoading}
              variant="primary"
              size="lg"
              className="flex-1"
            >
              {isLoading ? t('consultation.creatingConsultation') : t('consultation.startRecording')}
            </Button>
            <Button
              onClick={() => router.back()}
              disabled={isLoading}
              variant="outline"
              size="lg"
              className="flex-1"
            >
              {t('common.cancel')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Info Section */}
      <div className="mt-6 rounded-lg border border-blue-200 bg-blue-50 p-4">
        <p className="text-sm text-blue-800">
          {t('consultation.consentNote')}
        </p>
      </div>
    </div>
  );
}
