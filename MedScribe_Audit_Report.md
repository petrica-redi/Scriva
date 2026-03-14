# MedScribe Platform Audit & Action Plan
**Date:** March 14, 2026 | **Prepared for:** Petrica, CEO

---

## Executive Summary

After a deep audit of the MedScribe codebase (Next.js 15 + Supabase + Deepgram + Claude), I've identified **12 critical issues** and built a prioritized action plan. The platform has solid architecture but needs hardening in 5 areas: AI redundancy, speech-to-text reliability, authentication, admin visibility, and UX for clinical use.

**My recommendation: I build the core infrastructure changes (AI fallback chain, STT fallback, Supabase auth config, admin panel queries), and you give Cursor a detailed prompt for the UI/UX polish work.** Rationale at the bottom.

---

## 1. CRITICAL: What Broke in Today's Demo

### The Deepgram Failure

Based on the code, the most likely failure points during your doctor-patient demo were:

1. **Scoped key expiration** — The stream key has a 5-minute TTL. If the consultation setup took too long, the key expired silently. The fallback sends the *main API key* to the browser (security risk + still fails if Deepgram is down).

2. **WebSocket disconnect without recovery** — `useAudioRecorder.ts` has a `reconnectAttemptsRef` but the reconnection logic is fragile. In a noisy hospital environment with spotty Wi-Fi, a single dropped WebSocket frame kills the session.

3. **No STT fallback whatsoever** — If Deepgram fails, the entire recording session is dead. There's no alternative speech-to-text provider configured anywhere in the codebase.

4. **Browser microphone permissions** — On some hospital laptops, Chrome blocks mic access unless the page is served over HTTPS with explicit permissions policy. Your middleware sets `microphone=(self)` which is correct, but the *user* still has to grant permission, and there's no clear guidance in the UI.

5. **Multichannel mode complexity** — The in-person "stereo" mode tries to capture tab audio + mic audio into 2 channels. This requires `getDisplayMedia()` which triggers a screen-sharing prompt. For a doctor with a patient sitting across the desk, this is confusing and unnecessary.

### Immediate Fix Priority
The recording page needs: a **single "Record" button** with clear status indicators, **automatic fallback** to a second STT provider, and a **local audio backup** so the recording is never lost even if transcription fails live.

---

## 2. Speech-to-Text: Deepgram Alternatives & Fallback Strategy

### Recommended Architecture: Dual-Provider with Local Backup

| Layer | Provider | Purpose | Cost |
|-------|----------|---------|------|
| **Primary** | Deepgram Nova-3 Medical | Best medical accuracy, real-time streaming | ~$0.0059/min |
| **Fallback 1** | OpenAI gpt-4o-mini-transcribe | Lower WER than Whisper, good medical terms | ~$0.003/min |
| **Fallback 2** | Google Cloud Speech-to-Text (Chirp 3) | Enterprise reliability, phrase hints for medical vocab | ~$0.016/min |
| **Local Backup** | Browser MediaRecorder → save .webm | Always capture audio locally, transcribe later if needed | Free |

### Why These Three

- **Deepgram Nova-3 Medical** stays primary — it's purpose-built for medical vocabulary (pharmaceutical names, clinical acronyms, Latin disease names). Claims 63.7% better accuracy than alternatives on medical audio.
- **OpenAI gpt-4o-mini-transcribe** (released March 2025, updated Dec 2025) — OpenAI's newest model, lower error rate than original Whisper. No real-time streaming, but works perfectly as a post-recording fallback via REST API. Handles noisy audio well.
- **Google Cloud Speech-to-Text Chirp 3** — Enterprise SLA, "phrase hints" feature lets you boost recognition of your specific medical terms. Supports 100+ languages (important for your Romanian + multilingual support).

### Implementation Plan

```
Recording starts →
  1. Save audio locally (always, regardless of STT status)
  2. Stream to Deepgram via WebSocket
  3. If Deepgram fails → send accumulated audio chunks to OpenAI transcribe API
  4. If OpenAI fails → send to Google Cloud STT
  5. If ALL fail → show "Transcription will be processed shortly" + save audio for batch processing later
```

