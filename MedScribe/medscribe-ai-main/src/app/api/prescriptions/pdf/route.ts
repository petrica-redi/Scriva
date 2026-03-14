import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

interface Medication {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  quantity: string;
  notes: string;
}

interface Prescription {
  id: string;
  medications: Medication[];
  notes: string;
  created_at: string;
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const consultationId = searchParams.get("consultation_id");
    const prescriptionId = searchParams.get("prescription_id");

    if (!consultationId) {
      return NextResponse.json({ error: "consultation_id required" }, { status: 400 });
    }

    const { data: consultation, error } = await supabase
      .from("consultations")
      .select("metadata")
      .eq("id", consultationId)
      .eq("user_id", user.id)
      .single();

    if (error || !consultation) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const metadata = (consultation.metadata || {}) as Record<string, unknown>;
    const prescriptions = (Array.isArray(metadata.prescriptions) ? metadata.prescriptions : []) as Prescription[];

    const prescription = prescriptionId
      ? prescriptions.find((p) => p.id === prescriptionId)
      : prescriptions[prescriptions.length - 1];

    if (!prescription) {
      return NextResponse.json({ error: "No prescription found" }, { status: 404 });
    }

    const patientName = (metadata.patient_name as string) || "Patient";
    const patientDob = (metadata.patient_dob as string) || "N/A";
    const date = new Date(prescription.created_at).toLocaleDateString("en-GB", {
      day: "2-digit", month: "long", year: "numeric",
    });

    const medicationsHtml = prescription.medications
      .map(
        (med: Medication, i: number) => `
        <tr>
          <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;">${i + 1}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;font-weight:600;">${escapeHtml(med.name)}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;">${escapeHtml(med.dosage)}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;">${escapeHtml(med.frequency)}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;">${escapeHtml(med.duration)}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;">${escapeHtml(med.quantity)}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;">${escapeHtml(med.notes || "—")}</td>
        </tr>`
      )
      .join("");

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Prescription - ${escapeHtml(patientName)}</title>
  <style>
    @media print { body { margin: 0; } }
    body { font-family: 'Segoe UI', system-ui, sans-serif; color: #1f2937; max-width: 800px; margin: 0 auto; padding: 40px; }
    .header { border-bottom: 3px solid #2563eb; padding-bottom: 20px; margin-bottom: 30px; }
    .doctor-name { font-size: 24px; font-weight: 700; color: #1e40af; }
    .doctor-info { font-size: 13px; color: #6b7280; margin-top: 4px; }
    .rx-symbol { font-size: 36px; color: #2563eb; font-weight: 700; margin: 20px 0 10px; }
    table { width: 100%; border-collapse: collapse; font-size: 14px; }
    th { background: #f0f4ff; padding: 10px 12px; text-align: left; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; color: #4b5563; border-bottom: 2px solid #2563eb; }
    .patient-info { display: flex; gap: 40px; margin-bottom: 20px; }
    .patient-info div { }
    .patient-info .label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #9ca3af; }
    .patient-info .value { font-size: 15px; font-weight: 600; }
    .notes { margin-top: 24px; padding: 16px; background: #fefce8; border-radius: 8px; border-left: 4px solid #eab308; font-size: 14px; }
    .signature { margin-top: 60px; display: flex; justify-content: space-between; }
    .signature-line { border-top: 1px solid #d1d5db; width: 200px; padding-top: 8px; font-size: 13px; color: #6b7280; }
    .footer { margin-top: 40px; text-align: center; font-size: 11px; color: #9ca3af; border-top: 1px solid #e5e7eb; padding-top: 16px; }
  </style>
</head>
<body>
  <div class="header">
    <div class="doctor-name">Dr. Diana Pirjol</div>
    <div class="doctor-info">Medic Specialist · Cabinet Medical</div>
    <div class="doctor-info">Contact: office@medscribe.ai</div>
  </div>

  <div class="patient-info">
    <div><div class="label">Patient</div><div class="value">${escapeHtml(patientName)}</div></div>
    <div><div class="label">Date of Birth</div><div class="value">${escapeHtml(patientDob)}</div></div>
    <div><div class="label">Date</div><div class="value">${escapeHtml(date)}</div></div>
  </div>

  <div class="rx-symbol">℞</div>

  <table>
    <thead>
      <tr>
        <th>#</th><th>Medication</th><th>Dosage</th><th>Frequency</th><th>Duration</th><th>Qty</th><th>Notes</th>
      </tr>
    </thead>
    <tbody>${medicationsHtml}</tbody>
  </table>

  ${prescription.notes ? `<div class="notes"><strong>Additional Instructions:</strong><br/>${escapeHtml(prescription.notes)}</div>` : ""}

  <div class="signature">
    <div class="signature-line">Dr. Diana Pirjol<br/>Signature & Stamp</div>
    <div class="signature-line">Date: ${escapeHtml(date)}</div>
  </div>

  <div class="footer">Generated by Scriva · This is a medical document</div>
</body>
</html>`;

    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Disposition": `attachment; filename="prescription-${consultationId}.html"`,
      },
    });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
