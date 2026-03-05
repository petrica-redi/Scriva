"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useTranslation } from "@/lib/i18n/context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UserCheck, UserPlus } from "lucide-react";
import type { Consultation, Patient } from "@/types";

const VISIT_TYPES = [
  "General Visit",
  "Follow-up",
  "New Patient",
  "Urgent Care",
  "Specialist Referral",
  "Annual Checkup",
];

export default function NewConsultationPage() {
  const router = useRouter();
  const supabase = createClient();
  const { t } = useTranslation();

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

  const resolvePatientId = async (userId: string): Promise<string | null> => {
    const trimmedName = patientName.trim();
    if (!trimmedName) return null;

    if (selectedPatientId) return selectedPatientId;

    // Check for exact name match in the database to prevent duplicates
    const { data: existing } = await supabase
      .from("patients")
      .select("id, full_name")
      .eq("user_id", userId)
      .ilike("full_name", trimmedName)
      .limit(1);

    if (existing && existing.length > 0) {
      return existing[0].id;
    }

    // No match found — create a new patient record
    const { data: newPatient, error: createErr } = await supabase
      .from("patients")
      .insert({ user_id: userId, full_name: trimmedName })
      .select()
      .single();

    if (createErr || !newPatient) {
      throw new Error("Failed to create patient record");
    }

    return newPatient.id;
  };

  const handleStartRecording = async () => {
    setError("");

    if (!patientName.trim()) {
      setError("Patient name is required. Please search for an existing patient or type a new name.");
      return;
    }

    setIsLoading(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user?.id) {
        setError(t("consultation.loginRequired"));
        setIsLoading(false);
        return;
      }

      const patientId = await resolvePatientId(session.user.id);

      const consultationData: Partial<Consultation> = {
        user_id: session.user.id,
        patient_id: patientId,
        visit_type: visitType,
        status: "recording",
        consent_given: false,
        consent_timestamp: null,
        recording_duration_seconds: null,
        metadata: {
          patient_name: patientName.trim() || null,
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
        <h1 className="text-3xl font-bold text-medical-text">{t("consultation.new")}</h1>
        <p className="mt-2 text-medical-muted">
          {t("consultation.newDesc")}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("consultation.details")}</CardTitle>
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
              {t("consultation.patientName")} <span className="text-red-500">*</span>
            </label>
            <div className="relative mt-2">
              <input
                id="patientName"
                type="text"
                placeholder={t("consultation.searchPatient")}
                value={patientName}
                onChange={(e) => { setPatientName(e.target.value); setSelectedPatientId(null); }}
                onFocus={() => patientSuggestions.length > 0 && setShowSuggestions(true)}
                className={`block w-full rounded-lg border px-4 py-2.5 pr-10 text-medical-text placeholder-medical-muted focus:outline-none focus:ring-2 ${
                  selectedPatientId
                    ? "border-green-300 focus:border-green-500 focus:ring-green-500/20"
                    : "border-medical-border focus:border-brand-500 focus:ring-brand-500/20"
                }`}
              />
              {selectedPatientId && (
                <UserCheck className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-green-600" />
              )}
            </div>
            {selectedPatientId && (
              <p className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-green-600">
                <UserCheck className="h-3.5 w-3.5" />
                Linked to existing patient record
              </p>
            )}
            {patientName.trim().length >= 2 && !selectedPatientId && patientSuggestions.length === 0 && !showSuggestions && (
              <p className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-amber-600">
                <UserPlus className="h-3.5 w-3.5" />
                New patient — a record will be created automatically
              </p>
            )}
            {showSuggestions && patientSuggestions.length > 0 && (
              <div className="absolute left-0 right-0 top-full z-10 mt-1 overflow-hidden rounded-lg border border-medical-border bg-white shadow-lg">
                <p className="border-b border-medical-border bg-slate-50 px-4 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-medical-muted">
                  Existing patients
                </p>
                {patientSuggestions.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => { setPatientName(p.full_name); setSelectedPatientId(p.id); setShowSuggestions(false); }}
                    className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm transition hover:bg-blue-50"
                  >
                    <UserCheck className="h-4 w-4 shrink-0 text-green-500" />
                    <span className="font-medium text-medical-text">{p.full_name}</span>
                    {p.mrn && <span className="ml-auto text-xs text-medical-muted">MRN: {p.mrn}</span>}
                    {p.date_of_birth && <span className="text-xs text-medical-muted">DOB: {p.date_of_birth}</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Visit Type Dropdown */}
          <div>
            <label htmlFor="visitType" className="block text-sm font-medium text-medical-text">
              {t("consultation.visitType")} <span className="text-red-500">*</span>
            </label>
            <select
              id="visitType"
              value={visitType}
              onChange={(e) => setVisitType(e.target.value)}
              className="mt-2 block w-full rounded-lg border border-medical-border px-4 py-2.5 text-medical-text focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            >
              {VISIT_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          {/* Notes Textarea */}
          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-medical-text">
              {t("consultation.initialNotes")}
            </label>
            <textarea
              id="notes"
              placeholder={t("consultation.notesPlaceholder")}
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
              disabled={isLoading || !patientName.trim()}
              variant="primary"
              size="lg"
              className="flex-1"
            >
              {isLoading ? t("consultation.creating") : t("consultation.startRecording")}
            </Button>
            <Button
              onClick={() => router.back()}
              disabled={isLoading}
              variant="outline"
              size="lg"
              className="flex-1"
            >
              {t("common.cancel")}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Info Section */}
      <div className="mt-6 rounded-lg border border-blue-200 bg-blue-50 p-4">
        <p className="text-sm text-blue-800">
          <span className="font-medium">Note:</span> {t("consultation.consentNote")}
        </p>
      </div>
    </div>
  );
}