**The key insight: always save the raw audio.** Even if live transcription fails in front of a patient, the doctor can generate the note later from the saved recording.

---

## 3. AI Redundancy: Triple-Provider Fallback

### Current State
Your `provider.ts` has Claude (Anthropic) → Ollama (local medllama2) as fallback. Ollama won't work on Vercel deployment since it needs a local server.

### Recommended Architecture

```
Claude Sonnet 4 (Primary)
    ↓ fails
OpenAI GPT-4o (Fallback 1)
    ↓ fails
Google Gemini 2.0 Flash (Fallback 2)
    ↓ all fail
Return cached/template-based note with "AI-generated sections pending" markers
```

### Why This Order

| Provider | Strengths for MedScribe | Latency | Cost/1M tokens |
|----------|------------------------|---------|----------------|
| **Claude Sonnet 4** | Best at structured medical notes, follows SOAP format precisely, strong reasoning | ~2-3s | ~$3/$15 |
| **GPT-4o** | Excellent medical knowledge, very fast, large context window | ~1-2s | ~$2.50/$10 |
| **Gemini 2.0 Flash** | Fast, cheap, good for structured extraction, 1M token context | ~1s | ~$0.10/$0.40 |

### Code Changes Needed

The `provider.ts` file needs to be refactored from:
```typescript
export type AIProvider = "anthropic" | "ollama";
```
To:
```typescript
export type AIProvider = "anthropic" | "openai" | "gemini";
```

With new `callOpenAI()` and `callGemini()` functions following the same pattern as `callAnthropic()`. The fallback chain logic (`generateWithFallback`) already supports iteration — it just needs the new providers added to `resolveProviderOrder()`.

### New Environment Variables
```
OPENAI_API_KEY=sk-...
GOOGLE_GEMINI_API_KEY=...
```

---

## 4. Supabase Auth: Google Sign-In Setup

### Current State
Your Supabase auth supports email/password + magic links + password reset. **Google OAuth is NOT configured.**

### What Needs to Happen

**In Supabase Dashboard:**
1. Go to Authentication → Providers → Google
2. Enable Google provider
3. Add your Google OAuth Client ID and Secret (from Google Cloud Console)
4. Set authorized redirect URL: `https://medscribe-ai-main-fawn.vercel.app/auth/callback`

**In Google Cloud Console:**
1. Create OAuth 2.0 Client ID (Web application)
2. Add authorized redirect URI: `https://<your-supabase-project>.supabase.co/auth/v1/callback`
3. Add authorized JavaScript origin: `https://medscribe-ai-main-fawn.vercel.app`

**In Code:**
Add a Google sign-in button to your auth pages:
```typescript
const { data, error } = await supabase.auth.signInWithOAuth({
  provider: 'google',
  options: {
    redirectTo: `${window.location.origin}/auth/callback`
  }
});
```

### Security Consideration
Restrict Google sign-in to specific email domains if this is for your clinic staff only:
```sql
-- In Supabase: restrict to your domain
ALTER TABLE auth.users ADD CONSTRAINT email_domain_check
CHECK (email LIKE '%@your-clinic.com' OR raw_app_meta_data->>'provider' != 'google');
```

---

## 5. Data Storage Audit

### Current State: Mostly Good, Some Gaps

**What's working:**
- PostgreSQL via Supabase with proper schema (users, patients, consultations, transcripts, clinical_notes)
- Indexes on key columns (consultation_id, user_id, patient_id, created_at)
- Audit logging for GDPR compliance
- 10 sequential migrations (Feb 24 – Mar 7)

**What's missing:**

| Gap | Risk | Fix |
|-----|------|-----|
| No Row Level Security (RLS) policies visible | Any authenticated user can read all data | Add RLS: `USING (user_id = auth.uid())` on all tables |
| Audio files not stored | Lost after session | Store in Supabase Storage bucket (encrypted at rest) |
| No backup strategy documented | Data loss risk | Enable Supabase Point-in-Time Recovery |
| Transcripts stored as plain text | PII exposure | Encrypt `full_text` column at application level |
| Rate limit buckets are in-memory | Reset on server restart, bypass in multi-instance | Move to Redis or Supabase table |

