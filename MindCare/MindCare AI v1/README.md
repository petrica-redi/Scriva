# AI Medical Scribe (Heidi MVP)

HIPAA-compliant AI-powered clinical documentation. Records doctor-patient consultations, transcribes in real-time via Deepgram, and generates structured clinical notes via Claude.

## What's Built

This is a **complete working MVP** — not a scaffold. Every page, API route, and service has real implementation:

- **Auth**: Sign up, sign in, sign out, session timeout (15min HIPAA), email confirmation
- **Dashboard**: Stats, recent consultations, quick actions
- **Consultation Recorder**: 3-phase flow (consent → live recording with transcript → post-recording review)
- **Note Editor**: Split-view transcript/note, section editing, auto-save, billing codes, status workflow (draft → reviewed → finalized)
- **Template Manager**: View/create/edit note templates with drag-reorder sections
- **Settings**: Profile, audio preferences, default templates, password change
- **AI Pipeline**: FastAPI service with Deepgram streaming transcription, Claude note generation, billing code extraction
- **API Routes**: Full CRUD for consultations, templates, note generation
- **Database**: Complete PostgreSQL schema with RLS, indexes, triggers, 6 seeded templates

## Quick Start

### Prerequisites

- Node.js 20+
- Python 3.12+
- Supabase account (free tier works)
- Deepgram API key
- Anthropic API key

### 1. Setup

```bash
# Clone and install
npm install

# Clean up any duplicate route files
bash scripts/cleanup-old-routes.sh

# Python AI service
cd services/ai-pipeline
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
cd ../..

# Environment variables
cp .env.example .env.local
cp services/ai-pipeline/.env.example services/ai-pipeline/.env
# Fill in your API keys in both files
```

### 2. Database

1. Create a project at [supabase.com](https://supabase.com)
2. Go to SQL Editor → paste contents of `supabase/migrations/001_initial_schema.sql` → Run
3. Copy Project URL + Anon Key + JWT Secret to `.env.local`

### 3. Run

```bash
# Terminal 1: Frontend
npm run dev

# Terminal 2: AI service
cd services/ai-pipeline && source venv/bin/activate
uvicorn main:app --reload --port 8000
```

Visit [http://localhost:3000](http://localhost:3000)

## Architecture

```
Browser ←→ Next.js 15 (App Router + API Routes) ←→ Python FastAPI ←→ Deepgram / Claude
                ↕
           Supabase (PostgreSQL + Auth + RLS)
```

### Frontend Stack
Next.js 15, React 19, TypeScript, Tailwind CSS, Zustand, TanStack Query, Zod

### Backend Stack
- **Next.js API Routes**: Auth, CRUD, proxy to AI service
- **Python FastAPI**: Audio WebSocket (Deepgram), note generation (Claude), billing codes
- **Supabase**: PostgreSQL with Row Level Security, Auth, real-time

## Project Structure

```
src/
  app/(app)/              # Authenticated pages (dashboard, consultation, templates, settings)
  app/api/                # API routes (consultations, generate-note, templates)
  app/auth/               # Auth pages (signin, signup, confirm)
  components/             # UI components (layout, audio, notes, common)
  hooks/                  # useAudioRecorder, useSessionTimeout
  lib/                    # Supabase clients, utils, validators
  services/               # Client-side API service layer
  stores/                 # Zustand stores (auth, recording, consultation, UI)
  types/                  # TypeScript type definitions

services/ai-pipeline/     # Python FastAPI
  routers/                # WebSocket + REST endpoints
  services/               # Note generation, billing engine
  prompts/                # SOAP, referral, discharge prompt templates
  models/                 # Pydantic schemas, config
```

## Key Services

| Service | Sign Up | What You Need |
|---------|---------|---------------|
| Supabase | supabase.com | Project URL + Anon Key + JWT Secret |
| Deepgram | console.deepgram.com | API Key (request Nova-3 Medical access) |
| Anthropic | console.anthropic.com | API Key |

## Cursor Rules

The `.cursor/rules/` directory contains 5 rule files that automatically feed context to Cursor AI:

1. **project-overview.mdc** — Architecture, naming conventions, tech stack
2. **database-schema.mdc** — All tables, RLS policies, indexes
3. **frontend-patterns.mdc** — Component patterns, state management, styling guide
4. **ai-pipeline.mdc** — Transcription flow, prompt engineering, error handling
5. **hipaa-compliance.mdc** — Security requirements, audit logging, data handling

## Monthly Costs (MVP)

| Service | Estimate |
|---------|----------|
| Deepgram Nova-3 Medical | ~$200-500 |
| Claude API | ~$100-300 |
| Supabase Pro | $25 |
| Vercel Pro | $20 |
| **Total** | **~$345-845** |

## License

Private — all rights reserved.
