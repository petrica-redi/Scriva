import { checkAIRateLimit } from "@/lib/rate-limit";

export type AIProvider = "anthropic" | "ollama";

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
  ollamaConfigured: boolean;
  anthropicReachable: boolean;
  ollamaReachable: boolean;
  primary: AIProvider | null;
  fallback: AIProvider | null;
  ollamaModel: string;
}

const DEFAULT_OLLAMA_URL = "http://localhost:11434";
const DEFAULT_OLLAMA_MODEL = "medllama2:latest";
const DEFAULT_ANTHROPIC_MODEL = "claude-sonnet-4-20250514";

function getOllamaConfig() {
  const baseUrl = (process.env.OLLAMA_BASE_URL || DEFAULT_OLLAMA_URL).replace(/\/$/, "");
  const model = process.env.OLLAMA_MEDICAL_MODEL || DEFAULT_OLLAMA_MODEL;
  return { baseUrl, model };
}

function resolveProviderOrder(preferredProvider?: AICompletionRequest["preferredProvider"]): AIProvider[] {
  const anthropicConfigured = Boolean(process.env.ANTHROPIC_API_KEY);
  const { baseUrl } = getOllamaConfig();
  const ollamaConfigured = Boolean(baseUrl);

  if (preferredProvider === "anthropic") return ["anthropic", "ollama"];
  if (preferredProvider === "ollama") return ["ollama", "anthropic"];

  if (anthropicConfigured && ollamaConfigured) return ["anthropic", "ollama"];
  if (anthropicConfigured) return ["anthropic"];
  if (ollamaConfigured) return ["ollama"];
  return [];
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

async function callOllama(req: AICompletionRequest): Promise<{ text: string; model: string }> {
  const { baseUrl, model } = getOllamaConfig();

  const response = await fetch(`${baseUrl}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      stream: false,
      prompt: `${req.systemPrompt}\n\nUser request:\n${req.userPrompt}`,
      options: {
        temperature: req.temperature ?? 0.1,
        num_predict: req.maxTokens ?? 2048,
      },
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Ollama request failed (${response.status}): ${detail.slice(0, 250)}`);
  }

  const data = (await response.json()) as { response?: string; message?: { content?: string } };
  const text = (data.response || data.message?.content || "").trim();

  if (!text) {
    throw new Error("Ollama returned an empty response");
  }

  return { text, model };
}

export async function generateWithFallback(req: AICompletionRequest): Promise<AICompletionResult> {
  if (req.userId) {
    const limit = checkAIRateLimit(req.userId, "anthropic");
    if (!limit.allowed) {
      throw new Error(
        `Rate limit exceeded: maximum 5 AI requests per minute. Try again in ${Math.ceil(limit.resetInMs / 1000)}s.`
      );
    }
  }

  const providerOrder = resolveProviderOrder(req.preferredProvider);

  if (providerOrder.length === 0) {
    throw new Error("No AI providers are configured. Set ANTHROPIC_API_KEY and/or OLLAMA_BASE_URL.");
  }

  const errors: string[] = [];

  for (let i = 0; i < providerOrder.length; i += 1) {
    const provider = providerOrder[i];
    try {
      const result = provider === "anthropic" ? await callAnthropic(req) : await callOllama(req);
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

async function isOllamaReachable(): Promise<boolean> {
  const { baseUrl } = getOllamaConfig();
  try {
    const response = await fetch(`${baseUrl}/api/tags`, { cache: "no-store" });
    return response.ok;
  } catch {
    return false;
  }
}

export async function getProviderStatus(): Promise<AIProviderStatus> {
  const anthropicConfigured = Boolean(process.env.ANTHROPIC_API_KEY);
  const { baseUrl, model } = getOllamaConfig();
  const ollamaConfigured = Boolean(baseUrl);

  const [anthropicReachable, ollamaReachable] = await Promise.all([
    isAnthropicReachable(),
    isOllamaReachable(),
  ]);

  const primary = anthropicConfigured ? "anthropic" : ollamaConfigured ? "ollama" : null;
  const fallback = anthropicConfigured && ollamaConfigured ? "ollama" : null;

  return {
    anthropicConfigured,
    ollamaConfigured,
    anthropicReachable,
    ollamaReachable,
    primary,
    fallback,
    ollamaModel: model,
  };
}