---

## 6. Admin Panel: What You Need vs What Exists

### Current Admin Panel
Location: `/admin` — Has tabs for Overview, Consultations, Transcripts, Notes, Prescriptions, Audit, Storage. Basic stats and filtering.

### What's Missing (Based on Your Request)

| You Want | Current State | Effort |
|----------|--------------|--------|
| See all users | ❌ No users tab | Medium — query `auth.users` via service role |
| How many patients per user | ❌ Not aggregated | Easy — `GROUP BY user_id` on patients table |
| View all transcripts | ✅ Exists | — |
| View previous consultations | ✅ Exists (filtering by status/date) | — |
| User activity metrics | ❌ Not tracked | Medium — add last_login, consultation_count |
| Role-based access control | ❌ Any logged-in user can access /admin | Critical fix — check `user.role === 'admin'` |
| Export capabilities | ✅ CSV/JSON audit export exists | — |

### Admin Panel Enhancements Needed

1. **Users Tab**: List all registered users, their role, last login, total patients, total consultations, subscription status
2. **User Detail View**: Click a user → see their patients, consultations, transcripts, notes
3. **Dashboard Metrics**: Active users (7d/30d), consultations per day chart, avg recording duration, AI usage (tokens consumed per provider)
4. **Access Control**: Hard block non-admin users from `/admin` route in middleware

---

## 7. UX Improvements for Doctor/Patient Use

### The Core Problem
The current recording page (`/consultation/[id]/record`) is built for a developer, not a doctor. It has too many options visible at once: mode selection, language, template, consent toggle, AI assistant panel, clinical decision support, Google Meet embed, problem tracker, identity verification...

### Recommended Simplification

**Before Recording (Pre Phase):**
- Big friendly "Start Consultation" button
- Auto-detect language (or remember last used)
- Consent checkbox with clear patient-facing language
- Hide all advanced options behind a "Settings" gear icon

