import { checkAIRateLimit } from "@/lib/rate-limit";

export type AIProvider = "anthropic" | "openai" | "gemini";

export interface AICompletionRequest {
  systemPrompt: string;
  userPrompt: string;
  maxTokens?: number;
  temperature?: number;
  preferredProvider?: AIProvider | "auto";
  /** User ID for rate limiting. If omitted, rate limiting is skipped. */
  userId?: string;
}

export interface AICompletionResult {
  text: string;
  provider: AIProvider;
  model: string;
  fallbackUsed: boolean;
}

export interface AIProviderStatus {
  anthropicConfigured: boolean;
  openaiConfigured: boolean;
  geminiConfigured: boolean;
  anthropicReachable: boolean;
  openaiReachable: boolean;
  geminiReachable: boolean;
  primary: AIProvider | null;
  fallbacks: AIProvider[];
}

const DEFAULT_ANTHROPIC_MODEL = "claude-sonnet-4-20250514";
const DEFAULT_OPENAI_MODEL = "gpt-4o";
const DEFAULT_GEMINI_MODEL = "gemini-2.0-flash";

function resolveProviderOrder(preferredProvider?: AICompletionRequest["preferredProvider"]): AIProvider[] {
  const anthropicConfigured = Boolean(process.env.ANTHROPIC_API_KEY);
  const openaiConfigured = Boolean(process.env.OPENAI_API_KEY);
  const geminiConfigured = Boolean(process.env.GOOGLE_GEMINI_API_KEY);

  if (preferredProvider === "anthropic") return (["anthropic", "openai", "gemini"] as AIProvider[]).filter((p) =>
    p === "anthropic" ? anthropicConfigured : p === "openai" ? openaiConfigured : geminiConfigured
  );
  if (preferredProvider === "openai") return (["openai", "anthropic", "gemini"] as AIProvider[]).filter((p) =>
    p === "anthropic" ? anthropicConfigured : p === "openai" ? openaiConfigured : geminiConfigured
  );
  if (preferredProvider === "gemini") return (["gemini", "anthropic", "openai"] as AIProvider[]).filter((p) =>
    p === "anthropic" ? anthropicConfigured : p === "openai" ? openaiConfigured : geminiConfigured
  );

  const order: AIProvider[] = [];
  if (anthropicConfigured) order.push("anthropic");
  if (openaiConfigured) order.push("openai");
  if (geminiConfigured) order.push("gemini");
  return order;
}

async function callAnthropic(req: AICompletionRequest): Promise<{ text: string; model: string }> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("Anthropic provider is not configured");
  }

  const model = process.env.ANTHROPIC_MODEL || DEFAULT_ANTHROPIC_MODEL;
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: req.maxTokens ?? 2048,
      temperature: req.temperature ?? 0.1,
      system: req.systemPrompt,
      messages: [{ role: "user", content: req.userPrompt }],
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Anthropic request failed (${response.status}): ${detail.slice(0, 250)}`);
  }

  const data = (await response.json()) as { content?: Array<{ text?: string }>; model?: string };
  const text = data.content?.[0]?.text?.trim();

  if (!text) {
    throw new Error("Anthropic returned an empty response");
  }

  return { text, model: data.model || model };
}

async function callOpenAI(req: AICompletionRequest): Promise<{ text: string; model: string }> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OpenAI provider is not configured");
  }

  const model = process.env.OPENAI_MODEL || DEFAULT_OPENAI_MODEL;
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      max_tokens: req.maxTokens ?? 2048,
      temperature: req.temperature ?? 0.1,
      messages: [
        { role: "system", content: req.systemPrompt },
        { role: "user", content: req.userPrompt },
      ],
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`OpenAI request failed (${response.status}): ${detail.slice(0, 250)}`);
  }

  const data = (await response.json()) as { choices?: Array<{ message?: { content?: string } }>; model?: string };
  const text = data.choices?.[0]?.message?.content?.trim();

  if (!text) {
    throw new Error("OpenAI returned an empty response");
  }

  return { text, model: data.model || model };
}

async function callGemini(req: AICompletionRequest): Promise<{ text: string; model: string }> {
  const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Gemini provider is not configured");
  }

  const model = process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL;
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        // systemInstruction is the correct field for system prompts in Gemini API.
        // Concatenating into the user message degrades instruction-following.
        systemInstruction: { parts: [{ text: req.systemPrompt }] },
        contents: [{ role: "user", parts: [{ text: req.userPrompt }] }],
        generationConfig: {
          maxOutputTokens: req.maxTokens ?? 2048,
          temperature: req.temperature ?? 0.1,
        },
      }),
    }
  );

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Gemini request failed (${response.status}): ${detail.slice(0, 250)}`);
  }

  const data = (await response.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

  if (!text) {
    throw new Error("Gemini returned an empty response");
  }

  return { text, model };
}

