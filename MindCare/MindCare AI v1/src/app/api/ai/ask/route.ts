import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/utils/rate-limit";

export async function POST(request: NextRequest) {
  try {
    // Rate limit: 20 requests per minute per IP
    const clientIp = request.headers.get("x-forwarded-for") || "unknown";
    const rl = rateLimit(`ai-ask:${clientIp}`, { limit: 20, windowSeconds: 60 });
    if (!rl.success) {
      return NextResponse.json(
        { error: "Too many requests. Please wait." },
        { status: 429, headers: { "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } }
      );
    }

    const { query, context } = await request.json();

    if (!query || typeof query !== "string") {
      return NextResponse.json({ error: "Query is required" }, { status: 400 });
    }

    const mistralApiKey = process.env.MISTRAL_API_KEY;
    if (!mistralApiKey) {
      return NextResponse.json({ error: "Mistral API key not configured" }, { status: 500 });
    }

    const systemPrompt = `You are an AI Clinical Assistant for physicians. You provide evidence-based medical information, help with differential diagnoses, medication information, clinical guidelines, and coding assistance.

IMPORTANT GUIDELINES:
- Always provide evidence-based responses with references to current medical guidelines where appropriate
- Include ICD-10 codes when discussing diagnoses
- Mention drug interactions and contraindications when discussing medications
- Be thorough but concise
- If patient context is provided, tailor your response to that patient's history
- Format responses clearly with sections, bullet points, and key information highlighted
- Always include a disclaimer that AI suggestions should be verified by the clinician
- If you don't know something, say so rather than speculating

${context ? "CONTEXT:" + context : ""}`;

    const { Mistral } = await import("@mistralai/mistralai");
    const mistralClient = new Mistral({ apiKey: mistralApiKey });

    let mistralResponse;
    try {
      mistralResponse = await mistralClient.chat.complete({
        model: "mistral-small-latest",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: query },
        ],
        maxTokens: 2048,
      });
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.error("[AI Ask] Mistral error:", errMsg);
      return NextResponse.json({ error: "AI service error" }, { status: 502 });
    }

    const responseText = typeof mistralResponse.choices?.[0]?.message?.content === 'string'
      ? mistralResponse.choices[0].message.content
      : "No response generated.";

    return NextResponse.json({ response: responseText });
  } catch (err) {
    console.error("AI Ask error:", err);
    return NextResponse.json(
      { error: "Failed to process AI request" },
      { status: 500 }
    );
  }
}
