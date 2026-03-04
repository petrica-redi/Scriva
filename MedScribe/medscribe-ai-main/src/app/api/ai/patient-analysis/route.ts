import { createClient } from "@/lib/supabase/server";
import { generateWithFallback } from "@/lib/ai/provider";
import { enforceAIRateLimit } from "@/lib/ai/rate-limit";
import { logAuditEvent } from "@/lib/audit";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const limitResult = enforceAIRateLimit(user.id, "generate_note");
    if (!limitResult.allowed) {
      return NextResponse.json(
        { error: "Rate limit exceeded", retryAfterSec: limitResult.retryAfterSec },
        { status: 429 }
      );
    }

    const { patient_id } = await request.json();
    if (!patient_id) {
      return NextResponse.json({ error: "patient_id required" }, { status: 400 });
    }

    const { data: patient, error: pErr } = await supabase
      .from("patients")
      .select("*")
      .eq("id", patient_id)
      .single();

    if (pErr || !patient) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    const { data: consultations } = await supabase
      .from("consultations")
      .select("id, visit_type, status, created_at, recording_duration_seconds, metadata")
      .eq("patient_id", patient_id)
      .order("created_at", { ascending: true });

    const consultationList = consultations || [];
    if (consultationList.length === 0) {
      return NextResponse.json({ error: "No consultations found for this patient" }, { status: 404 });
    }

    const cIds = consultationList.map((c) => c.id);

    const [{ data: notes }, { data: transcripts }, { data: documents }] = await Promise.all([
      supabase
        .from("clinical_notes")
        .select("consultation_id, sections, billing_codes, status, created_at")
        .in("consultation_id", cIds)
        .order("created_at", { ascending: true }),
      supabase
        .from("transcripts")
        .select("consultation_id, full_text, language")
        .in("consultation_id", cIds),
      supabase
        .from("consultation_documents")
        .select("consultation_id, document_type, title, content_text, created_at")
        .in("consultation_id", cIds)
        .eq("status", "active")
        .order("created_at", { ascending: true }),
    ]);

    const noteMap: Record<string, NonNullable<typeof notes>> = {};
    for (const n of notes || []) {
      if (!noteMap[n.consultation_id]) noteMap[n.consultation_id] = [];
      noteMap[n.consultation_id]!.push(n);
    }

    const txMap: Record<string, string> = {};
    for (const t of transcripts || []) {
      if (t.full_text) txMap[t.consultation_id] = t.full_text;
    }

    const docMap: Record<string, NonNullable<typeof documents>> = {};
    for (const d of documents || []) {
      if (!docMap[d.consultation_id]) docMap[d.consultation_id] = [];
      docMap[d.consultation_id]!.push(d);
    }

    let visitSummaries = "";
    for (const c of consultationList) {
      const date = new Date(c.created_at).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
      const meta = (c.metadata || {}) as Record<string, unknown>;
      const diagnosis = meta.diagnosis || meta.primary_diagnosis || "Not documented";
      const icd = meta.icd_code || "";
      const risk = meta.risk_level || meta.risk_status || "not assessed";
      const meds = meta.pending_prescriptions || meta.medications || [];

      visitSummaries += `\n### Visit: ${date} — ${c.visit_type} (${c.status})`;
      visitSummaries += `\nDiagnosis: ${diagnosis}${icd ? ` [${icd}]` : ""}`;
      visitSummaries += `\nRisk: ${risk}`;

      if (Array.isArray(meds) && meds.length > 0) {
        visitSummaries += `\nMedications: ${meds.map((m: Record<string, string>) => `${m.medication || m.name || "?"} ${m.dosage || ""}`).join(", ")}`;
      }

      const cNotes = noteMap[c.id];
      if (cNotes && cNotes.length > 0) {
        for (const note of cNotes) {
          const sections = (note.sections || []) as { title: string; content: string }[];
          for (const s of sections) {
            const content = (s.content || "").slice(0, 500);
            visitSummaries += `\n${s.title}: ${content}`;
          }
          const codes = (note.billing_codes || []) as { code: string; system: string; description: string }[];
          if (codes.length > 0) {
            visitSummaries += `\nBilling codes: ${codes.map((bc) => `${bc.system}:${bc.code} (${bc.description})`).join("; ")}`;
          }
        }
      }

      if (txMap[c.id]) {
        const excerpt = txMap[c.id].slice(0, 800);
        visitSummaries += `\nTranscript excerpt: ${excerpt}`;
      }

      const cDocs = docMap[c.id];
      if (cDocs && cDocs.length > 0) {
        visitSummaries += `\nDocuments: ${cDocs.map((d) => `${d.document_type}: ${d.title}`).join(", ")}`;
      }

      visitSummaries += "\n";
    }

    const systemPrompt = `You are an expert clinical analyst AI assistant. You provide comprehensive, evidence-based retrospective patient analyses for physicians. Your analyses help physicians see the full clinical picture at a glance.

You MUST respond with valid JSON only, no markdown or code blocks. Use the exact structure specified.`;

    const userPrompt = `Perform a comprehensive retrospective analysis of this patient's clinical history.

Patient: ${patient.full_name}
DOB: ${patient.date_of_birth || "Unknown"}
Gender: ${patient.gender || "Unknown"}
MRN: ${patient.mrn || "N/A"}
Total visits: ${consultationList.length}
Date range: ${new Date(consultationList[0].created_at).toLocaleDateString()} — ${new Date(consultationList[consultationList.length - 1].created_at).toLocaleDateString()}

--- CLINICAL HISTORY ---
${visitSummaries}
--- END ---

Analyze the above and return JSON with this structure:
{
  "executive_summary": "2-3 sentence high-level clinical summary",
  "clinical_trajectory": {
    "trend": "improving" | "stable" | "worsening" | "fluctuating",
    "description": "Description of how the patient's condition has evolved over time"
  },
  "diagnoses": [
    {
      "name": "Diagnosis name",
      "icd_code": "ICD-10 code if available",
      "first_noted": "Date first noted",
      "status": "active" | "resolved" | "monitoring",
      "severity": "mild" | "moderate" | "severe"
    }
  ],
  "medication_review": {
    "current_medications": [
      {
        "name": "Drug name",
        "dosage": "Dosage",
        "indication": "Why prescribed",
        "effectiveness": "effective" | "partially_effective" | "ineffective" | "unknown"
      }
    ],
    "potential_interactions": ["List any drug interactions of concern"],
    "optimization_suggestions": ["Suggestions for medication optimization"]
  },
  "risk_assessment": {
    "current_level": "low" | "medium" | "high" | "critical",
    "trajectory": "improving" | "stable" | "worsening",
    "factors": [
      { "factor": "Risk factor description", "severity": "low" | "medium" | "high" | "critical" }
    ]
  },
  "treatment_effectiveness": {
    "score": 1-10,
    "summary": "Assessment of how well current treatments are working",
    "what_is_working": ["List of effective interventions"],
    "areas_for_improvement": ["List of areas that could be improved"]
  },
  "red_flags": [
    { "flag": "Description of concern", "urgency": "immediate" | "soon" | "monitor", "recommendation": "What to do" }
  ],
  "recommended_actions": [
    { "action": "Specific action to take", "priority": "high" | "medium" | "low", "rationale": "Why this matters" }
  ],
  "patient_compliance": {
    "assessment": "good" | "moderate" | "poor" | "unknown",
    "notes": "Observations about patient adherence"
  },
  "follow_up": {
    "recommended_interval": "e.g. 2 weeks, 1 month",
    "focus_areas": ["What to focus on at next visit"],
    "tests_needed": ["Any tests or labs to order"]
  }
}

Be thorough but ground everything in the clinical data provided. If information is insufficient for a section, state that clearly rather than guessing. Prioritize clinically actionable insights.`;

    const aiResult = await generateWithFallback({
      systemPrompt,
      userPrompt,
      maxTokens: 4096,
      temperature: 0.2,
      preferredProvider: "auto",
    });

    let analysis;
    try {
      const cleanJson = aiResult.text
        .replace(/^```json?\s*/i, "")
        .replace(/\s*```$/i, "")
        .trim();
      analysis = JSON.parse(cleanJson);
    } catch {
      return NextResponse.json(
        { error: "Failed to parse AI analysis", raw: aiResult.text.slice(0, 500) },
        { status: 500 }
      );
    }

    await logAuditEvent(
      supabase,
      user.id,
      "ai_generate_note",
      "patient",
      patient_id,
      {
        type: "retrospective_analysis",
        provider: aiResult.provider,
        model: aiResult.model,
        consultation_count: consultationList.length,
      }
    );

    return NextResponse.json({
      analysis,
      meta: {
        patient_id,
        patient_name: patient.full_name,
        consultation_count: consultationList.length,
        date_range: {
          from: consultationList[0].created_at,
          to: consultationList[consultationList.length - 1].created_at,
        },
        ai_provider: aiResult.provider,
        ai_model: aiResult.model,
        generated_at: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("[PatientAnalysis] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
