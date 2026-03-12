"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { ReferralModal } from "@/components/referral/ReferralModal";
import { SmartPrescriptionPanel } from "@/components/features/SmartPrescriptionPanel";

interface Medication {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  quantity: string;
  notes: string;
}

const emptyMed = (): Medication => ({
  name: "", dosage: "", frequency: "", duration: "", quantity: "", notes: "",
});

export default function PrescriptionPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const consultationId = params?.id;

  const [medications, setMedications] = useState<Medication[]>([emptyMed()]);
  const [generalNotes, setGeneralNotes] = useState("");
  const [patientEmail, setPatientEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [referralOpen, setReferralOpen] = useState(false);
  const [patientName, setPatientName] = useState("");
  const [diagnosisCode, setDiagnosisCode] = useState<string>("");
  const [diagnosisName, setDiagnosisName] = useState<string>("");
  const [existingPrescriptions, setExistingPrescriptions] = useState<Array<{
    id: string;
    medications: Medication[];
    notes: string;
    created_at: string;
  }>>([]);

  const supabase = createClient();

  const [patientId, setPatientId] = useState<string | null>(null);
  const [showFollowUpPrompt, setShowFollowUpPrompt] = useState(false);

  const loadConsultation = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("consultations")
      .select("metadata, patient_id")
      .eq("id", consultationId)
      .single();
    if (data?.patient_id) setPatientId(data.patient_id as string);
    if (data?.metadata) {
      const meta = data.metadata as Record<string, unknown>;
      if (typeof meta.patient_name === "string") setPatientName(meta.patient_name);
      if (Array.isArray(meta.prescriptions)) {
        setExistingPrescriptions(meta.prescriptions as typeof existingPrescriptions);
      }
      if (typeof meta.primary_diagnosis === "string") setDiagnosisName(meta.primary_diagnosis);
      if (typeof meta.diagnosis_code === "string") setDiagnosisCode(meta.diagnosis_code);
      if (Array.isArray(meta.billing_codes)) {
        const firstIcd = (meta.billing_codes as Array<{ code?: string; system?: string }>).find(
          (bc) => bc.system === "ICD-10" && bc.code
        );
        if (firstIcd?.code && !(meta.diagnosis_code as string)) setDiagnosisCode(firstIcd.code);
      }
    }
  }, [consultationId]);

  useEffect(() => { loadConsultation(); }, [loadConsultation]);

  const updateMed = (index: number, field: keyof Medication, value: string) => {
    setMedications((prev) => prev.map((m, i) => (i === index ? { ...m, [field]: value } : m)));
  };

  const addMedication = () => setMedications((prev) => [...prev, emptyMed()]);

  const removeMedication = (index: number) => {
    if (medications.length <= 1) return;
    setMedications((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSelectSmartMedication = (name: string) => {
    const firstEmpty = medications.findIndex((m) => !m.name.trim());
    if (firstEmpty >= 0) {
      updateMed(firstEmpty, "name", name);
    } else {
      setMedications((prev) => [...prev, { ...emptyMed(), name }]);
    }
  };

  const handleSave = async () => {
    setError("");
    setSaving(true);
    setSaved(false);

    const validMeds = medications.filter((m) => m.name.trim());
    if (validMeds.length === 0) {
      setError("Add at least one medication");
      setSaving(false);
      return;
    }

    try {
      const res = await fetch("/api/prescriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          consultation_id: consultationId,
          medications: validMeds,
          notes: generalNotes,
          patient_email: patientEmail || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save");
      }

      setSaved(true);
      setShowFollowUpPrompt(!!patientId);
      loadConsultation();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save prescription");
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadPdf = () => {
    window.open(`/api/prescriptions/pdf?consultation_id=${consultationId}`, "_blank");
  };

  const handleCreateSuggestedFollowUp = async () => {
    if (!patientId) return;
    const due = new Date();
    due.setDate(due.getDate() + 14);
    try {
      const res = await fetch("/api/follow-ups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patient_id: patientId,
          consultation_id: consultationId,
          type: "medication_review",
          title: "Medication review",
          description: "Follow-up after prescription",
          due_date: due.toISOString().split("T")[0],
          priority: "medium",
        }),
      });
      if (res.ok) setShowFollowUpPrompt(false);
    } catch {
      // ignore
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-medical-text">Write Prescription</h1>
          {patientName && <p className="text-sm text-medical-muted mt-1">Patient: {patientName}</p>}
        </div>
        <Button variant="outline" size="sm" onClick={() => router.back()}>
          ← Back
        </Button>
      </div>

      {/* Suggested follow-up after save */}
      {saved && showFollowUpPrompt && patientId && (
        <Card className="border-brand-200 bg-brand-50/30">
          <CardContent className="pt-4 pb-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-medical-text">
              <strong>Suggested follow-up:</strong> Medication review in 2 weeks
            </p>
            <div className="flex gap-2">
              <Button size="sm" variant="primary" onClick={handleCreateSuggestedFollowUp}>
                Create follow-up
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setShowFollowUpPrompt(false)}>
                Dismiss
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Existing Prescriptions */}
      {existingPrescriptions.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-medical-text">Saved Prescriptions</h2>
          {existingPrescriptions.map((rx) => (
            <Card key={rx.id} className="border-green-200 bg-green-50/30">
              <CardContent className="pt-4 pb-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-green-700" suppressHydrationWarning>
                    {new Date(rx.created_at).toLocaleString()}
                  </span>
                  <span className="text-xs text-green-600 bg-green-100 px-2 py-0.5 rounded-full">
                    {rx.medications.length} medication{rx.medications.length !== 1 ? "s" : ""}
                  </span>
                </div>
                <ul className="text-sm text-medical-text space-y-1">
                  {rx.medications.map((m: Medication, i: number) => (
                    <li key={i} className="flex gap-2">
                      <span className="font-medium">{m.name}</span>
                      {m.dosage && <span className="text-medical-muted">{m.dosage}</span>}
                      {m.frequency && <span className="text-medical-muted">— {m.frequency}</span>}
                      {m.duration && <span className="text-medical-muted">for {m.duration}</span>}
                    </li>
                  ))}
                </ul>
                {rx.notes && (
                  <p className="text-xs text-medical-muted italic">{rx.notes}</p>
                )}
              </CardContent>
            </Card>
          ))}
          <hr className="border-medical-border" />
          <h2 className="text-lg font-semibold text-medical-text">Add New Prescription</h2>
        </div>
      )}

      {/* Smart Prescription */}
      <SmartPrescriptionPanel
        diagnosisCode={diagnosisCode || undefined}
        diagnosisName={diagnosisName || undefined}
        onSelectMedication={handleSelectSmartMedication}
      />

      {/* Medications */}
      <div className="space-y-4">
        {medications.map((med, idx) => (
          <Card key={idx}>
            <CardContent className="space-y-3 pt-5">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-medical-text">
                  Medication #{idx + 1}
                </h3>
                {medications.length > 1 && (
                  <button
                    onClick={() => removeMedication(idx)}
                    className="text-xs text-red-500 hover:text-red-700"
                  >
                    Remove
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Input
                  label="Medication Name"
                  placeholder="e.g., Amoxicillin"
                  value={med.name}
                  onChange={(e) => updateMed(idx, "name", e.target.value)}
                />
                <Input
                  label="Dosage"
                  placeholder="e.g., 500mg"
                  value={med.dosage}
                  onChange={(e) => updateMed(idx, "dosage", e.target.value)}
                />
                <Input
                  label="Frequency"
                  placeholder="e.g., 3 times daily"
                  value={med.frequency}
                  onChange={(e) => updateMed(idx, "frequency", e.target.value)}
                />
                <Input
                  label="Duration"
                  placeholder="e.g., 7 days"
                  value={med.duration}
                  onChange={(e) => updateMed(idx, "duration", e.target.value)}
                />
                <Input
                  label="Quantity"
                  placeholder="e.g., 21 tablets"
                  value={med.quantity}
                  onChange={(e) => updateMed(idx, "quantity", e.target.value)}
                />
                <Input
                  label="Instructions"
                  placeholder="e.g., Take after meals"
                  value={med.notes}
                  onChange={(e) => updateMed(idx, "notes", e.target.value)}
                />
              </div>
            </CardContent>
          </Card>
        ))}

        <Button variant="outline" size="sm" onClick={addMedication}>
          + Add Medication
        </Button>
      </div>

      {/* General Notes */}
      <Card>
        <CardContent className="space-y-3 pt-5">
          <label className="block text-sm font-medium text-medical-text">Additional Notes</label>
          <textarea
            value={generalNotes}
            onChange={(e) => setGeneralNotes(e.target.value)}
            placeholder="General instructions, follow-up notes..."
            className="w-full min-h-[80px] rounded-lg border border-medical-border bg-white px-3 py-2 text-sm text-medical-text placeholder-medical-muted focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 resize-y"
          />
        </CardContent>
      </Card>

      {/* Patient Email (optional) */}
      <Card>
        <CardContent className="pt-5">
          <Input
            label="Patient Email (optional — for future sending)"
            placeholder="patient@email.com"
            type="email"
            value={patientEmail}
            onChange={(e) => setPatientEmail(e.target.value)}
          />
        </CardContent>
      </Card>

      {/* Preview */}
      <Button variant="ghost" size="sm" onClick={() => setShowPreview(!showPreview)}>
        {showPreview ? "Hide Preview" : "Preview Prescription"}
      </Button>

      {showPreview && (
        <Card>
          <CardContent className="pt-5 space-y-4">
            <div className="border-b-2 border-blue-600 pb-3">
              <h2 className="text-xl font-bold text-blue-800">Dr. Diana Pirjol</h2>
              <p className="text-xs text-gray-500">Medic Specialist · Cabinet Medical</p>
            </div>
            <div className="flex gap-8 text-sm">
              <div><span className="text-xs text-gray-400 uppercase">Patient</span><p className="font-semibold">{patientName || "—"}</p></div>
              <div><span className="text-xs text-gray-400 uppercase">Date</span><p className="font-semibold" suppressHydrationWarning>{new Date().toLocaleDateString()}</p></div>
            </div>
            <p className="text-3xl font-bold text-blue-600">℞</p>
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-blue-50 text-left text-xs uppercase text-gray-500">
                  <th className="p-2">#</th><th className="p-2">Medication</th><th className="p-2">Dosage</th>
                  <th className="p-2">Frequency</th><th className="p-2">Duration</th><th className="p-2">Qty</th>
                </tr>
              </thead>
              <tbody>
                {medications.filter((m) => m.name.trim()).map((med, i) => (
                  <tr key={i} className="border-b">
                    <td className="p-2">{i + 1}</td>
                    <td className="p-2 font-medium">{med.name}</td>
                    <td className="p-2">{med.dosage}</td>
                    <td className="p-2">{med.frequency}</td>
                    <td className="p-2">{med.duration}</td>
                    <td className="p-2">{med.quantity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {generalNotes && (
              <div className="rounded bg-yellow-50 border-l-4 border-yellow-400 p-3 text-sm">
                <strong>Notes:</strong> {generalNotes}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</div>
      )}
      {saved && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">
          Prescription saved successfully!
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <Button onClick={handleSave} disabled={saving} variant="primary" size="lg" className="flex-1">
          {saving ? "Saving..." : "Save Prescription"}
        </Button>
        {saved && (
          <Button onClick={handleDownloadPdf} variant="outline" size="lg">
            Download PDF
          </Button>
        )}
        <Button onClick={() => setReferralOpen(true)} variant="outline" size="lg" title="Refer to specialist or clinic by email">
          Refer
        </Button>
      </div>

      <ReferralModal
        open={referralOpen}
        onClose={() => setReferralOpen(false)}
        documentTitle="Prescription"
        documentContent={medications
          .filter((m) => m.name.trim())
          .map((m) => `${m.name}${m.dosage ? ` ${m.dosage}` : ""}${m.frequency ? ` — ${m.frequency}` : ""}${m.duration ? ` for ${m.duration}` : ""}${m.quantity ? ` (${m.quantity})` : ""}${m.notes ? ` — ${m.notes}` : ""}`)
          .join("\n") + (generalNotes ? `\n\nNotes: ${generalNotes}` : "")}
        documentType="Prescription"
        patientName={patientName || undefined}
      />
    </div>
  );
}
