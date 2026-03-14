# Prompt 3: WebSocket streaming fallback when Deepgram dies mid-recording

## Context
`src/hooks/useAudioRecorder.ts` streams audio to Deepgram via WebSocket. It has reconnect logic (5 attempts, exponential backoff). But when all 5 attempts fail, the live transcript just stops. The doctor sees nothing.

## Task
When WebSocket reconnect exhausts all attempts, switch to batch transcription mode:

In `useAudioRecorder.ts`, find the `reconnectWebSocket` function. At the top, there's this guard:
```ts
if (reconnectAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS) {
  return;
}
```

Replace with:
```ts
if (reconnectAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS) {
  console.warn("[STT] WebSocket reconnect exhausted — switching to batch mode");
  setStreamingStatus("live transcription unavailable — recording continues");
  setConnectionStatus("disconnected");
  // Recording continues via MediaRecorder. Audio chunks are saved locally.
  // User will see "Transcribe from saved recording" button in post phase.
  onError?.("Live transcription lost. Your audio is still being recorded and can be transcribed after you stop.");
  return;
}
```

Also add a `streamingFailed` state:
```ts
const [streamingFailed, setStreamingFailed] = useState(false);
```
Set it to `true` when reconnect exhausts. Add to return interface.

In the record page (`src/app/(app)/consultation/[id]/record/page.tsx`):
- During recording phase, if `streamingFailed` is true, show a yellow banner:
  "Live transcription unavailable. Your audio is being saved. You can generate the transcript after stopping."
- This replaces the live transcript area with the banner + still shows the AudioVisualizer and duration timer
- The "Stop" button still works normally

## Files to modify
- `src/hooks/useAudioRecorder.ts`
- `src/app/(app)/consultation/[id]/record/page.tsx`
