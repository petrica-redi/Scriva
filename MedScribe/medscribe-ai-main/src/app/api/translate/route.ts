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

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as TranslateBody;
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
      maxTokens: 512,
      temperature: 0.1,
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
