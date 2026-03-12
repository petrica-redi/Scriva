# Connect Vercel and Supabase to This Repo

Repo: **https://github.com/dip2017/MedScribe-app**

---

## 1. Connect Vercel to GitHub

### Option A: Vercel Dashboard (recommended)

1. Go to **[vercel.com/new](https://vercel.com/new)** and sign in (or create an account).
2. Click **“Import Git Repository”** and choose **GitHub**.
3. Authorize Vercel to access GitHub if prompted.
4. Select the repo: **dip2017/MedScribe-app**.
5. **Important:** Set **Root Directory** to:
   ```
   MedScribe/medscribe-ai-main
   ```
   (The Next.js app lives in this subfolder.)
6. **Framework Preset:** leave as **Next.js** (auto-detected).
7. **Build Command:** `npm run build` (default).
8. **Environment variables:** Add them in the next step (see below); you can also add them after the first deploy in **Project → Settings → Environment Variables**.
9. Click **Deploy**. The first deploy may fail until env vars are set; add them and redeploy.

### Option B: Vercel CLI

From the **app** folder (so Vercel uses this as the root):

```bash
cd "/Users/pirjoldiana/Documents/Proiecte IT/MedScribe Project/MedScribe-app/MedScribe/medscribe-ai-main"
npx vercel login
npx vercel link
# Choose your Vercel account/team, then "Link to existing project" or "Create new project"
# If the repo root is the parent, create project first in dashboard with Root Directory = MedScribe/medscribe-ai-main
npx vercel env add NEXT_PUBLIC_SUPABASE_URL
# ... add other vars (see list below)
npx vercel --prod
```

---

## 2. Add Environment Variables (Vercel)

In **Vercel → Your Project → Settings → Environment Variables**, add (for Production and Preview):

| Name | Value | Notes |
|------|--------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://YOUR_PROJECT.supabase.co` | Supabase → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJ...` | Supabase → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJ...` | Supabase → Settings → API (secret) |
| `DEEPGRAM_API_KEY` | your key | For recording/transcription |
| `ANTHROPIC_API_KEY` | your key | For AI/notes |
| `JWT_SECRET` | Supabase JWT Secret | Supabase → Settings → API |

Optional (if you use them): `NEXT_PUBLIC_AI_SERVICE_URL`, `NEXT_PUBLIC_WS_URL`, Sentry, etc.

Then trigger a **Redeploy** (Deployments → ⋮ → Redeploy).

---

## 3. Connect Supabase to GitHub (optional)

Supabase doesn’t “connect” to a repo the same way Vercel does. You typically:

- **Use one Supabase project** for both local and Vercel (same env vars in Vercel as in `.env.local`).
- **Migrations:** Run locally with `supabase db push` or use Supabase Dashboard → SQL Editor. To automate from GitHub, use **Supabase GitHub integration** (if enabled for your org) or CI (e.g. GitHub Actions that run `supabase db push`).

### Link Supabase project (for CLI / migrations)

1. In [Supabase Dashboard](https://supabase.com/dashboard), open your project.
2. **Settings → API:** copy **Project URL** and **anon** / **service_role** keys into Vercel env vars (see table above).
3. For local + CLI:
   ```bash
   cd MedScribe/medscribe-ai-main
   npx supabase link --project-ref YOUR_PROJECT_REF
   ```
   Project ref is in the project URL: `https://app.supabase.com/project/YOUR_PROJECT_REF`.

---

## 4. Summary

| Service | Action |
|--------|--------|
| **Vercel** | Import **dip2017/MedScribe-app**, set **Root Directory** to `MedScribe/medscribe-ai-main`, add env vars, deploy. |
| **Supabase** | Create/use a project, copy URL + keys into Vercel env vars; optionally `supabase link` for migrations. |

After this, every push to `main` will deploy on Vercel (if you left the default “Deploy on push” on).
