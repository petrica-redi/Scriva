"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useTranslation } from "@/lib/i18n/context";
import { Button } from "@/components/ui/button";
import { UserCheck, UserPlus } from "lucide-react";
import { PreVisitBrief } from "@/components/features";
import type { Consultation, Patient } from "@/types";

// ─── Constants ──────────────────────────────────────────────────────────────

const VISIT_TYPES = [
  { value: "General Visit", icon: "🩺" },
  { value: "Follow-up", icon: "🔄" },
  { value: "New Patient", icon: "👤" },
  { value: "Urgent Care", icon: "🚨" },
  { value: "Specialist Referral", icon: "📋" },
  { value: "Annual Checkup", icon: "📅" },
];

const GENDERS = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
];

const BODY_AREAS = [
  "Head", "Throat", "Chest", "Abdomen", "Back",
  "Arm (L)", "Arm (R)", "Leg (L)", "Leg (R)",
  "Skin", "General / Whole body",
];

const SYMPTOM_TAGS = [
  "Pain", "Swelling", "Fever", "Cough", "Fatigue",
  "Nausea", "Dizziness", "Rash", "Shortness of breath",
  "Numbness", "Bleeding", "Anxiety", "Insomnia",
];

const COMMON_ALLERGIES = [
  "Penicillin", "Aspirin", "Ibuprofen", "Sulfa drugs",
  "Latex", "Peanuts", "Shellfish", "Eggs", "Bee stings",
];

type Step = 1 | 2 | 3;

// ─── Component ──────────────────────────────────────────────────────────────