export async function generateWithFallback(req: AICompletionRequest): Promise<AICompletionResult> {
  if (req.userId) {
    // Single shared bucket for all AI providers per user — label "ai" is the generic tier.
    const limit = checkAIRateLimit(req.userId, "ai");
    if (!limit.allowed) {
      throw new Error(
        `Rate limit exceeded. Try again in ${Math.ceil(limit.resetInMs / 1000)}s.`
      );
    }
  }

  const providerOrder = resolveProviderOrder(req.preferredProvider);

  if (providerOrder.length === 0) {
    throw new Error("No AI providers are configured. Set ANTHROPIC_API_KEY, OPENAI_API_KEY, and/or GOOGLE_GEMINI_API_KEY.");
  }

  const errors: string[] = [];

  for (let i = 0; i < providerOrder.length; i += 1) {
    const provider = providerOrder[i];
    try {
      const result =
        provider === "anthropic"
          ? await callAnthropic(req)
          : provider === "openai"
            ? await callOpenAI(req)
            : await callGemini(req);
      return {
        text: result.text,
        provider,
        model: result.model,
        fallbackUsed: i > 0,
      };
    } catch (err) {
      errors.push(err instanceof Error ? err.message : "Unknown provider error");
    }
  }

  throw new Error(`All AI providers failed: ${errors.join(" | ")}`);
}

async function isAnthropicReachable(): Promise<boolean> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return false;

  try {
    const response = await fetch("https://api.anthropic.com/v1/models", {
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      cache: "no-store",
    });
    return response.ok;
  } catch {
    return false;
  }
}

async function isOpenAIReachable(): Promise<boolean> {
  if (!process.env.OPENAI_API_KEY) return false;
  try {
    const response = await fetch("https://api.openai.com/v1/models", {
      headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
      cache: "no-store",
    });
    return response.ok;
  } catch {
    return false;
  }
}

async function isGeminiReachable(): Promise<boolean> {
  if (!process.env.GOOGLE_GEMINI_API_KEY) return false;
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GOOGLE_GEMINI_API_KEY}`;
    const response = await fetch(url, { cache: "no-store" });
    return response.ok;
  } catch {
    return false;
  }
}

export async function getProviderStatus(): Promise<AIProviderStatus> {
  const anthropicConfigured = Boolean(process.env.ANTHROPIC_API_KEY);
  const openaiConfigured = Boolean(process.env.OPENAI_API_KEY);
  const geminiConfigured = Boolean(process.env.GOOGLE_GEMINI_API_KEY);

  const [anthropicReachable, openaiReachable, geminiReachable] = await Promise.all([
    isAnthropicReachable(),
    isOpenAIReachable(),
    isGeminiReachable(),
  ]);

  const order = resolveProviderOrder();
  const primary = order[0] ?? null;
  const fallbacks = order.slice(1);

  return {
    anthropicConfigured,
    openaiConfigured,
    geminiConfigured,
    anthropicReachable,
    openaiReachable,
    geminiReachable,
    primary,
    fallbacks,
  };
}
