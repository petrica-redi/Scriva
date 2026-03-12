# MedScribe AI — Engineering Audit

**Date:** March 2026  
**Scope:** Full-stack platform (Next.js 15, React 19, Supabase, AI/LLM, Deepgram).  
**Focus:** Critical functionalities, workflow interconnection, challenges, and improvements.

---

## 1. Platform score: **8.0 / 10** *(updated after P0/P1 improvements)*

| Dimension | Score | Note |
|-----------|--------|------|
| **Architecture & stack** | 7/10 | Modern (Next 15, App Router, Supabase, TypeScript). Clear separation of app/public/auth. Some duplication and orphan code. |
| **Critical workflow connectivity** | 8/10 | Core path works. **CDS and Criteria Tracker** on record page; **Pre-visit brief** on consultation/new when patient selected; **visit summaries** on note finalize; **follow-up suggestion** from prescription save and note finalize. |
| **Security** | 7/10 | Supabase auth, RLS on core tables, middleware redirect. API routes use server client + `getUser()`. Zod validation added for follow-ups and visit-summaries POST. |
| **Reliability & error handling** | 7/10 | Try/catch in API routes; **api-response helper** and **health endpoint** added. Errors use consistent `{ error, code? }` where applied. |
| **Testing** | 6/10 | Vitest + 2 unit test files. **Playwright e2e**: config + health + public page smoke test. No full logged-in flow e2e yet. |
| **Performance & ops** | 6/10 | **GET /api/health** for load balancers. AI latency unchanged; no caching. Sentry present. |
| **Code quality & maintainability** | 7/10 | TypeScript throughout; **Zod on follow-ups and visit-summaries**; shared validators and api-response helper. |

**Overall: 8.0/10** — Core workflows and high-value features (CDS, criteria, pre-visit, visit summaries, follow-up suggestions) are **wired into the flow**. Health check and e2e smoke tests in place; validation and response contract improved.

---

## 2. Architecture overview

- **Frontend:** Next.js 15 (App Router), React 19, TypeScript, Tailwind, Framer Motion, TanStack Query, Zustand. Routes: `(app)` (dashboard, consultation, calendar, patients, analytics, follow-ups, settings, ai-assistant, portal), `(public)` (book, privacy, terms), `auth` (signin, signup, reset, confirm).
- **Backend:** Next.js API Routes (serverless). No separate API server. Supabase for auth + Postgres; RLS on users, patients, consultations, transcripts, clinical_notes, note_templates, audit_log (and later migrations for follow_ups, visit_summaries, etc.).
- **External:** Deepgram (streaming + batch transcription), Anthropic/Ollama (notes, CDS, analyze-consultation, evaluate-criteria). Resend for email (if configured).
- **State:** Server state via Supabase client; client state in Zustand (e.g. recording, UI). TanStack Query for some server data.

**Strengths:** Single codebase, typed stack, RLS for multi-tenant isolation, audit log and pseudonymization in sensitive flows (e.g. generate-note).

**Improvements:** `GET /api/health` for load balancers; `src/lib/api-response.ts` for standardized error responses; Zod on follow-ups and visit-summaries POST.

---

## 3. Critical functionalities and workflow connectivity

### 3.1 Core flow (working)

| Step | Route / component | Status |
|------|-------------------|--------|
| New consultation | `consultation/new` | ✅ Creates consultation. |
| Record | `consultation/[id]/record` | ✅ Deepgram streaming, transcript, `AIAssistantPanel` (analyze-consultation). |
| Generate note | `POST /api/generate-note` | ✅ Transcript + template → note; saved to DB. |
| Note editor | `consultation/[id]/note` | ✅ Load, edit, billing, status. |
| Prescription | `consultation/[id]/prescription` | ✅ Consultation metadata + `SmartPrescriptionPanel` (treatment-pathway, medications, dose-equivalence). |
| Booking | `book`, `api/clinics/search`, `api/bookings` | ✅ Public booking flow. |

**Conclusion:** The backbone **consultation → record → note → prescription** is implemented and connected. Auth and RLS protect consultations and notes by `user_id`.

### 3.2 Not connected (high / medium impact)

