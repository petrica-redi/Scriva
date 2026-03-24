import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateWithFallback } from "@/lib/ai/provider";

export const dynamic = "force-dynamic";

const LANGUAGE_NAMES: Record<string, string> = {
  en: "English",
  fr: "French",
  de: "German",
  ro: "Romanian",
  it: "Italian",
  nl: "Dutch",
  es: "Spanish",
  pt: "Portuguese",
  pl: "Polish",
  cs: "Czech",
  hu: "Hungarian",
  bg: "Bulgarian",
  el: "Greek",
  sv: "Swedish",
  da: "Danish",
  fi: "Finnish",
  sk: "Slovak",
  hr: "Croatian",
  sl: "Slovenian",
  et: "Estonian",
  lv: "Latvian",
  lt: "Lithuanian",
  ga: "Irish",
  mt: "Maltese",
  ar: "Arabic",
  zh: "Chinese",
  ja: "Japanese",
  ko: "Korean",
  hi: "Hindi",
  tr: "Turkish",
  ru: "Russian",
  uk: "Ukrainian",
};

function langName(code: string): string {
  return LANGUAGE_NAMES[code.toLowerCase()] ?? code.toUpperCase();
}

interface TranslateBody {
  text: string;
  fromLang: string;
  toLang: string;
}

interface BatchTranslateBody {
  segments: Array<{ key: string; text: string }>;
  fromLang: string;
  toLang: string;
}

type RequestBody = TranslateBody | BatchTranslateBody;

function isBatch(body: RequestBody): body is BatchTranslateBody {
  return "segments" in body && Array.isArray(body.segments);
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as RequestBody;

    if (isBatch(body)) {
      const { segments, fromLang, toLang } = body;

      if (!segments?.length || !fromLang || !toLang) {
        return NextResponse.json(
          { error: "Missing required fields: segments, fromLang, toLang" },
          { status: 400 }
        );
      }

      if (fromLang.toLowerCase() === toLang.toLowerCase()) {
        const results = Object.fromEntries(segments.map((s) => [s.key, s.text]));
        return NextResponse.json({ translations: results });
      }

      const combined = segments.map((s, i) => `[${i}] ${s.text}`).join("\n");
      const result = await generateWithFallback({
        systemPrompt: `You are a medical interpreter. Translate each numbered line from ${langName(fromLang)} to ${langName(toLang)}. Keep the [number] prefix on each line. Return ONLY the translations, one per line, nothing else.`,
        userPrompt: combined,
        maxTokens: 1024,
        temperature: 0,
        preferredProvider: "openai",
        modelOverride: "gpt-4o-mini",
        userId: user.id,
      });

      const lines = result.text.split("\n").filter((l) => l.trim());
      const results: Record<string, string> = {};
      for (const line of lines) {
        const match = line.match(/^\[(\d+)\]\s*(.+)$/);
        if (match) {
          const idx = parseInt(match[1], 10);
          if (idx < segments.length) {
            results[segments[idx].key] = match[2].trim();
          }
        }
      }
      // Fallback: if parsing failed, try to match by order
      if (Object.keys(results).length === 0 && lines.length === segments.length) {
        for (let i = 0; i < segments.length; i++) {
          results[segments[i].key] = lines[i].replace(/^\[\d+\]\s*/, "").trim();
        }
      }

      return NextResponse.json({ translations: results, provider: result.provider });
    }

    // Single translation
    const { text, fromLang, toLang } = body;

    if (!text?.trim() || !fromLang || !toLang) {
      return NextResponse.json(
        { error: "Missing required fields: text, fromLang, toLang" },
        { status: 400 }
      );
    }

    if (fromLang.toLowerCase() === toLang.toLowerCase()) {
      return NextResponse.json({ translatedText: text });
    }

    const result = await generateWithFallback({
      systemPrompt: `You are a medical interpreter. Translate the following from ${langName(fromLang)} to ${langName(toLang)}. Return ONLY the translation, nothing else — no quotes, no explanation, no preamble.`,
      userPrompt: text,
      maxTokens: 256,
      temperature: 0,
      preferredProvider: "openai",
      modelOverride: "gpt-4o-mini",
      userId: user.id,
    });

    return NextResponse.json({
      translatedText: result.text,
      provider: result.provider,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Translation failed";
    const status = message.includes("Rate limit") ? 429 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
