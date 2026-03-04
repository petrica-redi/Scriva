import { createClient } from "@/lib/supabase/server";
import { generateWithFallback } from "@/lib/ai/provider";
import { enforceAIRateLimit } from "@/lib/ai/rate-limit";
import { logAuditEvent } from "@/lib/audit";
import { pseudonymize, dePseudonymize } from "@/lib/pseudonymize";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const limitResult = enforceAIRateLimit(user.id, "analyze");
    if (!limitResult.allowed) {
      return NextResponse.json(
        { error: "Rate limit exceeded", retryAfterSec: limitResult.retryAfterSec },
        { status: 429 }
      );
    }

    const { transcript, medications, patient_history, consultation_id, patient_id } = await request.json();

    if (!transcript || typeof transcript !== "string") {
      return NextResponse.json({ error: "Transcript is required" }, { status: 400 });
    }

    // Check drug interactions from database
    let dbInteractions: Array<Record<string, unknown>> = [];
    if (medications && Array.isArray(medications) && medications.length > 1) {
      const { data } = await supabase
        .from("drug_interactions")
        .select("*")
        .or(
          medications.flatMap((med: string, i: number) =>
            medications.slice(i + 1).map((med2: string) =>
              `and(drug_a.ilike.%${med}%,drug_b.ilike.%${med2}%),and(drug_a.ilike.%${med2}%,drug_b.ilike.%${med}%)`
            )
          ).join(",")
        );
      dbInteractions = data || [];
    }

    const { pseudonymizedText, mappings } = pseudonymize(
      `TRANSCRIPT:\n${transcript}\n\nMEDICATIONS: ${(medications || []).join(", ")}\n\nHISTORY: ${patient_history || "None provided"}`
    );

    const systemPrompt = `You are a Clinical Decision Support system. Analyze the consultation and provide:

1. DIFFERENTIAL DIAGNOSES: Based on symptoms discussed, provide ranked differential diagnoses with ICD-10 codes and confidence levels.
2. DRUG INTERACTIONS: Flag any potential drug interactions between current and discussed medications.
3. GUIDELINE NUDGES: Suggest evidence-based clinical guidelines relevant to the presentation.
4. RED FLAGS: Identify any concerning symptoms or findings that warrant urgent attention.
5. MISSING SCREENINGS: Based on patient demographics and conditions, flag any overdue preventive screenings.

Respond in JSON format:
{
  "differentials": [{"diagnosis": "...", "icd10": "...", "confidence": 0.0-1.0, "reasoning": "..."}],
  "drug_interactions": [{"drugs": ["...", "..."], "severity": "critical|major|moderate|minor", "description": "...", "recommendation": "..."}],
  "guideline_nudges": [{"guideline": "...", "source": "...", "relevance": "..."}],
  "red_flags": [{"finding": "...", "urgency": "immediate|urgent|routine", "recommended_action": "..."}],
  "missing_screenings": [{"screening": "...", "reason": "...", "guideline_source": "..."}]
}`;

    const aiResult = await generateWithFallback({
      systemPrompt,
      userPrompt: pseudonymizedText,
      maxTokens: 3000,
      temperature: 0.1,
      preferredProvider: "auto",
    });

    let parsed;
    try {
      const jsonMatch = aiResult.text.match(/\{[\s\S]*\}/);
      parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : { raw: aiResult.text };
    } catch {
      parsed = { raw: dePseudonymize(aiResult.text, mappings) };
    }

    // Store significant alerts in database
    const alerts = [];
    
    if (parsed.red_flags) {
      for (const flag of parsed.red_flags) {
        alerts.push({
          user_id: user.id,
          consultation_id: consultation_id || null,
          patient_id: patient_id || null,
          alert_type: "red_flag",
          severity: flag.urgency === "immediate" ? "critical" : flag.urgency === "urgent" ? "high" : "medium",
          title: flag.finding,
          description: flag.recommended_action,
          evidence_source: "AI Clinical Decision Support",
          metadata: { full_analysis: flag },
        });
      }
    }

    if (parsed.drug_interactions) {
      for (const interaction of parsed.drug_interactions) {
        if (interaction.severity === "critical" || interaction.severity === "major") {
          alerts.push({
            user_id: user.id,
            consultation_id: consultation_id || null,
            patient_id: patient_id || null,
            alert_type: "drug_interaction",
            severity: interaction.severity === "critical" ? "critical" : "high",
            title: `Drug Interaction: ${interaction.drugs.join(" + ")}`,
            description: interaction.description,
            evidence_source: interaction.recommendation,
            metadata: { full_analysis: interaction },
          });
        }
      }
    }

    if (alerts.length > 0) {
      await supabase.from("clinical_alerts").insert(alerts);
    }

    await logAuditEvent(supabase, user.id, "ai_clinical_decision_support", "consultation", consultation_id || crypto.randomUUID(), {
      provider: aiResult.provider,
      model: aiResult.model,
      alerts_generated: alerts.length,
    });

    // Merge DB interactions with AI-detected ones
    const allInteractions = [
      ...(parsed.drug_interactions || []),
      ...dbInteractions.map((i) => ({
        drugs: [i.drug_a, i.drug_b],
        severity: i.severity,
        description: i.description,
        recommendation: i.recommendation,
        source: "database",
      })),
    ];

    return NextResponse.json({
      differentials: parsed.differentials || [],
      drug_interactions: allInteractions,
      guideline_nudges: parsed.guideline_nudges || [],
      red_flags: parsed.red_flags || [],
      missing_screenings: parsed.missing_screenings || [],
      alerts_stored: alerts.length,
      provider: aiResult.provider,
      model: aiResult.model,
    });
  } catch (err) {
    console.error("Clinical Decision Support error:", err);
    return NextResponse.json({ error: "Failed to process CDS request" }, { status: 500 });
  }
}
