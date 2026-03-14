import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** Normalized transcript shape returned by this API (any STT provider). */
interface NormalizedTranscript {
  segments: Array<{ speaker: number; text: string; start_time: number; end_time: number; confidence?: number }>;
  full_text: string;
  model: string;
  multichannel?: boolean;
  duration?: number;
}

// ---------------------------------------------------------------------------
// STT Fallback 1: OpenAI gpt-4o-mini-transcribe
// ---------------------------------------------------------------------------
// IMPORTANT: gpt-4o-mini-transcribe only supports response_format=json or text.
// verbose_json (which provides word timestamps) is NOT available.
// The response is { text: string } — we produce one segment covering the full audio.
// ---------------------------------------------------------------------------
async function transcribeWithOpenAI(
  audioBlob: Blob,
  language: string,
  _isMultichannel: boolean
): Promise<NormalizedTranscript | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const langCode = language.startsWith("en") ? "en" : language.slice(0, 2);

  const formData = new FormData();
  formData.append("file", audioBlob, "audio.webm");
  formData.append("model", "gpt-4o-mini-transcribe");
  formData.append("response_format", "json");
  formData.append("language", langCode);

  const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: formData,
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenAI gpt-4o-mini-transcribe failed (${response.status}): ${err.slice(0, 200)}`);
  }

  const data = (await response.json()) as { text?: string };
  const fullText = data.text?.trim() ?? "";

  if (!fullText) {
    throw new Error("OpenAI gpt-4o-mini-transcribe returned empty transcript");
  }

  // No timestamp data available from this model — single segment, speaker 0.
  return {
    segments: [{ speaker: 0, text: fullText, start_time: 0, end_time: 0, confidence: 1 }],
    full_text: fullText,
    model: "gpt-4o-mini-transcribe",
    multichannel: false,
    duration: 0,
  };
}

// ---------------------------------------------------------------------------
// STT Fallback 2: Google Cloud Speech-to-Text v1
// ---------------------------------------------------------------------------
// Uses medical_conversation model for English (supports 2-speaker diarization
// with speakerTag) and latest_long for other languages (no medical model).
//
// KNOWN LIMIT: The v1 synchronous endpoint accepts a maximum of 60 seconds of
// audio in the inline content field. Recordings longer than ~60s will be
// rejected by the API. We skip rather than attempt when audio > 7 MB to avoid
// sending a request that will fail with a confusing error.
//
// Requires env: GOOGLE_CLOUD_STT_API_KEY (enable Speech-to-Text API in GCP).
// ---------------------------------------------------------------------------
const GOOGLE_STT_MAX_BYTES = 7 * 1024 * 1024; // ~7 MB — proxy for ≤60s audio

async function transcribeWithGoogleSTT(
  audioBlob: Blob,
  language: string,
  _isMultichannel: boolean
): Promise<NormalizedTranscript | null> {
  const apiKey = process.env.GOOGLE_CLOUD_STT_API_KEY;
  if (!apiKey) return null;

  if (audioBlob.size > GOOGLE_STT_MAX_BYTES) {
    console.warn(
      `[Google STT] Skipping — audio (${(audioBlob.size / 1024 / 1024).toFixed(1)} MB) exceeds the 60s/7MB sync limit.`
    );
    return null;
  }

  const isEnglish = language === "en" || language.startsWith("en-");

  // Normalise to a BCP-47 tag with region (Google STT requires region codes).
  const langCode = isEnglish
    ? "en-US"
    : language.includes("-")
      ? language
      : `${language.slice(0, 2)}-${language.slice(0, 2).toUpperCase()}`;

  // medical_conversation: English-only, 2-speaker diarization.
  // latest_long: all other languages, no diarization.
  const model = isEnglish ? "medical_conversation" : "latest_long";

  const arrayBuffer = await audioBlob.arrayBuffer();
  const base64Audio = Buffer.from(arrayBuffer).toString("base64");

  const requestBody = {
    config: {
      // WEBM_OPUS is detected from the container header; omit sampleRateHertz.
      encoding: "WEBM_OPUS",
      languageCode: langCode,
      model,
      enableWordTimeOffsets: true,
      enableAutomaticPunctuation: true,
      ...(isEnglish
        ? { enableSpeakerDiarization: true, diarizationSpeakerCount: 2 }
        : {}),
    },
    audio: { content: base64Audio },
  };

  const response = await fetch(
    `https://speech.googleapis.com/v1/speech:recognize?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    }
  );

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Google STT (${model}) failed (${response.status}): ${err.slice(0, 200)}`);
  }

  type GWord = { word?: string; startTime?: string; endTime?: string; speakerTag?: number };
  type GResult = { alternatives?: Array<{ transcript?: string; confidence?: number; words?: GWord[] }> };
  const data = (await response.json()) as { results?: GResult[] };

  const allResults = data.results ?? [];
  const fullText = allResults
    .map((r) => r.alternatives?.[0]?.transcript ?? "")
    .join(" ")
    .trim();

  if (!fullText) {
    throw new Error("Google STT returned empty transcript");
  }

  function parseTimeSec(s?: string): number {
    if (!s) return 0;
    return parseFloat(s.replace("s", "")) || 0;
  }

  // Build segments by grouping consecutive words with the same speakerTag.
  const segments: NormalizedTranscript["segments"] = [];

  for (const result of allResults) {
    const alt = result.alternatives?.[0];
    if (!alt) continue;

    const words = alt.words ?? [];

    if (words.length === 0) {
      if (alt.transcript?.trim()) {
        segments.push({
          speaker: 0,
          text: alt.transcript.trim(),
          start_time: 0,
          end_time: 0,
          confidence: alt.confidence ?? 1,
        });
      }
      continue;
    }

    let curSpeaker = words[0].speakerTag ?? 0;
    let curWords: string[] = [];
    let segStart = parseTimeSec(words[0].startTime);
    let segEnd = 0;

    for (const w of words) {
      const spk = w.speakerTag ?? 0;
      const wordEnd = parseTimeSec(w.endTime);

      if (spk !== curSpeaker && curWords.length > 0) {
        segments.push({
          // Google uses 1-indexed speakerTag; map to 0-indexed.
          speaker: Math.max(0, curSpeaker - 1),
          text: curWords.join(" "),
          start_time: segStart,
          end_time: segEnd,
          confidence: alt.confidence ?? 1,
        });
        curSpeaker = spk;
        curWords = [];
        segStart = parseTimeSec(w.startTime);
      }

      curWords.push(w.word ?? "");
      segEnd = wordEnd;
    }

    if (curWords.length > 0) {
      segments.push({
        speaker: Math.max(0, curSpeaker - 1),
        text: curWords.join(" "),
        start_time: segStart,
        end_time: segEnd,
        confidence: alt.confidence ?? 1,
      });
    }
  }

  if (segments.length === 0) {
    segments.push({ speaker: 0, text: fullText, start_time: 0, end_time: 0, confidence: 1 });
  }

  return {
    segments,
    full_text: fullText,
    model: `google-stt-${model}`,
    multichannel: false,
    duration: 0,
  };
}

/**
 * POST /api/deepgram/transcribe
 * Receives audio from the browser, sends it to Deepgram's REST API for transcription.
 * Returns the full transcript with speaker diarization or multichannel separation.
 *
 * Supports two modes (determined by X-Audio-Mode header):
 *
 * 1. Default (mono / in-person): diarize=true, utterances=true
 *    - Deepgram identifies speakers from a single audio channel
 *
 * 2. Multichannel (stereo / remote video call): multichannel=true, channels=2
 *    - Channel 0 = Doctor (microphone), Channel 1 = Patient (tab audio)
 *    - Each channel is transcribed independently for perfect speaker separation
 *    - diarize and multichannel are mutually exclusive in Deepgram's API
 */
export async function POST(request: NextRequest) {
  try {
    // Auth check
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get the audio data from the request
    const audioBlob = await request.blob();

    if (!audioBlob || audioBlob.size === 0) {
      return NextResponse.json(
        { error: "No audio data provided" },
        { status: 400 }
      );
    }

    const MAX_AUDIO_SIZE = 25 * 1024 * 1024; // 25MB
    if (audioBlob.size > MAX_AUDIO_SIZE) {
      return NextResponse.json(
        { error: "Audio file exceeds 25MB limit" },
        { status: 413 }
      );
    }

    // Determine audio mode and language from headers
    const audioMode = request.headers.get("X-Audio-Mode");
    const isMultichannel = audioMode === "multichannel";
    const language = request.headers.get("X-Audio-Language") || "en";

    // nova-3-medical only supports English; use nova-3 (general) for all other languages
    const isEnglish = language === "en" || language.startsWith("en-");
    const primaryModel = isEnglish ? "nova-3-medical" : "nova-3";

    const apiKey = process.env.DEEPGRAM_API_KEY;

    // ── Deepgram primary + nova-2 fallback ────────────────────────────────────
    // Only attempted when DEEPGRAM_API_KEY is configured.  If the key is absent
    // or all Deepgram attempts fail, execution falls through to the STT fallback
    // chain below (OpenAI → Google STT).  Previously an early return here
    // prevented the fallbacks from ever running when the key was missing.
    if (apiKey) {
      console.log(
        `[Deepgram] Transcribing: ${(audioBlob.size / 1024).toFixed(1)}KB, mode: ${isMultichannel ? "multichannel" : "diarize"}, model: ${primaryModel}`
      );

      const params = new URLSearchParams({
        model: primaryModel,
        language,
        smart_format: "true",
        detect_language: "false",
      });

      if (isMultichannel) {
        params.set("multichannel", "true");
        params.set("channels", "2");
      } else {
        params.set("diarize", "true");
        params.set("utterances", "true");
      }

      const deepgramResponse = await fetch(
        `https://api.deepgram.com/v1/listen?${params.toString()}`,
        {
          method: "POST",
          headers: {
            Authorization: `Token ${apiKey}`,
            "Content-Type": audioBlob.type || "audio/webm",
          },
          body: audioBlob,
        }
      );

      if (deepgramResponse.ok) {
        const data = await deepgramResponse.json();
        return NextResponse.json(
          isMultichannel
            ? formatMultichannelResponse(data, primaryModel)
            : formatDiarizeResponse(data, primaryModel)
        );
      }

      const errText = await deepgramResponse.text();
      console.error(`[Deepgram] API error (${deepgramResponse.status}):`, errText);

      // If primary model fails with a model-specific error, retry with nova-2
      if (deepgramResponse.status === 402 || deepgramResponse.status === 400) {
        console.log(`[Deepgram] Retrying with nova-2 model (language: ${language})...`);
        const fallbackParams = new URLSearchParams({
          model: "nova-2",
          language,
          smart_format: "true",
        });

        if (isMultichannel) {
          fallbackParams.set("multichannel", "true");
          fallbackParams.set("channels", "2");
        } else {
          fallbackParams.set("diarize", "true");
          fallbackParams.set("utterances", "true");
        }

        const fallbackResponse = await fetch(
          `https://api.deepgram.com/v1/listen?${fallbackParams.toString()}`,
          {
            method: "POST",
            headers: {
              Authorization: `Token ${apiKey}`,
              "Content-Type": audioBlob.type || "audio/webm",
            },
            body: audioBlob,
          }
        );

        if (fallbackResponse.ok) {
          const fallbackData = await fallbackResponse.json();
          return NextResponse.json(
            isMultichannel
              ? formatMultichannelResponse(fallbackData, "nova-2")
              : formatDiarizeResponse(fallbackData, "nova-2")
          );
        }
      }
    } else {
      console.warn("[STT] DEEPGRAM_API_KEY not configured — skipping Deepgram, trying fallbacks.");
    }

    // ── STT fallback chain ────────────────────────────────────────────────────
    // Reached when: (a) Deepgram key is missing, or (b) all Deepgram attempts failed.
    const sttFallbacks: Array<{
      name: string;
      fn: () => Promise<NormalizedTranscript | null>;
    }> = [
      {
        name: "OpenAI gpt-4o-mini-transcribe",
        fn: () => transcribeWithOpenAI(audioBlob, language, isMultichannel),
      },
      {
        name: "Google STT",
        fn: () => transcribeWithGoogleSTT(audioBlob, language, isMultichannel),
      },
    ];

    for (const { name, fn } of sttFallbacks) {
      try {
        console.log(`[STT] Falling back to ${name}...`);
        const result = await fn();
        if (result) {
          console.log(`[STT] ${name} succeeded.`);
          return NextResponse.json(result);
        }
        console.log(`[STT] ${name} skipped (not configured or audio too large).`);
      } catch (fallbackErr) {
        console.error(`[STT] ${name} failed:`, fallbackErr);
      }
    }

    return NextResponse.json(
      { error: "Transcription service error. Please try again." },
      { status: 502 }
    );
  } catch (err) {
    console.error("[Deepgram] Transcribe error:", err);
    return NextResponse.json(
      { error: "Transcription failed" },
      { status: 500 }
    );
  }
}