| Feature | Backend | Frontend | Issue |
|---------|---------|----------|--------|
| **Clinical Decision Support (CDS)** | `POST /api/ai/clinical-decision-support` | `ClinicalDecisionSupport.tsx` exists | **Component never rendered** on record, note, or prescription. CDS (alerts, interactions) not shown in workflow. |
| **DSM-5 / criteria evaluation** | `POST /api/ai/evaluate-criteria`, `lib/dsm5-criteria/` | — | **No UI calls it.** Record page has no “Criteria Tracker” (e.g. GAD 3/6, suggested questions). |
| **Pre-visit brief** | `GET /api/ai/pre-visit-brief` | `PreVisitBrief.tsx` exists | **No page renders it** (not on new consultation or patient detail). |
| **Visit summaries** | `GET/POST /api/visit-summaries` | — | **No frontend** calls it. Patient-facing summaries not generated or shown from notes. |
| **Follow-ups from workflow** | `api/follow-ups` | `FollowUpManager` on `/follow-ups` | Follow-ups only **manual**. No auto-suggestion or create when saving prescription (e.g. “SSRI review 2 weeks”) or finalizing note. |
| **AI Assistant ↔ consultation** | `POST /api/ai/ask` | AI Assistant page | Assistant is **standalone**; record uses `AIAssistantPanel` (analyze-consultation only). No “open in AI Assistant with this context” from record/note. |

**Conclusion:** Critical clinical and compliance value (CDS, criteria enforcement, pre-visit context, visit summaries, follow-up suggestions) is **built but not wired** into the main workflow. See **docs/AUDIT-FEATURE-INTERCONNECTION.md** for full detail and file references.

### 3.3 Workflow diagram (current)

**Current (post-improvements):**  
- **New consultation:** Pre-visit brief when existing patient selected → create consultation → **Record**.  
- **Record:** Transcript + **AIAssistantPanel** + **CDS** (analyze) + **Criteria Tracker** (evaluate-criteria) → Generate note → **Note**.  
- **Note:** Edit → Finalize → **visit summary** generated via API; **Add follow-up** CTA.  
- **Prescription:** Save → **Suggested follow-up** (e.g. Medication review in 2 weeks) with one-click create.

---

## 4. Challenges (technical)

