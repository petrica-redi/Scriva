# MedScribe AI — Deployment Guide

## Live URLs

| Environment | URL |
|-------------|-----|
| Production  | https://medscribe-app.vercel.app |
| Local Dev   | http://localhost:3000 |

## GitHub Repository

- **Repo**: https://github.com/dip2017/MedScribe-app
- **Branch**: `main`
- **Project path**: `MedScribe/medscribe-ai-main` (nested inside repo root)

## Vercel Project Settings

These settings are saved in Vercel and persist across deployments. You do NOT need to reconfigure them each time.

| Setting | Value |
|---------|-------|
| Project Name | `medscribe-app` |
| Project ID | `prj_tPDlIrkpEiyjt5gbvqWIj6rRrHuc` |
| Framework | Next.js (auto-detected) |
| Root Directory | `MedScribe/medscribe-ai-main` |
| Build Command | `next build` (default) |
| Install Command | `npm install` (default) |
| Node.js Version | 18.x (default) |

## Environment Variables (Vercel)

Set once in **Vercel → Project Settings → Environment Variables**. They persist across all deployments.

| Variable | Source | Scope |
|----------|--------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Dashboard → Settings → API | All Environments |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Dashboard → Settings → API | All Environments |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Dashboard → Settings → API | All Environments |
| `DEEPGRAM_API_KEY` | https://console.deepgram.com → API Keys | All Environments |
| `ANTHROPIC_API_KEY` | https://console.anthropic.com → API Keys | All Environments |

## Deployment Workflow

Vercel auto-deploys on every push to `main`. No manual action needed.

```
Local code change
    ↓
git add . && git commit -m "description of change"
    ↓
git push origin main
    ↓
Vercel auto-builds & deploys (takes ~2 min)
    ↓
Live at https://medscribe-app.vercel.app
```

## How to Deploy

### Automatic (recommended)
Just push to `main`. Vercel watches the repo and deploys automatically.

```bash
git add .
git commit -m "fix: description of what changed"
git push origin main
```

### Manual Redeploy (if needed)
Go to Vercel Dashboard → Deployments → three dots on latest → Redeploy.

Only needed if you changed environment variables (they require a redeploy to take effect).

## Local Development

```bash
cd "MedScribe/medscribe-ai-main"
npm run dev
```

Environment variables are read from `.env.local` (not committed to git).

## Supabase

| Setting | Value |
|---------|-------|
| Project Ref | `oltonmgkzmfcmdbmyyuq` |
| Region | EU Central 1 |
| Dashboard | https://supabase.com/dashboard/project/oltonmgkzmfcmdbmyyuq |
| SQL Editor | https://supabase.com/dashboard/project/oltonmgkzmfcmdbmyyuq/sql/new |

## Troubleshooting

| Issue | Fix |
|-------|-----|
| "No Next.js version detected" on Vercel | Root Directory must be `MedScribe/medscribe-ai-main` |
| "Stream: unavailable" in recording | Check `DEEPGRAM_API_KEY` is set (uppercase) in Vercel env vars, then redeploy |
| "AI analysis unavailable" | Check `ANTHROPIC_API_KEY` is set (uppercase) in Vercel env vars, then redeploy |
| Auth redirect loop | Check Supabase URL and anon key are correct, no trailing whitespace |
| Build fails after push | Check `git push` output, then Vercel → Deployments → click failed build for logs |