/**
 * Format Deepgram diarization response (single-channel, diarize=true).
 * Extracts utterances with speaker labels assigned by Deepgram.
 */
function formatDiarizeResponse(
  data: Record<string, unknown>,
  model: string
) {
  const results = data?.results as Record<string, unknown> | undefined;
  const utterances =
    (results?.utterances as Array<Record<string, unknown>>) || [];
  const channels =
    (results?.channels as Array<Record<string, unknown>>) || [];

  // Build transcript from utterances (includes speaker info)
  const segments = utterances.map((u: Record<string, unknown>) => ({
    speaker: (u.speaker as number) ?? 0,
    text: (u.transcript as string) || "",
    start_time: (u.start as number) || 0,
    end_time: (u.end as number) || 0,
    confidence: (u.confidence as number) || 0,
  }));

  // Full text from first channel
  const firstChannel = channels[0] as Record<string, unknown> | undefined;
  const alternatives =
    (firstChannel?.alternatives as Array<Record<string, unknown>>) || [];
  const fullText = (alternatives[0]?.transcript as string) || "";

  return {
    segments,
    full_text: fullText,
    model,
    multichannel: false,
    duration: (data?.metadata as Record<string, unknown>)?.duration || 0,
  };
}

/**
 * Format Deepgram multichannel response (stereo, multichannel=true).
 * Channel 0 = Doctor (speaker 0), Channel 1 = Patient (speaker 1).
 * Words from each channel are interleaved by timestamp to produce a
 * chronologically ordered transcript.
 */
