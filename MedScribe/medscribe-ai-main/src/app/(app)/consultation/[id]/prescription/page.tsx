"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";

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
  const [patientName, setPatientName] = useState("");

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const supabase = createClient();

  const loadConsultation = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("consultations")
      .select("metadata")
      .eq("id", consultationId)
      .single();
    if (data?.metadata) {
      const meta = data.metadata as Record<string, unknown>;
      if (typeof meta.patient_name === "string") setPatientName(meta.patient_name);
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
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save prescription");
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadPdf = () => {
    window.open(`/api/prescriptions/pdf?consultation_id=${consultationId}`, "_blank");
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
              <div><span className="text-xs text-gray-400 uppercase">Date</span><p className="font-semibold">{new Date().toLocaleDateString()}</p></div>
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

      <div className="flex gap-3">
        <Button onClick={handleSave} disabled={saving} variant="primary" size="lg" className="flex-1">
          {saving ? "Saving..." : "Save Prescription"}
        </Button>
        {saved && (
          <Button onClick={handleDownloadPdf} variant="outline" size="lg" className="flex-1">
            Download PDF
          </Button>
        )}
      </div>
    </div>
  );
}
