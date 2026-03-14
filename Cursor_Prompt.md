# MedScribe — Cursor Tasks

Stack: Next.js 15, React 19, TS, Supabase, Tailwind, Shadcn UI, Zustand.
Root: `MedScribe/medscribe-ai-main/`

---

## TASK 1: STT Fallback Chain

**Files:** `src/hooks/useAudioRecorder.ts`, new `src/lib/stt/providers.ts`, new API routes

**Always save raw audio locally** via MediaRecorder → IndexedDB, regardless of STT status.

Create `src/lib/stt/providers.ts`:
```ts
export type STTProvider = "deepgram" | "openai" | "google";

export async function transcribeWithFallback(audioBlob: Blob, lang: string): Promise<TranscriptResult> {
  for (const provider of ["deepgram", "openai", "google"] as STTProvider[]) {
    try {
      return await transcribe(provider, audioBlob, lang);
    } catch (e) {
      console.warn(`${provider} STT failed, trying next...`, e);
    }
  }
  throw new Error("All STT providers failed");
}
```

**Deepgram** (primary): Keep existing WebSocket streaming. On disconnect after 2 retries → accumulate audio chunks → send to fallback.

**OpenAI** (fallback 1): `POST /api/stt/openai` → calls `https://api.openai.com/v1/audio/transcriptions` with model `gpt-4o-mini-transcribe`. Send audio as multipart form. Env: `OPENAI_API_KEY`.

**Google** (fallback 2): `POST /api/stt/google` → calls Google Cloud Speech-to-Text v2 with Chirp 3. Use phrase hints for medical terms. Env: `GOOGLE_STT_API_KEY`.

In `useAudioRecorder.ts`:
- On mount: start `MediaRecorder` → save chunks to IndexedDB every 10s
- On Deepgram WebSocket `onerror`/`onclose` after retries exhausted: call `transcribeWithFallback()` with accumulated audio
- Add state: `sttProvider: STTProvider | null` and `localAudioSaved: boolean`

---

## TASK 2: AI Triple Fallback

**File:** `src/lib/ai/provider.ts`

Refactor `AIProvider` type:
```ts
export type AIProvider = "anthropic" | "openai" | "gemini";
```

Add to `PROVIDERS` map:

**OpenAI:**
```ts
async function callOpenAI(messages: Message[], systemPrompt: string): Promise<string> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: "gpt-4o", messages: [{ role: "system", content: systemPrompt }, ...messages] })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message);
  return data.choices[0].message.content;
}
```

**Gemini:**
```ts
async function callGemini(messages: Message[], systemPrompt: string): Promise<string> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GOOGLE_GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: messages.map(m => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] }))
      })
    }
  );
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message);
  return data.candidates[0].content.parts[0].text;
}
```

Update `resolveProviderOrder()`: return `["anthropic", "openai", "gemini"]`. Remove `"ollama"` entirely — it doesn't work on Vercel.

Add env vars: `OPENAI_API_KEY`, `GOOGLE_GEMINI_API_KEY`.

---

## TASK 3: Google OAuth Sign-In

**Files:** `src/app/auth/signin/page.tsx`, `src/app/auth/signup/page.tsx`

Add above the email form, separated by an `<div>or</div>` divider:

```tsx
import { FcGoogle } from "react-icons/fc"; // or inline SVG

const handleGoogleSignIn = async () => {
  setLoading(true);
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${window.location.origin}/auth/callback` },
  });
  if (error) setError(error.message);
  setLoading(false);
};

// Button JSX
<Button variant="outline" className="w-full gap-2" onClick={handleGoogleSignIn} disabled={loading}>
  <FcGoogle className="h-5 w-5" /> Continue with Google
</Button>
```

Prereqs (manual, not code): Enable Google provider in Supabase Dashboard → Auth → Providers. Add Google Cloud OAuth Client ID + Secret. Redirect URI: `https://<project>.supabase.co/auth/v1/callback`.

---

## TASK 4: Admin Panel — Users Tab + Role Guard

**File:** `src/app/(app)/admin/page.tsx`

**4a. Role guard** — Add to top of component or in middleware:
```ts
// In /api/admin/users/route.ts
const { data: { user } } = await supabase.auth.getUser();
const { data: profile } = await supabase.from("users").select("role").eq("id", user.id).single();
if (profile?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
```