export default function NewConsultationPage() {
  const router = useRouter();
  const supabase = createClient();
  const { t } = useTranslation();

  // Wizard step
  const [step, setStep] = useState<Step>(1);

  // Step 1 — Who is the patient
  const [patientName, setPatientName] = useState("");
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [patientSuggestions, setPatientSuggestions] = useState<Patient[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const patientInputRef = useRef<HTMLDivElement>(null);
  const [phone, setPhone] = useState("");
  const [gender, setGender] = useState("");
  const [dob, setDob] = useState("");

  // Step 2 — Why are they here
  const [visitType, setVisitType] = useState("General Visit");
  const [chiefComplaint, setChiefComplaint] = useState("");
  const [bodyAreas, setBodyAreas] = useState<string[]>([]);
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [painLevel, setPainLevel] = useState(0);
  const [symptomDuration, setSymptomDuration] = useState("");
  const [notes, setNotes] = useState("");

  // Step 3 — Medical background
  const [allergies, setAllergies] = useState<string[]>([]);
  const [allergyCustom, setAllergyCustom] = useState("");
  const [medications, setMedications] = useState("");
  const [conditions, setConditions] = useState("");

  // Global
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  // ── Patient autocomplete ──────────────────────────────────────────────
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

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (patientInputRef.current && !patientInputRef.current.contains(e.target as Node)) setShowSuggestions(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // When selecting an existing patient, pre-fill what we know
  const handleSelectPatient = useCallback((p: Patient) => {
    setPatientName(p.full_name);
    setSelectedPatientId(p.id);
    setShowSuggestions(false);
    if (p.gender) setGender(p.gender);
    if (p.date_of_birth) setDob(p.date_of_birth);
    if (p.contact_info?.phone) setPhone(p.contact_info.phone);
  }, []);

  // ── Toggle helpers ────────────────────────────────────────────────────
  const toggle = (arr: string[], value: string, setter: (v: string[]) => void) => {
    setter(arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value]);
  };

  // ── Resolve or create patient ─────────────────────────────────────────
  const resolvePatientId = async (userId: string): Promise<string | null> => {
    const trimmedName = patientName.trim();
    if (!trimmedName) return null;

    if (selectedPatientId) {
      // Update existing patient with any new info
      const updates: Record<string, unknown> = {};
      if (phone) updates.contact_info = { phone };
      if (gender) updates.gender = gender;
      if (dob) updates.date_of_birth = dob;
      if (Object.keys(updates).length > 0) {
        await supabase.from("patients").update(updates).eq("id", selectedPatientId);
      }
      return selectedPatientId;
    }

    const { data: existing } = await supabase
      .from("patients")
      .select("id, full_name")
      .eq("user_id", userId)
      .ilike("full_name", trimmedName)
      .limit(1);

    if (existing && existing.length > 0) return existing[0].id;

    const { data: newPatient, error: createErr } = await supabase
      .from("patients")
      .insert({
        user_id: userId,
        full_name: trimmedName,
        gender: gender || null,
        date_of_birth: dob || null,
        contact_info: phone ? { phone } : {},
      })
      .select()
      .single();

    if (createErr || !newPatient) throw new Error("Failed to create patient record");
    return newPatient.id;
  };

  // ── Submit ────────────────────────────────────────────────────────────
  const handleStartRecording = async () => {
    setError("");
    if (!patientName.trim()) { setError("Patient name is required"); return; }
    setIsLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) { setError(t("consultation.loginRequired")); setIsLoading(false); return; }

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
          patient_name: patientName.trim(),
          initial_notes: notes || null,
          chief_complaint: chiefComplaint || null,
          body_areas: bodyAreas.length > 0 ? bodyAreas : null,
          symptoms: symptoms.length > 0 ? symptoms : null,
          pain_level: painLevel > 0 ? painLevel : null,
          symptom_duration: symptomDuration || null,
          allergies: allergies.length > 0 ? allergies : null,
          current_medications: medications || null,
          existing_conditions: conditions || null,
        },
      };

      const { data, error: insertError } = await supabase
        .from("consultations")
        .insert([consultationData])
        .select()
        .single();

      if (insertError) throw new Error(insertError.message || "Failed to create consultation");
      if (!data?.id) throw new Error("No consultation ID returned");

      router.push(`/consultation/${data.id}/record`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
      setIsLoading(false);
    }
  };

  // ── Step validation ───────────────────────────────────────────────────
  const canProceedStep1 = patientName.trim().length >= 2;
  const canProceedStep2 = true; // all fields optional but visit type has default

  // ── Pain level colors ─────────────────────────────────────────────────
  const painColor = painLevel <= 3 ? "bg-green-500" : painLevel <= 6 ? "bg-amber-500" : "bg-red-500";
  const painBg = painLevel <= 3 ? "bg-green-50 border-green-200" : painLevel <= 6 ? "bg-amber-50 border-amber-200" : "bg-red-50 border-red-200";

  // ────────────────────────────────────────────────────────────────────────
  return (
    <div className="mx-auto max-w-xl p-4 sm:p-6">
      {/* Progress bar */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          {[1, 2, 3].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => { if (s === 1 || (s === 2 && canProceedStep1) || (s === 3 && canProceedStep1)) setStep(s as Step); }}
              className={`flex items-center gap-2 text-sm font-medium transition-colors ${
                step === s ? "text-brand-700" : step > s ? "text-green-600" : "text-gray-400"
              }`}
            >
              <span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-all ${
                step === s ? "bg-brand-600 text-white shadow-md" : step > s ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-400"
              }`}>
                {step > s ? "✓" : s}
              </span>
              <span className="hidden sm:inline">
                {s === 1 ? "Patient" : s === 2 ? "Visit reason" : "Medical info"}
              </span>
            </button>
          ))}
        </div>
        <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
          <div
            className="h-full rounded-full bg-brand-600 transition-all duration-500 ease-out"
            style={{ width: `${((step - 1) / 2) * 100}%` }}
          />
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          STEP 1 — Who is the patient?
         ══════════════════════════════════════════════════════════════════ */}
      {step === 1 && (
        <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
          <div>
            <h2 className="text-xl font-bold text-medical-text">Who is the patient?</h2>
            <p className="mt-1 text-sm text-medical-muted">Basic identification</p>
          </div>

          {/* Name with autocomplete */}
          <div ref={patientInputRef} className="relative">
            <label className="block text-sm font-medium text-medical-text mb-1.5">
              Full name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="Search existing or type new name"
              value={patientName}
              onChange={(e) => { setPatientName(e.target.value); setSelectedPatientId(null); }}
              onFocus={() => patientSuggestions.length > 0 && setShowSuggestions(true)}
              autoFocus
              className={`block w-full rounded-xl border-2 px-4 py-3 text-base text-medical-text placeholder-gray-400 focus:outline-none transition-colors ${
                selectedPatientId
                  ? "border-green-300 bg-green-50/30 focus:border-green-400"
                  : "border-gray-200 focus:border-brand-500"
              }`}
            />
            {selectedPatientId && (
              <p className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-green-600">
                <UserCheck className="h-3.5 w-3.5" /> Linked to existing record
              </p>
            )}
            {patientName.trim().length >= 2 && !selectedPatientId && patientSuggestions.length === 0 && !showSuggestions && (
              <p className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-amber-600">
                <UserPlus className="h-3.5 w-3.5" /> New patient — record created automatically
              </p>
            )}
            {showSuggestions && patientSuggestions.length > 0 && (
              <div className="absolute left-0 right-0 top-full z-10 mt-1 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl">
                <p className="border-b bg-gray-50 px-4 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                  Existing patients
                </p>
                {patientSuggestions.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => handleSelectPatient(p)}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-blue-50"
                  >
                    <UserCheck className="h-4 w-4 shrink-0 text-green-500" />
                    <div>
                      <span className="font-medium text-medical-text">{p.full_name}</span>
                      <div className="flex gap-2 text-xs text-gray-500">
                        {p.mrn && <span>MRN: {p.mrn}</span>}
                        {p.date_of_birth && <span>DOB: {p.date_of_birth}</span>}
                        {p.gender && <span className="capitalize">{p.gender}</span>}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Phone + Gender side by side */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-medical-text mb-1.5">Phone</label>
              <input
                type="tel"
                placeholder="+40 7xx xxx xxx"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="block w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-base placeholder-gray-400 focus:border-brand-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-medical-text mb-1.5">Gender</label>
              <div className="flex gap-2">
                {GENDERS.map((g) => (
                  <button
                    key={g.value}
                    type="button"
                    onClick={() => setGender(gender === g.value ? "" : g.value)}
                    className={`flex-1 rounded-xl border-2 py-3 text-sm font-medium transition-all ${
                      gender === g.value
                        ? "border-brand-500 bg-brand-50 text-brand-700"
                        : "border-gray-200 text-gray-600 hover:border-gray-300"
                    }`}
                  >
                    {g.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Date of birth */}
          <div>
            <label className="block text-sm font-medium text-medical-text mb-1.5">Date of birth</label>
            <input
              type="date"
              value={dob}
              onChange={(e) => setDob(e.target.value)}
              className="block w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-base text-medical-text focus:border-brand-500 focus:outline-none"
            />
          </div>

          {/* Pre-Visit Brief (existing patient) */}
          {selectedPatientId && (
            <PreVisitBrief patientId={selectedPatientId} />
          )}

          <Button
            onClick={() => setStep(2)}
            disabled={!canProceedStep1}
            variant="primary"
            size="lg"
            className="w-full h-14 text-base rounded-xl"
          >
            Continue
          </Button>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          STEP 2 — Why are they here?
         ══════════════════════════════════════════════════════════════════ */}
      {step === 2 && (
        <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
          <div>
            <h2 className="text-xl font-bold text-medical-text">Why are they here?</h2>
            <p className="mt-1 text-sm text-medical-muted">Reason for the visit</p>
          </div>

          {/* Visit type — big tap targets */}
          <div>
            <label className="block text-sm font-medium text-medical-text mb-2">Visit type</label>
            <div className="grid grid-cols-3 gap-2">
              {VISIT_TYPES.map((vt) => (
                <button
                  key={vt.value}
                  type="button"
                  onClick={() => setVisitType(vt.value)}
                  className={`flex flex-col items-center gap-1 rounded-xl border-2 px-2 py-3 text-center transition-all ${
                    visitType === vt.value
                      ? "border-brand-500 bg-brand-50 text-brand-700 shadow-sm"
                      : "border-gray-200 text-gray-600 hover:border-gray-300"
                  }`}
                >
                  <span className="text-lg">{vt.icon}</span>
                  <span className="text-xs font-medium leading-tight">{vt.value}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Chief complaint — free text */}
          <div>
            <label className="block text-sm font-medium text-medical-text mb-1.5">Chief complaint</label>
            <input
              type="text"
              placeholder="e.g. persistent headache for 3 days"
              value={chiefComplaint}
              onChange={(e) => setChiefComplaint(e.target.value)}
              className="block w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-base placeholder-gray-400 focus:border-brand-500 focus:outline-none"
            />
          </div>

          {/* Body area — tap chips */}
          <div>
            <label className="block text-sm font-medium text-medical-text mb-2">Where does it hurt?</label>
            <div className="flex flex-wrap gap-2">
              {BODY_AREAS.map((area) => (
                <button
                  key={area}
                  type="button"
                  onClick={() => toggle(bodyAreas, area, setBodyAreas)}
                  className={`rounded-full border-2 px-3.5 py-1.5 text-sm font-medium transition-all ${
                    bodyAreas.includes(area)
                      ? "border-brand-500 bg-brand-50 text-brand-700"
                      : "border-gray-200 text-gray-600 hover:border-gray-300"
                  }`}
                >
                  {area}
                </button>
              ))}
            </div>
          </div>

          {/* Symptoms — tap chips */}
          <div>
            <label className="block text-sm font-medium text-medical-text mb-2">Symptoms</label>
            <div className="flex flex-wrap gap-2">
              {SYMPTOM_TAGS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => toggle(symptoms, s, setSymptoms)}
                  className={`rounded-full border-2 px-3.5 py-1.5 text-sm font-medium transition-all ${
                    symptoms.includes(s)
                      ? "border-purple-500 bg-purple-50 text-purple-700"
                      : "border-gray-200 text-gray-600 hover:border-gray-300"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Pain level — slider */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-medical-text">Pain level</label>
              <span className={`rounded-full px-3 py-1 text-sm font-bold ${
                painLevel === 0 ? "bg-gray-100 text-gray-500" : `${painBg} border`
              }`}>
                {painLevel === 0 ? "None" : `${painLevel}/10`}
              </span>
            </div>
            <div className="relative">
              <input
                type="range"
                min={0}
                max={10}
                value={painLevel}
                onChange={(e) => setPainLevel(Number(e.target.value))}
                className="w-full h-3 rounded-full appearance-none cursor-pointer bg-gray-200"
                style={{
                  background: painLevel === 0 ? undefined : `linear-gradient(to right, #22c55e ${painLevel * 10}%, #e5e7eb ${painLevel * 10}%)`,
                }}
              />
              <div className="flex justify-between mt-1 text-[10px] text-gray-400 px-1">
                <span>No pain</span>
                <span>Moderate</span>
                <span>Worst</span>
              </div>
            </div>
          </div>

          {/* Duration */}
          <div>
            <label className="block text-sm font-medium text-medical-text mb-1.5">How long?</label>
            <div className="flex gap-2">
              {["Today", "2-3 days", "1 week", "2+ weeks", "1+ month", "Chronic"].map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setSymptomDuration(symptomDuration === d ? "" : d)}
                  className={`flex-1 rounded-xl border-2 py-2 text-xs font-medium transition-all ${
                    symptomDuration === d
                      ? "border-brand-500 bg-brand-50 text-brand-700"
                      : "border-gray-200 text-gray-600 hover:border-gray-300"
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-medical-text mb-1.5">Additional notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Anything else relevant…"
              rows={2}
              className="block w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-sm placeholder-gray-400 focus:border-brand-500 focus:outline-none resize-y"
            />
          </div>

          <div className="flex gap-3">
            <Button onClick={() => setStep(1)} variant="outline" size="lg" className="flex-1 h-14 rounded-xl">
              Back
            </Button>
            <Button onClick={() => setStep(3)} variant="primary" size="lg" className="flex-1 h-14 text-base rounded-xl">
              Continue
            </Button>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          STEP 3 — Allergies, medications & medical background
         ══════════════════════════════════════════════════════════════════ */}
      {step === 3 && (
        <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
          <div>
            <h2 className="text-xl font-bold text-medical-text">Medical background</h2>
            <p className="mt-1 text-sm text-medical-muted">Allergies, medications & conditions (optional — can be added later)</p>
          </div>

          {/* Allergies — quick tap + custom */}
          <div>
            <label className="block text-sm font-medium text-medical-text mb-2">Known allergies</label>
            <div className="flex flex-wrap gap-2">
              {COMMON_ALLERGIES.map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => toggle(allergies, a, setAllergies)}
                  className={`rounded-full border-2 px-3.5 py-1.5 text-sm font-medium transition-all ${
                    allergies.includes(a)
                      ? "border-red-400 bg-red-50 text-red-700"
                      : "border-gray-200 text-gray-600 hover:border-gray-300"
                  }`}
                >
                  {a}
                </button>
              ))}
            </div>
            <div className="mt-2 flex gap-2">
              <input
                type="text"
                placeholder="Add custom allergy"
                value={allergyCustom}
                onChange={(e) => setAllergyCustom(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && allergyCustom.trim()) {
                    e.preventDefault();
                    if (!allergies.includes(allergyCustom.trim())) {
                      setAllergies([...allergies, allergyCustom.trim()]);
                    }
                    setAllergyCustom("");
                  }
                }}
                className="flex-1 rounded-xl border-2 border-gray-200 px-4 py-2 text-sm placeholder-gray-400 focus:border-brand-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => {
                  if (allergyCustom.trim() && !allergies.includes(allergyCustom.trim())) {
                    setAllergies([...allergies, allergyCustom.trim()]);
                  }
                  setAllergyCustom("");
                }}
                disabled={!allergyCustom.trim()}
                className="rounded-xl border-2 border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:border-brand-500 hover:text-brand-600 disabled:opacity-40 transition-colors"
              >
                Add
              </button>
            </div>
            {/* Show selected allergies that aren't in the default list */}
            {allergies.filter((a) => !COMMON_ALLERGIES.includes(a)).length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {allergies.filter((a) => !COMMON_ALLERGIES.includes(a)).map((a) => (
                  <span
                    key={a}
                    className="flex items-center gap-1 rounded-full border-2 border-red-400 bg-red-50 px-3 py-1 text-sm font-medium text-red-700"
                  >
                    {a}
                    <button
                      type="button"
                      onClick={() => setAllergies(allergies.filter((x) => x !== a))}
                      className="ml-0.5 rounded-full p-0.5 hover:bg-red-200 transition-colors"
                    >
                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Current medications */}
          <div>
            <label className="block text-sm font-medium text-medical-text mb-1.5">Current medications</label>
            <textarea
              value={medications}
              onChange={(e) => setMedications(e.target.value)}
              placeholder="e.g. Metformin 500mg 2x/day, Lisinopril 10mg..."
              rows={2}
              className="block w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-sm placeholder-gray-400 focus:border-brand-500 focus:outline-none resize-y"
            />
          </div>

          {/* Existing conditions */}
          <div>
            <label className="block text-sm font-medium text-medical-text mb-1.5">Existing conditions</label>
            <textarea
              value={conditions}
              onChange={(e) => setConditions(e.target.value)}
              placeholder="e.g. Type 2 diabetes, hypertension..."
              rows={2}
              className="block w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-sm placeholder-gray-400 focus:border-brand-500 focus:outline-none resize-y"
            />
          </div>

          {/* Summary card */}
          <div className="rounded-xl border-2 border-brand-200 bg-brand-50/30 p-4 space-y-2">
            <p className="text-sm font-semibold text-brand-800">Ready to start</p>
            <div className="text-xs text-brand-700 space-y-1">
              <p><span className="font-medium">Patient:</span> {patientName}{gender ? ` (${gender})` : ""}</p>
              <p><span className="font-medium">Visit:</span> {visitType}{chiefComplaint ? ` — ${chiefComplaint}` : ""}</p>
              {symptoms.length > 0 && <p><span className="font-medium">Symptoms:</span> {symptoms.join(", ")}</p>}
              {painLevel > 0 && <p><span className="font-medium">Pain:</span> {painLevel}/10</p>}
              {allergies.length > 0 && <p><span className="font-medium text-red-700">Allergies:</span> {allergies.join(", ")}</p>}
            </div>
          </div>

          <div className="flex gap-3">
            <Button onClick={() => setStep(2)} variant="outline" size="lg" className="flex-1 h-14 rounded-xl">
              Back
            </Button>
            <Button
              onClick={handleStartRecording}
              disabled={isLoading}
              variant="primary"
              size="lg"
              className="flex-1 h-14 text-base rounded-xl bg-red-600 hover:bg-red-700 text-white"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Creating…
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20"><circle cx="10" cy="10" r="6" /></svg>
                  Start recording
                </span>
              )}
            </Button>
          </div>

          {/* Skip note */}
          <p className="text-center text-xs text-gray-400">
            All fields are optional — you can skip and go straight to recording
          </p>
        </div>
      )}
    </div>
  );
}
