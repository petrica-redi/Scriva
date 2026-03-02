# MedScribe AI — Full Changelog (All Changes Since Upload)

All changes made since the project was uploaded to the workspace.

---

## v0 → v0.1 (Initial Setup)

- Uploaded full MedScribe AI project to workspace
- Updated seed demo data

## v0.1 → v1-demo (Major Feature Build)

### TypeScript compilation fixes
- Resolved all TypeScript compilation errors across the project

### Internationalization (i18n) — Complete
- Full EN + RO translations for entire application
- 500+ translation keys covering all UI elements

### Dashboard enhancements
- Risk flags UI with patient risk overview panel
- Risk patients table
- Patient progress charts
- Dashboard greeting component
- Dashboard stats (expandable)
- Medication alerts panel
- Pending prescriptions panel
- Priority queue
- Today's schedule
- Recent consultations

### New Pages Created
- **Booking page** (`src/app/(public)/book/page.tsx`) — Full patient booking system with clinic search, physician profiles, appointment scheduling
- **AI Assistant** (`src/app/(app)/ai-assistant/page.tsx`) — Clinical query interface with patient-specific and ICD lookup modes
- **Analytics** (`src/app/(app)/analytics/page.tsx`) — Consultation analytics, ICD analysis, report generation
- **Calendar** (`src/app/(app)/calendar/page.tsx`) — Day/week/month views with consultation scheduling
- **Consultation Recording** (`src/app/(app)/consultation/[id]/record/page.tsx`) — Real-time transcription with Deepgram, AI Copilot panel
- **Consultation Notes** (`src/app/(app)/consultation/[id]/note/page.tsx`) — SOAP note generation, source traceability, section regeneration
- **Prescription** (`src/app/(app)/consultation/[id]/prescription/page.tsx`) — Prescription creation and PDF export
- **New Consultation** (`src/app/(app)/consultation/new/page.tsx`) — Consultation creation with patient linking
- **Patients list** (`src/app/(app)/patients/page.tsx`) — Patient database with search
- **Patient detail** (`src/app/(app)/patients/[id]/page.tsx`) — Full patient file with consultations, pending actions
- **Settings** (`src/app/(app)/settings/page.tsx`) — Profile, audio, templates, security (2FA), integrations, notifications
- **Templates** (`src/app/(app)/templates/page.tsx`) — Note template management
- **Template editor** (`src/app/(app)/templates/[id]/edit/page.tsx`) — Template editing
- **Privacy policy** (`src/app/(public)/privacy/page.tsx`)
- **Terms of service** (`src/app/(public)/terms/page.tsx`)
- **Waiting room** (`src/app/(public)/waiting-room/[id]/page.tsx`)
- **Sign In** (`src/app/auth/signin/page.tsx`)
- **Sign Up** (`src/app/auth/signup/page.tsx`)

### API Routes Created
- `/api/ai/analyze-consultation` — AI clinical analysis
- `/api/ai/ask` — AI clinical assistant queries
- `/api/ai/provider-status` — AI provider health check
- `/api/auth/signout` — Session termination
- `/api/bookings` + `/api/bookings/confirm` — Appointment booking
- `/api/clinics/search` — Clinic discovery
- `/api/consultations` + `/api/consultations/[id]` — CRUD consultations
- `/api/data-deletion` — GDPR data deletion
- `/api/deepgram/stream-key` + `/api/deepgram/stream-test` + `/api/deepgram/test` + `/api/deepgram/transcribe` — Audio transcription
- `/api/export/json` + `/api/export/pdf` — Data export
- `/api/generate-note` — SOAP note generation
- `/api/notes/regenerate` + `/api/notes/regenerate-section` — Note section regeneration
- `/api/patients` + `/api/patients/[id]` — Patient CRUD
- `/api/prescriptions` + `/api/prescriptions/pdf` — Prescription management
- `/api/search` — Global search
- `/api/settings/audit-export` — Audit trail export
- `/api/templates` — Template CRUD
- `/api/waiting-room/[id]` — Waiting room status

### Components Created
- AI Assistant Panel (real-time clinical copilot)
- Audio Visualizer
- Google Meet Embed
- Dashboard: Greeting, Stats, Medication Alerts, Patients at Risk, Pending Prescriptions, Priority Queue, Recent Consultations, Today Schedule, Risk Overview Panel, Risk Patients Table, Patient Progress Charts
- Layout: App Shell, Header, Sidebar
- Templates View
- UI: Badge, Button, Card, Input, Language Switcher, Loading, Select, Toast
- Error Boundary
- Providers (i18n context)

### Hooks
- `useAudioRecorder` — Full audio recording with Deepgram streaming

### Libraries
- Supabase client configuration
- Supabase middleware (auth session management)
- Audit logging utility
- Demo data seed
- i18n translations (EN + RO)
- Utility functions

---

## v1-demo → v1.1 (P0/P1 Round 2)

- Bug fixes across consultation flow
- Enhanced dashboard content
- Sidebar improvements
- Badge component updates
- Demo data refinements
- Additional i18n translations

---

## v1.1 → Current (February 27 – March 2, 2026)

### Forgot Password Page — NEW
**File:** `src/app/auth/forgot-password/page.tsx`
- Password reset request via Supabase `resetPasswordForEmail()`
- Confirmation message after sending
- Fully translated EN + RO

### Reset Password Page — NEW
**File:** `src/app/auth/reset-password/page.tsx`
- Set new password after clicking email link
- Validation: min 8 chars, passwords must match
- Redirects to dashboard on success

### Sign In Page — MODIFIED
**File:** `src/app/auth/signin/page.tsx`
- Added "Forgot password?" link
- Added show/hide password toggle (eye icon)

### Translations — MODIFIED
**File:** `src/lib/i18n/translations.ts`
- 12 new keys for forgot/reset password flow (EN + RO)

### Booking Page — BUG FIX
**File:** `src/app/(public)/book/page.tsx`
- Removed undefined `setBookingDoctor(null)` reference (line 818)
- Fixed Vercel production build failure

### Vercel Deployment
- Linked project to Vercel account
- Fixed environment variables (NEXT_PUBLIC_SUPABASE_URL added to all environments)
- Force-deployed with clean cache
- Pushed to GitHub: `https://github.com/dip2017/MedscribeAI_March02`

### Supabase Admin
- Reset password for `d.i.pirjol@gmail.com` via Admin API

---

## File Count Summary

| Category | Count |
|----------|-------|
| Pages (app routes) | 20+ |
| API routes | 25+ |
| Components | 30+ |
| Total files changed since v0 | 230 |
| Total lines added | ~39,500 |

---

*Document generated by Vasile (OpenClaw AI) — March 2, 2026*