| Challenge | Severity | Status |
|-----------|----------|---------|
| **Feature silos** | ~~High~~ | **Addressed:** CDS, Criteria Tracker, Pre-visit brief, visit summaries, follow-up suggestions wired. |
| **Inconsistent input validation** | Medium | **Partially addressed:** Zod for follow-ups and visit-summaries POST. |
| **No e2e tests** | ~~Medium~~ | **Addressed:** Playwright config + e2e/health.spec.ts (health API + booking page). |
| **Limited unit/integration tests** | Medium | Only 2 test files (validators, utils). No API route tests, no integration tests for Supabase or AI flows. |
| **AI latency and resilience** | Medium | Notes/CDS/criteria depend on LLM; 2–10+ s. No caching, no circuit breaker or fallback UX (e.g. “generating…” with timeout). |
| **Error handling and API contract** | Low–Medium | **Partially addressed:** api-response helper, health endpoint. |
| **Client-side robustness** | Low | Hydration/React errors (e.g. #418) reported in production; suggests some client state or conditional render issues. |
| **Config and env** | Low | If `DEEPGRAM_API_KEY` (or similar) missing, record shows “stream unavailable”; failure mode could be clearer (e.g. message + link to setup). |

---

## 5. Security snapshot

- **Auth:** Supabase Auth; middleware redirects unauthenticated users (except auth/public paths). API routes that need auth use `createClient()` (server) + `getUser()` and return 401 when missing.
- **RLS:** Enabled on core tables; policies are “own row” by `auth.uid()` or consultation ownership. Newer tables (follow_ups, visit_summaries, etc.) have migrations; RLS coverage on all tables should be confirmed.
- **Public APIs:** Bookings, clinics, waiting-room, intake responses are intentionally public; the rest should enforce auth.
- **Input:** Zod used where present; missing validation on many routes. No evidence of SQL injection (Supabase client parameterized); request body validation is the main gap.
- **Secrets:** Env-based (Supabase, Deepgram, Anthropic, etc.); no secrets in repo.

**Recommendation:** Audit every API route: (1) must call `getUser()` and return 401 if no user (except public list above); (2) validate body/query with Zod (or equivalent) and return 400 on failure.

---

## 6. What to improve (prioritized)

### P0 — Critical workflow connectivity

1. **Record page: CDS + Criteria Tracker**
   - Render **ClinicalDecisionSupport** (or a slim variant) on the record page; call `POST /api/ai/clinical-decision-support` with current transcript and patient meds; show alerts.
   - Call `POST /api/ai/evaluate-criteria` with transcript + selected (or suggested) diagnosis; show criteria progress (e.g. GAD 3/6) and suggested questions. Reuse or add a small “Criteria Tracker” panel.

2. **Pre-visit brief in flow**
   - Render **PreVisitBrief** when starting a consultation for an existing patient (e.g. on `consultation/new` when patient is selected, or on patient detail with “Start consultation”). Call `GET /api/ai/pre-visit-brief?patient_id=...`.

3. **Visit summaries**
   - After note finalization (or from note page), call `POST /api/visit-summaries` with consultation_id / patient_id and note content; store and optionally show or send patient-friendly summary.

4. **Follow-ups from prescription / note**
   - On prescription save (or explicit “Suggest follow-up”): suggest one or more follow-ups (e.g. from medication or plan); one-click create via existing `api/follow-ups`. Optionally suggest on note finalize.

### P1 — Reliability and quality

5. **API auth and validation**
   - Ensure every protected route calls `getUser()` and returns 401 if unauthenticated.
   - Add Zod (or shared validator) schemas for request body/query on all relevant routes; return 400 with clear message on validation failure.

6. **E2E tests**
   - Add Playwright config and at least one e2e flow: sign in → new consultation → record (or mock transcript) → generate note → open note → open prescription. Run in CI.

7. **AI UX and resilience**
   - For generate-note, CDS, evaluate-criteria: show clear “generating…” state and handle timeout/error (retry or message). Consider short-lived caching for identical transcript+template to avoid duplicate LLM calls.

### P2 — Observability and maintainability

8. **API response contract**
   - Standardize JSON responses (e.g. `{ data?, error?, code? }`) and optional error codes for client handling. Use a small helper or middleware for success/error responses.

9. **Health / readiness**
   - Add a lightweight `GET /api/health` or `GET /api/ready` (e.g. DB ping, optional Deepgram/LLM check) for load balancers and monitoring.

10. **Fix known client issues**
    - Address React hydration / context errors (e.g. #418) where reproducible; ensure server/client render consistency for conditional UI.

---

## 7. Summary table

| Area | Status | Action |
|------|--------|--------|
| Core consultation → note → prescription | ✅ Connected | Keep; add CDS + criteria + pre-visit + summaries + follow-up. |
| CDS | 🔴 Not in flow | P0: Add CDS panel to record (and optionally prescription). |
| DSM-5 / evaluate-criteria | 🔴 Not in flow | P0: Add Criteria Tracker to record; call evaluate-criteria. |
| Pre-visit brief | 🔴 Not in flow | P0: Render PreVisitBrief on new consultation / patient. |
| Visit summaries | 🔴 Not in flow | P0: Call visit-summaries after note finalize; expose in UI. |
| Follow-ups from workflow | 🔴 Manual only | P0: Suggest/create follow-up from prescription and note. |
| API auth + validation | 🟡 Partial | P1: Audit all routes; add Zod where missing. |
| E2E tests | 🔴 Missing | P1: Add Playwright e2e for core flow. |
| AI latency / errors | 🟡 No caching/timeout UX | P1: Loading states, timeouts, optional cache. |
| Error contract / health | 🟡 Ad hoc | P2: Standardize API responses; add health endpoint. |

---

## 8. References

- **Feature interconnection detail:** `docs/AUDIT-FEATURE-INTERCONNECTION.md`  
- **Product audit and one-pager:** `docs/MEDSCRIBE-ONE-PAGER-EN.md`  
- **Implementation plan (psychiatry/criteria):** `docs/IMPLEMENTARE-COPILOT-PSIHIATRIC.md`

---

---

## 9. Post-audit improvements (March 2026)

Implemented to raise the score from 6/10 to 8/10:

1. **Record page:** Added **ClinicalDecisionSupport** and **CriteriaTracker** (new component) to recording and post-recording phases; transcript passed to both.
2. **Consultation new:** **PreVisitBrief** rendered when an existing patient is selected.
3. **Note finalize:** On status → finalized, call **POST /api/visit-summaries** with consultation_id, patient_id, sections; added **Add follow-up** button when finalized.
4. **Prescription save:** Load **patient_id** from consultation; after save show **Suggested follow-up: Medication review in 2 weeks** with **Create follow-up** (POST /api/follow-ups).
5. **API:** **GET /api/health** (DB ping, no auth); **src/lib/api-response.ts** (apiSuccess, apiError, codes); **Zod** for follow-ups POST and visit-summaries POST; **apiError** used in follow-ups route.
6. **E2E:** **playwright.config.ts** and **e2e/health.spec.ts** (health 200 + public booking page load).

---

*Engineering audit performed by static and structural analysis of the MedScribe AI codebase (March 2026). Score updated to 8/10 after P0/P1 improvements.*
