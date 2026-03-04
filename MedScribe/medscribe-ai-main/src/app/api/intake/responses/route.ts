import { createClient } from "@/lib/supabase/server";
import { generateWithFallback } from "@/lib/ai/provider";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formId = request.nextUrl.searchParams.get("form_id");
    const status = request.nextUrl.searchParams.get("status");

    let query = supabase.from("intake_responses").select("*");

    if (formId) {
      query = query.eq("form_id", formId);
    }
    if (status) {
      query = query.eq("status", status);
    }

    query = query.order("submitted_at", { ascending: false }).limit(50);

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: "Failed to fetch responses" }, { status: 500 });
    }

    return NextResponse.json({ data: data || [] });
  } catch (err) {
    console.error("Intake responses GET error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();
    const { form_id, respondent_name, respondent_email, responses, patient_id } = body;

    if (!form_id || !responses) {
      return NextResponse.json({ error: "form_id and responses are required" }, { status: 400 });
    }

    // Get the form to understand questions for triage
    const { data: form } = await supabase.from("intake_forms").select("*").eq("id", form_id).single();

    if (!form) {
      return NextResponse.json({ error: "Form not found" }, { status: 404 });
    }

    // AI triage analysis
    let triage_result = null;
    let ai_summary = null;

    try {
      const questionsText = (form.questions as Array<{ text: string; id: string }>)
        .map((q) => `Q: ${q.text}\nA: ${responses[q.id] || "Not answered"}`)
        .join("\n\n");

      const aiResult = await generateWithFallback({
        systemPrompt: `You are a medical intake triage system. Analyze patient intake responses and provide:
1. Urgency level: emergency, urgent, routine, or non_urgent
2. Brief reasoning
3. Recommended action
4. A concise clinical summary of the patient's reported symptoms and history

Respond in JSON: {"urgency": "...", "reasoning": "...", "recommended_action": "...", "summary": "..."}`,
        userPrompt: questionsText,
        maxTokens: 500,
        temperature: 0.1,
      });

      const jsonMatch = aiResult.text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        triage_result = { urgency: parsed.urgency, reasoning: parsed.reasoning, recommended_action: parsed.recommended_action };
        ai_summary = parsed.summary;
      }
    } catch {
      // Triage is optional, continue without it
    }

    const { data, error } = await supabase
      .from("intake_responses")
      .insert({
        form_id,
        patient_id: patient_id || null,
        respondent_name: respondent_name || null,
        respondent_email: respondent_email || null,
        responses,
        triage_result,
        ai_summary,
        status: "submitted",
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: "Failed to submit response" }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    console.error("Intake responses POST error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
