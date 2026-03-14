# Prompt 7: Opus 4.6 Review (paste into NEW Cursor chat with Opus)

```
Review ALL recent changes across the MedScribe codebase for logical errors,
missing edge cases, and cross-file consistency. Check specifically:

1. STT FALLBACK CHAIN (src/app/api/deepgram/transcribe/route.ts)
   - Does the Deepgram → OpenAI → Google fallback propagate the original audioBlob correctly to each provider?
   - Is the audioBlob consumed (stream exhausted) after the first failed fetch? If yes, it needs to be cloned or buffered before the first attempt.
   - Does the Google STT base64 encoding handle large files without running out of memory?
   - Is the `NormalizedTranscript` return shape consistent across all 3 providers?

2. LOCAL AUDIO BACKUP (src/lib/audio-storage.ts + useAudioRecorder.ts)
   - Does IndexedDB `saveAudioChunk` fire on every `ondataavailable` event?
   - Is `consultationId` available when the hook mounts, or could it be undefined?
   - Does `getFullRecording` concatenate chunks in the right order?
   - Memory: are old recordings ever cleaned up from IndexedDB?

3. WEBSOCKET FALLBACK (useAudioRecorder.ts)
   - After `streamingFailed` is set, does the MediaRecorder continue recording audio chunks?
   - Can the user still stop the recording and proceed to post phase?

4. RLS POLICIES (supabase/migrations/20260314200000_row_level_security.sql)
   - Does the `is_admin()` helper work when the users table itself has RLS enabled? (Hint: it uses SECURITY DEFINER, so it should bypass RLS — confirm this.)
   - Do the transcript/note policies with subqueries on consultations create performance issues? Suggest adding an index if needed.
   - Does the admin panel's `loadOverview` function use the user's session client (which respects RLS) or the service role client? If session client, admin with RLS will only see their own data in the overview counts — that's a bug.

5. ADMIN GUARD (src/app/(app)/admin/layout.tsx)
   - Does `createClient` from `@/lib/supabase/server` work in a server component layout?
   - Is the redirect import from 'next/navigation' (correct for server components)?

6. RECORDING UX (src/app/(app)/consultation/[id]/record/page.tsx)
   - Does localStorage work server-side? (It shouldn't be called during SSR — check for hydration mismatch)
   - Is the mic test cleanup robust? (MediaStream tracks stopped, Audio object revoked)

List every issue found with file path, line reference, and fix.
```

## How to use
1. Open a NEW Cursor chat
2. Select Opus 4.6 as the model
3. Paste the above prompt
4. Let it review — it will find cross-file issues Sonnet missed
