import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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

    const apiKey = process.env.DEEPGRAM_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Deepgram API key not configured" },
        { status: 500 }
      );
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

    console.log(
      `[Deepgram] Transcribing: ${(audioBlob.size / 1024).toFixed(1)}KB, mode: ${isMultichannel ? "multichannel" : "diarize"}, model: ${primaryModel}`
    );

    // Build Deepgram API parameters based on mode and language
    const params = new URLSearchParams({
      model: primaryModel,
      language,
      smart_format: "true",
      detect_language: "false",
    });

    if (isMultichannel) {
      // Multichannel mode: each channel transcribed independently
      // Ch0 = Doctor (mic), Ch1 = Patient (tab audio)
      params.set("multichannel", "true");
      params.set("channels", "2");
      // Do NOT use diarize with multichannel — they are mutually exclusive
    } else {
      // Single-channel mode: rely on diarization for speaker separation
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

    if (!deepgramResponse.ok) {
      const errText = await deepgramResponse.text();
      console.error(
        `[Deepgram] API error (${deepgramResponse.status}):`,
        errText
      );

      // If primary model fails, fall back to nova-2
      if (
        deepgramResponse.status === 402 ||
        deepgramResponse.status === 400
      ) {
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

        if (!fallbackResponse.ok) {
          console.error("[Deepgram] Fallback also failed:", await fallbackResponse.text());
          return NextResponse.json(
            { error: "Transcription failed. Please try again." },
            { status: 500 }
          );
        }

        const fallbackData = await fallbackResponse.json();
        return NextResponse.json(
          isMultichannel
            ? formatMultichannelResponse(fallbackData, "nova-2")
            : formatDiarizeResponse(fallbackData, "nova-2")
        );
      }

      return NextResponse.json(
        { error: "Transcription service error. Please try again." },
        { status: 502 }
      );
    }

    const data = await deepgramResponse.json();
    return NextResponse.json(
      isMultichannel
        ? formatMultichannelResponse(data, primaryModel)
        : formatDiarizeResponse(data, primaryModel)
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