function formatMultichannelResponse(
  data: Record<string, unknown>,
  model: string
) {
  const results = data?.results as Record<string, unknown> | undefined;
  const channels =
    (results?.channels as Array<Record<string, unknown>>) || [];

  if (channels.length < 2) {
    // If we didn't get 2 channels, fall back to diarize-style formatting
    console.warn(
      "[Deepgram] Expected 2 channels but got",
      channels.length,
      "— falling back to single-channel format"
    );
    return formatDiarizeResponse(data, model);
  }

  // Extract word-level data from each channel
  interface WordData {
    word: string;
    start: number;
    end: number;
    confidence: number;
    speaker: number; // 0 = doctor (ch0), 1 = patient (ch1)
  }

  const allWords: WordData[] = [];

  for (let channelIdx = 0; channelIdx < 2; channelIdx++) {
    const channel = channels[channelIdx] as Record<string, unknown>;
    const alternatives =
      (channel?.alternatives as Array<Record<string, unknown>>) || [];
    const alt = alternatives[0] as Record<string, unknown> | undefined;
    const words = (alt?.words as Array<Record<string, unknown>>) || [];

    for (const w of words) {
      allWords.push({
        word: (w.word as string) || "",
        start: (w.start as number) || 0,
        end: (w.end as number) || 0,
        confidence: (w.confidence as number) || 0,
        speaker: channelIdx, // Channel index = speaker
      });
    }
  }

  // Sort all words by start time
  allWords.sort((a, b) => a.start - b.start);

  // Group consecutive words by the same speaker into segments
  const segments: Array<{
    speaker: number;
    text: string;
    start_time: number;
    end_time: number;
    confidence: number;
  }> = [];

  let currentSegment: {
    speaker: number;
    words: string[];
    start: number;
    end: number;
    confidenceSum: number;
    wordCount: number;
  } | null = null;

  for (const word of allWords) {
    if (!currentSegment || currentSegment.speaker !== word.speaker) {
      // Flush current segment
      if (currentSegment && currentSegment.words.length > 0) {
        segments.push({
          speaker: currentSegment.speaker,
          text: currentSegment.words.join(" "),
          start_time: currentSegment.start,
          end_time: currentSegment.end,
          confidence:
            currentSegment.confidenceSum / currentSegment.wordCount,
        });
      }

      // Start new segment
      currentSegment = {
        speaker: word.speaker,
        words: [word.word],
        start: word.start,
        end: word.end,
        confidenceSum: word.confidence,
        wordCount: 1,
      };
    } else {
      // Continue current segment
      currentSegment.words.push(word.word);
      currentSegment.end = word.end;
      currentSegment.confidenceSum += word.confidence;
      currentSegment.wordCount++;
    }
  }

  // Flush the last segment
  if (currentSegment && currentSegment.words.length > 0) {
    segments.push({
      speaker: currentSegment.speaker,
      text: currentSegment.words.join(" "),
      start_time: currentSegment.start,
      end_time: currentSegment.end,
      confidence: currentSegment.confidenceSum / currentSegment.wordCount,
    });
  }

  // Build full text from interleaved segments
  const fullText = segments.map((s) => s.text).join(" ");

  return {
    segments,
    full_text: fullText,
    model,
    multichannel: true,
    duration: (data?.metadata as Record<string, unknown>)?.duration || 0,
  };
}

// Increase body size limit for audio uploads (up to 25MB)
export const config = {
  api: {
    bodyParser: false,
  },
};
