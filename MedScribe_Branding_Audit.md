# MedScribe — UI & Branding Audit for European Market
**Date:** March 14, 2026 | **Prepared for:** Petrica, CEO

---

## The Problem in One Sentence

MedScribe currently looks and feels like a US-market SaaS demo project, not a trusted European medical platform that a doctor in Bucharest, Berlin, or Brussels would pay for.

---

## 1. NAME: "MedScribe" Needs to Change

**Why it doesn't work:**
- "MedScribe" is already used by multiple US companies (MedScribe Inc., iMedScribe, etc.). You'll hit trademark issues.
- "Scribe" is very American healthcare jargon. European doctors say "clinical documentation" or "notes."
- The domain `medscribe-ai-main-fawn.vercel.app` screams "prototype." For European doctors, trust = professional domain.

**Naming direction for Europe:**
The successful European competitors chose short, distinctive, non-medical-jargon names: **Nabla** (Paris), **Heidi** (Australia/UK), **Freed** (US but expanding). They feel approachable, not clinical. European B2B health-tech tends toward warm, human names — not cold technical ones.

**Name suggestions to explore (check trademark availability):**

| Name | Rationale | Domain availability |
|------|-----------|-------------------|
| **Scriva** | From Latin "scribere" (to write). Works in Romance languages (RO, FR, IT, ES). Short, memorable. | Check scriva.eu, scriva.health |
| **Notara** | "Notar" = notary across many European languages. Medical + official. | Check notara.eu |
| **Kliniq** | "Clinic" spelled in a distinctive way. Works cross-language. | Check kliniq.eu |
| **Medra** | Short, soft, sounds medical across languages. | Check medra.eu, medra.health |
| **Vocura** | "Vox" (voice) + "cura" (care). Latin roots, pan-European. | Check vocura.eu |

**My pick: Scriva** — it's Latin, works in Romanian ("a scrie" = to write), sounds professional in German, French, and Italian, and nobody else is using it. But this is your brand decision.

---

## 2. WHAT I SAW ON THE LIVE SITE — Issues

### Dashboard Problems

**"DAILY COMMAND CENTER"** — This sounds like a military operations room, not a doctor's workspace. European doctors want calm, professional tools. Nabla's tagline is "Enjoy care again." Heidi calls itself "Your AI Care Partner."

**"Precision Workspace" badge** in the header — Marketing fluff that means nothing. Remove it.

**"SESSION READINESS / System Health: Operational"** — This is DevOps language. A doctor doesn't care about "system health." They care about "ready to record." Simplify to a small green dot + "Ready" or remove entirely.

**ShieldAlert icon as logo** — This is a lucide-react warning/security icon. It connotes danger, not trust. A medical platform needs a logo that conveys care, precision, or documentation — not "your account has been compromised."

**Test data visible** — Patients named "ddd", "sds", "ooi", "lkl", "kjkjds". For any demo or investor meeting, this must be clean. Seed your demo database with realistic European names: "Ana Popescu", "Klaus Weber", "Sophie Martin."

**Time format: AM/PM** — Europe uses 24-hour format (14:30, not 2:30 PM). This should auto-detect from locale or default to 24h.

### Admin Panel Problems

**CPT Coding shown as "ACTIVE"** — CPT is US-only billing. Europe uses ICD-10 (which you have) but not CPT. For European doctors, showing CPT signals "this is an American product." Replace with relevant European standards.

**USCDI v5** — US Core Data for Interoperability. Not relevant in Europe. Remove or replace with European equivalents (HL7 FHIR EU, openEHR).

**HIPAA / GDPR** shown together — HIPAA is US. For Europe, lead with GDPR only. Show HIPAA only if the user's locale is US.

**NHS GP Connect: PLANNED** — Good for UK, but show this only to UK users. For EU users, show country-specific integrations.

### Color & Visual Problems

