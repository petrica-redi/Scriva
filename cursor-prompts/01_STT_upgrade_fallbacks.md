# Prompt 1: Upgrade STT fallback chain

## Context
`src/app/api/deepgram/transcribe/route.ts` already has Deepgram → nova-2 → OpenAI Whisper fallback. Two changes needed.

## Task A: Replace whisper-1 with gpt-4o-mini-transcribe
In `transcribeWithOpenAI()` function (line ~33):
- Change `formData.append("model", "whisper-1")` → `formData.append("model", "gpt-4o-mini-transcribe")`
- Update the `model` field in the return object to `"gpt-4o-mini-transcribe"`
- Add `timestamp_granularities` param: `formData.append("timestamp_granularities[]", "segment")`
- The response shape is the same as whisper-1 verbose_json, no other changes needed

## Task B: Add Google Cloud STT as 3rd fallback
After the OpenAI Whisper catch block (~line 231), add a Google Cloud STT fallback:

```ts
// Google Cloud STT fallback
const googleSttKey = process.env.GOOGLE_STT_API_KEY;
if (googleSttKey) {
  try {
    console.log("[STT] Falling back to Google Cloud STT...");
    const googleResult = await transcribeWithGoogle(audioBlob, language);
    if (googleResult) return NextResponse.json(googleResult);
  } catch (googleErr) {
    console.error("[STT] Google STT fallback failed:", googleErr);
  }
}
```

Add new function before POST handler:

```ts
async function transcribeWithGoogle(
  audioBlob: Blob,
  language: string
): Promise<NormalizedTranscript | null> {
  const apiKey = process.env.GOOGLE_STT_API_KEY;
  if (!apiKey) return null;

  const audioBytes = Buffer.from(await audioBlob.arrayBuffer()).toString("base64");

  const response = await fetch(
    `https://speech.googleapis.com/v1/speech:recognize?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        config: {
          encoding: "WEBM_OPUS",
          sampleRateHertz: 48000,
          languageCode: language === "en" ? "en-US" : language,
          enableAutomaticPunctuation: true,
          enableWordTimeOffsets: true,
          model: "latest_long",
          useEnhanced: true,
          speechContexts: [{ phrases: [
            "SOAP", "differential diagnosis", "milligrams", "prescription",
            "systolic", "diastolic", "hemoglobin", "prognosis"
          ]}],
        },
        audio: { content: audioBytes },
      }),
    }
  );

  if (!response.ok) throw new Error(`Google STT failed (${response.status})`);
  const data = await response.json();

  const results = data.results ?? [];
  const segments = results.map((r: any, i: number) => ({
    speaker: 0,
    text: r.alternatives?.[0]?.transcript?.trim() ?? "",
    start_time: parseFloat(r.alternatives?.[0]?.words?.[0]?.startTime?.replace("s","") ?? "0"),
    end_time: parseFloat(r.alternatives?.[0]?.words?.slice(-1)[0]?.endTime?.replace("s","") ?? "0"),
    confidence: r.alternatives?.[0]?.confidence ?? 0,
  }));

  return {
    segments,
    full_text: segments.map((s: any) => s.text).join(" "),
    model: "google-cloud-stt",
    multichannel: false,
  };
}
```

## Env var needed
Add `GOOGLE_STT_API_KEY` to `.env.local`

## Files to modify
- `src/app/api/deepgram/transcribe/route.ts`