**4b. Users tab** — Add `"users"` to `AdminTab` type. New API route `GET /api/admin/users`:
```sql
SELECT
  u.id, u.email, u.role, u.created_at,
  au.last_sign_in_at,
  COUNT(DISTINCT p.id) as patient_count,
  COUNT(DISTINCT c.id) as consultation_count
FROM public.users u
LEFT JOIN auth.users au ON au.id = u.id
LEFT JOIN patients p ON p.user_id = u.id
LEFT JOIN consultations c ON c.user_id = u.id
GROUP BY u.id, u.email, u.role, u.created_at, au.last_sign_in_at
ORDER BY u.created_at DESC
```

Render as table matching existing admin tab style. Expandable rows showing user's last 5 consultations. Search by email, filter by role.

---

## TASK 5: Simplify Recording Page UX

**File:** `src/app/(app)/consultation/[id]/record/page.tsx`

**Pre phase:**
- Hide `AIAssistantPanel`, `ClinicalDecisionSupport`, `GoogleMeetEmbed`, `PreVisitBrief`, `ProblemTracker`, `IdentityVerification` behind a collapsible "Advanced" section (closed by default)
- Default `consultationMode` to `"in-person"`, move mode toggle into Advanced
- Remember `selectedLanguage` in localStorage
- Add mic test: record 3s → playback → show "Microphone working" confirmation
- Make consent checkbox larger with patient-facing copy: "I consent to this consultation being recorded for medical documentation purposes"
- Single large "Start Recording" button (green, centered)

**Recording phase:**
- Show ONLY: `AudioVisualizer`, duration timer, live transcript scroll area, pause + stop buttons
- Add pulsing green dot + "Recording Active" label
- Add `connectionStatus` indicator (Deepgram WS status) as small badge
- Hide all side panels

**Post phase:**
- Summary card: duration, word count, speaker segments count
- Editable transcript textarea
- Template selector + "Generate Note" button (primary, large)
- Secondary: "Save & Generate Later"

---

## TASK 6: Supabase RLS + Audio Storage

**New migration file:** `supabase/migrations/20260314000000_rls_and_storage.sql`

```sql
-- Enable RLS on all tables
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consultations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transcripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinical_notes ENABLE ROW LEVEL SECURITY;

-- Users see only their own data
CREATE POLICY "users_own_patients" ON public.patients FOR ALL USING (user_id = auth.uid());
CREATE POLICY "users_own_consultations" ON public.consultations FOR ALL USING (user_id = auth.uid());
CREATE POLICY "users_own_transcripts" ON public.transcripts FOR ALL
  USING (consultation_id IN (SELECT id FROM consultations WHERE user_id = auth.uid()));
CREATE POLICY "users_own_notes" ON public.clinical_notes FOR ALL
  USING (consultation_id IN (SELECT id FROM consultations WHERE user_id = auth.uid()));

-- Admins see everything
CREATE POLICY "admin_all_patients" ON public.patients FOR ALL
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "admin_all_consultations" ON public.consultations FOR ALL
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

-- Audio storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('recordings', 'recordings', false);
CREATE POLICY "users_upload_own_recordings" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'recordings' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "users_read_own_recordings" ON storage.objects FOR SELECT
  USING (bucket_id = 'recordings' AND auth.uid()::text = (storage.foldername(name))[1]);
```

Upload audio after recording stops:
```ts
const { error } = await supabase.storage
  .from("recordings")
  .upload(`${userId}/${consultationId}.webm`, audioBlob, { contentType: "audio/webm" });
```

---

## TASK 7: Mobile Responsive

- Recording page: `flex-col` on `md:` breakpoint, stack panels vertically
- Admin tables: `overflow-x-auto` wrapper
- Sidebar nav: collapsible hamburger menu on `< md`
- Test at 375px (iPhone SE) and 768px (iPad)

---

## ENV VARS TO ADD
```
OPENAI_API_KEY=
GOOGLE_GEMINI_API_KEY=
GOOGLE_STT_API_KEY=
```

## PRIORITY ORDER
1 → Task 1 (STT fallback — prevents demo failures)
2 → Task 5 (Recording UX — doctor usability)
3 → Task 2 (AI fallback — resilience)
4 → Task 4 (Admin panel — your visibility)
5 → Task 3 (Google auth)
6 → Task 6 (RLS + storage — security)
7 → Task 7 (Mobile)