**Standard Tailwind Blue (#3b82f6)** — This is the default `blue-500` that every Next.js starter template uses. It doesn't say "premium medical software." Your competitors differentiate strongly on color:
- **Nabla**: Deep forest green (#1a3a2a) — conveys trust, nature, calm
- **Heidi**: Warm cream + muted gold — conveys approachability, warmth
- **Freed**: Deep purple (#7c3aed) — conveys innovation, premium

You're using the same blue as every generic SaaS dashboard. European medical software tends toward greens and teals (trust, health) or warm neutrals (approachability).

**No favicon** — The browser tab shows a generic Next.js icon. This is one of the first things a doctor notices.

**Avatar: single letter on blue circle** — Looks unfinished. Consider using the Google profile photo for OAuth users, or a more sophisticated avatar with initials + gradient.

---

## 3. RECOMMENDED COLOR PALETTE — European Medical

### Option A: "Clinical Teal" (My recommendation)

A teal-based palette conveys trust, healthcare, and European professionalism. Teal is the most commonly associated color with healthcare in Europe, used by the NHS, EU Health Commission, and dozens of European health-tech companies.

```
Primary:     #0d9488 (teal-600)  → buttons, active states, links
Primary dark: #0f766e (teal-700)  → hover states
Primary light: #ccfbf1 (teal-100) → backgrounds, badges
Accent:      #f59e0b (amber-500)  → warnings, attention items
Background:  #f8fafb             → slightly cool white
Card:        #ffffff
Text:        #1e293b (slate-800)
Muted text:  #64748b (slate-500)
Border:      #e2e8f0
Success:     #16a34a
Danger:      #dc2626
Recording:   #dc2626 (red, keep — universal for recording)
```

### Option B: "Nordic Clean"

Inspired by Scandinavian health-tech (used by Swedish/Danish health platforms). Clean, minimal, high trust.

```
Primary:     #2563eb (blue-600, but used differently)
Background:  #fafbfc (almost pure white)
Card:        #ffffff
Accent:      #10b981 (emerald-500)
Text:        #111827 (gray-900)
Border:      #f3f4f6 (very light, almost invisible)
```

### Option C: "Warm European"

Closer to Heidi Health's approach. Warm, approachable, less clinical.

```
Primary:     #7c3aed (violet-600)
Background:  #fdf8f0 (warm cream)
Card:        #ffffff
Accent:      #f59e0b (amber)
Text:        #292524 (stone-800)
```

**I recommend Option A (Clinical Teal)** because it's the strongest signal for "European healthcare" and differentiates you from every blue SaaS dashboard.

---

## 4. TYPOGRAPHY — What to Change

**Current:** Fraunces (display) + Manrope (body) + JetBrains Mono

**Problem:** Fraunces is an ornamental serif font. It looks beautiful on a blog but feels out of place in a medical application. Doctors want clarity, not decoration. Manrope is fine for body text.

**Recommendation:**
- **Display/Headings:** Inter or Plus Jakarta Sans — clean, modern, highly legible at all sizes. Both are Google Fonts, free, and render well on European language characters (ă, ë, ü, ø, etc.)
- **Body:** Keep Manrope or switch to Inter for consistency
- **Mono:** JetBrains Mono is fine, keep it

Why Inter? It was designed specifically for screen readability with support for 200+ languages. Used by GitHub, Vercel, Linear, and most European SaaS companies. It's the "safe professional choice."

---

## 5. LANGUAGE & COPY — Europeanize the Interface

### Replace American tech jargon:

| Current | Replace with | Why |
|---------|-------------|-----|
| "DAILY COMMAND CENTER" | "Today's Overview" or just "Good morning, Dr. [Name]" | Doctors aren't fighter pilots |
| "Precision Workspace" | Remove entirely | Empty marketing speak |
| "SESSION READINESS" | "Status: Ready" (small, unobtrusive) | Doctors don't think in "sessions" |
| "System Health: Operational" | Remove or small green dot | DevOps language |
| "Attention Queue" | "Needs Review" | Clearer, simpler |
| "Fill forms" | "Complete" | Less bureaucratic |
| "Export JSON" | Remove from patient view (keep in admin) | Doctors don't know what JSON is |
| "Start Consultation" button | "New Consultation" or "Begin" | Cleaner |

### Date/Time Localization
- Default to 24h format for all European locales
- Date format: DD/MM/YYYY (not MM/DD/YYYY)
- Use the user's browser locale to auto-detect

### Compliance Badges
- Lead with **GDPR Compliant** + **EU Data Residency**
- Add **CE marking** if applicable
- Show HIPAA only for US-locale users
- Remove CPT, USCDI from European view entirely

---

## 6. LOGO — What You Need

The ShieldAlert icon must go. You need a proper logo.

**Direction:** A simple wordmark (like Nabla or Heidi) with a small icon mark. The icon should suggest either documentation (pen, note) or voice (waveform) — your two core actions.

**Budget options:**
1. **Quick/free:** Use a clean wordmark in Inter Bold + a simple SVG icon (stethoscope waveform, or pen-on-document). I can generate an SVG for you.
2. **Medium ($500-2000):** Hire a freelancer on 99designs or Dribbble for a proper logo package with brand guidelines.
3. **Proper ($3000-8000):** European health-tech branding agency. Worth it if you're raising funding.

For now, a clean wordmark in the right font with a distinctive color will be 10x better than the ShieldAlert icon.

---

## 7. COMPETITIVE POSITIONING SUMMARY

| | MedScribe (current) | Nabla (Paris) | Heidi (AU/UK) | Freed (US) |
|---|---|---|---|---|
| **Color** | Generic blue | Deep green | Warm cream/gold | Purple |
| **Font** | Ornamental serif | Clean sans | Rounded sans | Clean sans |
| **Tone** | "Command Center" | "Enjoy care again" | "AI Care Partner" | "Focus on people" |
| **Logo** | ShieldAlert icon | Clean wordmark | Knot symbol | Bird/checkmark |
| **Trust signal** | None shown | "150+ health orgs" | "2M+ consults/week" | "26k+ clinicians" |
| **Compliance** | HIPAA + GDPR mixed | GDPR-first | GDPR + local | HIPAA + SOC2 |

**Your gap:** No trust signals, no social proof, American compliance framing, generic visuals.

---

## 8. QUICK WINS (do before next doctor demo)

1. **Remove "DAILY COMMAND CENTER"** → "Good morning, Dr. [Name]"
2. **Remove "Precision Workspace" badge** from header
3. **Remove "SESSION READINESS"** block or simplify to green dot
4. **Switch time format to 24h** for European locales
5. **Clean up test data** — seed realistic European patient names
6. **Add a favicon** — even a simple teal circle with a "M" is better than nothing
7. **Remove "Export JSON" button** from patient-facing views
8. **Replace ShieldAlert icon** with a simple SVG wordmark

---

## 9. MEDIUM-TERM BRAND WORK (next 2-4 weeks)

1. Choose a new name and secure the `.eu` and `.health` domain
2. Commission a proper logo (or let me generate a clean SVG wordmark)
3. Switch color palette from blue to teal (Option A)
4. Replace Fraunces display font with Inter or Plus Jakarta Sans
5. Add a landing page with European trust signals: GDPR badge, "EU data residency", doctor testimonials
6. Localize compliance: remove CPT/USCDI from EU view, add ICD-10 EU, openEHR
7. Add country-specific integrations to admin view based on user locale

---

## 10. CURSOR PROMPT — Quick Wins Branding Fix

Use **Sonnet 4** for this:

```
Apply these branding quick-fixes across the MedScribe codebase.
Do NOT change any business logic — visual/copy changes only.

1. src/app/(app)/dashboard/page.tsx
   - Replace "DAILY COMMAND CENTER" with "Today's Overview"
   - Remove the "Precision Workspace" badge from the greeting area
   - Remove "SESSION READINESS / System Health: Operational" block

2. src/components/layout/header.tsx
   - Remove the "Precision Workspace" badge/button

3. src/components/layout/sidebar.tsx
   - Replace the ShieldAlert icon with Activity icon from lucide-react
     (a heart-rate/waveform icon — more medical)
   - Change "AI DOCUMENTATION" subtitle to "Clinical AI"
   - Change sidebar background from bg-[#f6f8fa]/95 to bg-[#f0fdfa]/95
     (teal-50 tint instead of blue-gray)

4. tailwind.config.ts
   - Change brand color palette from blue to teal:
     50: "#f0fdfa", 100: "#ccfbf1", 200: "#99f6e4",
     300: "#5eead4", 400: "#2dd4bf", 500: "#14b8a6",
     600: "#0d9488", 700: "#0f766e", 800: "#115e59",
     900: "#134e4a", 950: "#042f2e"

5. src/app/(app)/dashboard/page.tsx
   - In the calendar table, change time format from 12h to 24h:
     Replace any .toLocaleTimeString() calls with
     .toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false })

6. public/favicon.ico
   - Create a simple 32x32 SVG favicon: teal circle with white "M" letter
   - Save as public/favicon.svg and reference in layout.tsx metadata

7. src/app/(app)/admin/page.tsx
   - Rename "CPT Coding" card to "Procedure Coding (ICD-10-PCS)"
   - Rename "USCDI v5" card to "EU Health Data Space"
   - In the HIPAA/GDPR card, change label to "GDPR Compliance"
```

---

*Brand is how doctors decide to trust you before they've tried the product.*