**During Recording:**
- Show ONLY: waveform visualizer, elapsed time, live transcript, pause/stop buttons
- Prominent "Recording Active" indicator (green pulsing dot)
- Network status banner (already exists — good)
- Remove sidebar panels during recording (they're distracting)

**After Recording (Post Phase):**
- Clear summary: "Consultation recorded: X minutes, Y words transcribed"
- One-click "Generate Note" with selected template
- Option to edit transcript before note generation
- Save/export options

### Quick Wins
1. Add a **"Test Microphone"** button before recording starts (plays back 3 seconds of audio so doctor confirms it's working)
2. Show a **connection quality indicator** (Deepgram WebSocket latency)
3. Add **auto-save** of transcript every 30 seconds to Supabase (prevent data loss on browser crash)
4. Add **keyboard shortcuts**: Space = pause/resume, Escape = stop

---

## 8. Security Issues Found

| Issue | Severity | Fix |
|-------|----------|-----|
| API keys visible in `.env.local` committed to repo | 🔴 Critical | Rotate ALL keys immediately. Add `.env.local` to `.gitignore` |
| Deepgram main key fallback exposed to browser | 🔴 Critical | Return error instead of main key when scoped key fails |
| Admin panel has no role check | 🟠 High | Add `if (user.role !== 'admin') return 403` |
| PII pseudonymization uses simple string replace | 🟡 Medium | Consider NLP-based entity recognition |
| No CORS configuration on API routes | 🟡 Medium | Restrict to your domains only |
| Rate limits reset on cold start | 🟡 Medium | Persist in database or Redis |

---

## 9. Priority Roadmap

### Week 1 (Critical — Before Next Demo)
- [ ] Fix STT fallback chain (Deepgram → OpenAI → Google)
- [ ] Add local audio recording backup
- [ ] Simplify recording UX (one-button start)
- [ ] Rotate all exposed API keys
- [ ] Add admin role check to `/admin` route

### Week 2 (Important)
- [ ] Implement AI triple-fallback (Claude → GPT-4o → Gemini)
- [ ] Configure Google OAuth in Supabase
- [ ] Add Google sign-in button to auth pages
- [ ] Add Users tab to admin panel
- [ ] Add RLS policies to all Supabase tables

### Week 3 (Enhancement)
- [ ] Add audio storage to Supabase Storage
- [ ] Add microphone test feature
- [ ] Add auto-save during recording
- [ ] Add user activity metrics to admin
- [ ] Add connection quality indicator

### Week 4 (Polish)
- [ ] Mobile responsiveness for recording page
- [ ] Keyboard shortcuts
- [ ] Batch transcription for failed live sessions
- [ ] Performance monitoring dashboards
- [ ] End-to-end test suite for recording flow

---

## 10. Build Strategy: Me vs Cursor

### My Recommendation: Split the Work

**I should build (infrastructure/backend — harder to prompt):**

1. ✅ AI provider fallback chain refactor (`provider.ts`) — Adding OpenAI + Gemini with proper error handling, retry logic, and circuit breakers. This requires understanding the existing fallback pattern deeply.

2. ✅ STT fallback service — New API routes for OpenAI transcribe and Google Cloud STT, with the orchestration logic for automatic failover.

3. ✅ Supabase RLS policies — SQL migrations for row-level security. One mistake here locks everyone out or exposes everything.

4. ✅ Admin panel data queries — The Supabase queries to aggregate user stats, patient counts, and cross-table joins are easier to get right when I can see the full schema.

**Create a Cursor prompt for (UI/UX — better suited to iterative visual work):**

1. 🖱️ Recording page UX simplification — Moving panels, hiding options, adding the microphone test UI. This needs visual iteration.

2. 🖱️ Google sign-in button + auth flow UI — The Supabase `signInWithOAuth` call is one line, but the button placement, loading states, and error handling in the auth pages benefit from visual feedback.

3. 🖱️ Admin panel Users tab UI — The queries I write, Cursor renders into the tabbed interface with proper filtering/pagination matching the existing design.

4. 🖱️ Mobile responsiveness — CSS/Tailwind adjustments that need visual testing.

### Why This Split?
Backend logic with multiple API integrations and database security is where AI coding assistants make the most mistakes — they can't test the integrations. I can verify provider responses and SQL queries work correctly. UI work, on the other hand, is iterative and Cursor excels at it because the developer sees the result immediately.

---

## Appendix: Cursor Prompt (Ready to Use)

```
## Context
MedScribe is a Next.js 15 medical scribe app at /MedScribe/medscribe-ai-main/.
Tech: React 19, TypeScript, Supabase, TailwindCSS, Shadcn UI.

## Tasks

### 1. Simplify Recording Page UX
File: src/app/(app)/consultation/[id]/record/page.tsx

Current "pre" phase shows too many options. Restructure:
- Default to "in-person" mode (hide mode selector behind gear icon)
- Remember last language selection in localStorage
- Make consent checkbox more prominent with patient-facing language
- Add "Test Microphone" button that records 3s and plays back
- During recording: hide AIAssistantPanel, ClinicalDecisionSupport,
  GoogleMeetEmbed, PreVisitBrief, ProblemTracker
- Show only: AudioVisualizer, elapsed time, live transcript, pause/stop
- Add green pulsing "Recording Active" indicator
- After recording: clear summary with one-click "Generate Note"

### 2. Google Sign-In Button
Files: src/app/auth/signin/page.tsx, src/app/auth/signup/page.tsx

Add a "Sign in with Google" button using Supabase OAuth:
```typescript
const handleGoogleSignIn = async () => {
  await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${window.location.origin}/auth/callback` }
  });
};
```
Style: White button with Google logo, "Continue with Google" text,
placed above the email/password form with an "or" divider.

### 3. Admin Panel - Users Tab
File: src/app/(app)/admin/page.tsx

Add "users" to AdminTab type. New tab showing:
- Table: email, role, created_at, last_sign_in_at, patient_count,
  consultation_count
- Query auth.users via service role key (server component or API route)
- Click row → expand to show user's recent consultations
- Search by email
- Filter by role (admin, clinician, reviewer)

### 4. Mobile Responsiveness
- Recording page: stack panels vertically on mobile
- Admin panel: horizontal scroll for tables on mobile
- Navigation: collapsible sidebar on small screens
```

---

*End of audit. Questions → office@redi-ngo.eu*
