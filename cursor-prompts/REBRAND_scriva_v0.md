# Scriva.doctor — Full UI Rebrand Prompt
# Model: Sonnet 4 | Use v0-quality design standards

## Brand Identity
- **Name:** Scriva
- **Domain:** scriva.doctor
- **Tagline:** "Clinical AI for European Healthcare"
- **Tone:** Calm, professional, trustworthy. Think Swiss bank meets Scandinavian health-tech.
- **Target:** Doctors in EU (Romania, Germany, France, Netherlands, Italy). Premium feel.

---

## PART 1: Design System (tailwind.config.ts + globals.css)

### Color Palette — Clinical Teal
Replace the entire `brand` object in `tailwind.config.ts`:

```ts
brand: {
  50:  "#f0fdfa",
  100: "#ccfbf1",
  200: "#99f6e4",
  300: "#5eead4",
  400: "#2dd4bf",
  500: "#14b8a6",
  600: "#0d9488",
  700: "#0f766e",
  800: "#115e59",
  900: "#134e4a",
  950: "#042f2e",
},
```

Update `medical` semantic tokens:
```ts
medical: {
  bg: "#fafbfc",       // cool white, barely tinted
  card: "#ffffff",
  border: "#e8ecf0",   // softer border
  text: "#1a2332",     // deep navy, not pure black
  muted: "#6b7a8d",    // warm slate
  accent: "#0d9488",   // teal-600 (matches brand)
  success: "#059669",  // emerald-600
  warning: "#d97706",
  danger: "#dc2626",
  recording: "#dc2626",
},
```

### Typography — Replace Fraunces with Inter
In `src/app/layout.tsx`:
- Replace `import { Manrope, Fraunces } from "next/font/google"` with `import { Inter } from "next/font/google"`
- Remove Fraunces entirely
- Set up Inter as both sans and display:
```tsx
const inter = Inter({
  subsets: ["latin", "latin-ext"],  // latin-ext for Romanian ă/î/ș/ț, German ü/ö/ä, etc.
  variable: "--font-sans",
});
```
- Remove `fraunces.variable` from body className
- Body: `${inter.variable} font-sans bg-medical-bg text-medical-text antialiased`

In `tailwind.config.ts`, update fontFamily:
```ts
fontFamily: {
  sans: ["var(--font-sans)", "system-ui", "sans-serif"],
  display: ["var(--font-sans)", "system-ui", "sans-serif"],  // same as sans now
  mono: ["JetBrains Mono", "monospace"],
},
```

### Shadows — Softer, more refined
```ts
boxShadow: {
  ambient: "0 1px 3px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.04)",
  lift: "0 4px 12px rgba(0,0,0,0.06), 0 20px 48px rgba(0,0,0,0.08)",
  "card": "0 1px 2px rgba(0,0,0,0.03), 0 4px 16px rgba(0,0,0,0.03)",
  "inner-glow": "inset 0 1px 0 rgba(255,255,255,0.8)",
},
```

### globals.css — Clean background
Replace the radial gradient body background with a clean, minimal one:
```css
body {
  background: #fafbfc;
}
```

Remove the `.glass-panel` class. Replace with:
```css
.surface-elevated {
  background: white;
  border: 1px solid #e8ecf0;
  border-radius: 16px;
  box-shadow: 0 1px 2px rgba(0,0,0,0.03), 0 4px 16px rgba(0,0,0,0.03);
}

.surface-subtle {
  background: #f5f7f9;
  border: 1px solid #e8ecf0;
  border-radius: 12px;
}
```

---

## PART 2: Logo & Sidebar (src/components/layout/sidebar.tsx)

### Replace ShieldAlert with custom Scriva logomark
Replace the ShieldAlert import and logo section with:

```tsx
// Remove ShieldAlert from imports
// Add this SVG logomark inline (waveform + pen nib, represents voice → document)
<Link href="/dashboard" className="group mb-8 flex items-center gap-3.5" onClick={onClose}>
  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-700 shadow-md shadow-brand-900/20 transition group-hover:shadow-lg group-hover:shadow-brand-900/25">
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M4 12h2l3-6 4 12 3-6h4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  </div>
  <div>
    <p className="text-[19px] font-semibold tracking-[-0.02em] text-medical-text">Scriva</p>
    <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-brand-600">Clinical AI</p>
  </div>
</Link>
```

### Remove "SESSION READINESS" block entirely
Delete the entire `<div className="mb-4 rounded-2xl border border-brand-100 ...">` block that shows "Session Readiness / System Health: Operational".

### Sidebar background — Cleaner
Change sidebar background from `bg-[#f6f8fa]/95` to `bg-white/95`:
```tsx
className={cn(
  'fixed left-0 top-0 z-50 flex h-screen w-72 flex-col border-r border-medical-border/60 bg-white/95 px-5 pb-5 pt-6 backdrop-blur-xl transition-transform duration-300 lg:z-auto lg:translate-x-0',
  isOpen ? 'translate-x-0' : '-translate-x-full'
)}
```

### Active nav item — Teal accent
Replace the active state gradient:
```tsx
active
  ? 'bg-brand-50 text-brand-800 font-semibold'
  : 'text-medical-muted hover:bg-gray-50 hover:text-medical-text'
```

Remove the `shadow-sm ring-1 ring-brand-200` from active state — too busy. Clean and minimal.

### Remove the Admin Panel from sidebar nav for non-admin users
The admin link should only show if the user is an admin. For now, keep it visible but this should be addressed later.

---

## PART 3: Header (src/components/layout/header.tsx)

### Remove "Precision Workspace" badge
Delete the entire `<div className="hidden items-center gap-2 rounded-xl border border-brand-100 bg-brand-50/70 ...">` block.

### Cleaner header style
```tsx
<header className="fixed left-0 right-0 top-0 z-40 border-b border-medical-border/40 bg-white/80 px-4 py-3 backdrop-blur-xl lg:left-72 sm:px-6">
```

### Avatar — Teal gradient
Change avatar gradient from `from-brand-600 to-brand-400` to:
```tsx
className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-700 text-sm font-bold text-white"
```
Simple, no gradient. More premium.

---

## PART 4: Dashboard (src/app/(app)/dashboard/page.tsx)

### Replace "DAILY COMMAND CENTER" greeting
Find the greeting section and replace:
- Remove "DAILY COMMAND CENTER" badge entirely
- Change greeting to just: `Good morning, Dr. {name}` (no subtitle badge)
- Keep the description but change to: "Your consultations and tasks for today"
- Remove decorative blur elements (the `bg-brand-100/60 blur-2xl` positioned divs)

### Stats cards — Cleaner style
Replace the glass-panel effect with clean cards:
```tsx
className="surface-elevated flex items-center justify-between p-5"
```
No gradients, no colored borders. White card, subtle shadow, clean numbers.

### Time format — 24h for Europe
Any `.toLocaleTimeString()` calls should use:
```ts
.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false })
```
Also date format should be:
```ts
.toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" })
```

### Start Consultation button — Teal
Change from `bg-brand-700` to:
```tsx
className="rounded-xl bg-brand-700 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-800 hover:shadow-md"
```

---

## PART 5: Admin Panel (src/app/(app)/admin/page.tsx)

### Replace US-specific standards with EU equivalents
In the "Medical Notation & Storage Standards" section:
- "CPT Coding" → "ICD-10 Procedure Coding" (label change only)
- "USCDI v5" → "EU Health Data Space (EHDS)"
- "HIPAA / GDPR" → "GDPR Compliance"
- "NHS GP Connect" → keep as-is (UK is a target market)
- Keep "SOAP Notes", "ICD-10 Coding", "HL7 FHIR R4", "SNOMED CT" as-is

---

## PART 6: Favicon + Metadata

### Create favicon SVG
Create `public/favicon.svg`:
```svg
<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
  <rect width="32" height="32" rx="8" fill="#0f766e"/>
  <text x="16" y="22" font-family="Inter, system-ui, sans-serif" font-size="18" font-weight="700" fill="white" text-anchor="middle">S</text>
</svg>
```

### Update metadata in layout.tsx
```tsx
export const metadata: Metadata = {
  title: {
    default: "Scriva",
    template: "%s — Scriva",
  },
  description: "Clinical AI for European Healthcare — real-time transcription, diagnostic guidance, and intelligent documentation",
  icons: {
    icon: "/favicon.svg",
  },
  metadataBase: new URL("https://scriva.doctor"),
  openGraph: {
    title: "Scriva — Clinical AI for European Healthcare",
    description: "Real-time transcription, diagnostic guidance, and intelligent documentation for clinicians",
    siteName: "Scriva",
    locale: "en_EU",
    type: "website",
  },
};
```

---

## PART 7: Auth Pages (signin + signup)

### src/app/auth/signin/page.tsx and signup/page.tsx
- Replace any "MedScribe" text with "Scriva"
- Change background from `bg-gradient-to-br from-slate-50 to-slate-100` to `bg-[#fafbfc]`
- Replace blue gradient text with teal:
  `className="bg-gradient-to-r from-brand-700 to-brand-500 bg-clip-text text-transparent"`
- Add subtitle below logo: `"Clinical AI for European Healthcare"` in `text-medical-muted text-sm`
- Google sign-in button: keep white outline style, add Google "G" icon
- Add at bottom of auth card: "GDPR Compliant · EU Data Residency" in small muted text

---

## PART 8: Patient Database (src/app/(app)/patients/page.tsx)

- Remove "Export JSON" button from the top actions (keep "Export PDF" and "Add Patient")
- JSON export is a developer tool, not for doctors

---

## PART 9: Global text replacements

Do a case-insensitive search-and-replace across all .tsx, .ts files:
- "MedScribe" → "Scriva" (in all user-facing strings, comments, and metadata)
- "medscribe" → "scriva" (in alt text, aria labels, and descriptions)
- Do NOT rename file paths, folder names, CSS class names, or npm package name

Also in translation files (`src/lib/i18n/translations.ts`):
- Replace any "MedScribe" references with "Scriva"
- Replace "AI Documentation" with "Clinical AI"
- Replace "Daily Command Center" with "Today's Overview"
- Replace "Precision Workspace" with nothing (remove the key or leave empty)
- Replace "Session Readiness" / "System Health" with nothing

---

## PART 10: Button Component polish (src/components/ui/button.tsx)

Update the primary button variant to use teal:
```tsx
primary: "bg-brand-700 text-white shadow-sm hover:bg-brand-800 active:bg-brand-900 transition-all",
```

Update focus rings globally:
```tsx
"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/30 focus-visible:ring-offset-2"
```

---

## Design Principles (follow throughout)

1. **Minimal, not decorative.** Remove gradients, blurs, floating animations. Use flat colors, clean borders, subtle shadows.
2. **Teal = trust.** Primary actions are teal-700. Links are teal-600. Backgrounds tint toward teal-50.
3. **No jargon.** Every user-facing label should make sense to a 55-year-old doctor in Bucharest.
4. **White space.** More padding, less density. Let content breathe.
5. **EU-first.** 24h time, DD/MM/YYYY dates, GDPR prominent, no US-specific standards.

---

## Files to modify (summary)

| File | Changes |
|------|---------|
| `tailwind.config.ts` | Brand colors → teal, softer shadows, font-display = font-sans |
| `src/app/globals.css` | Remove radial gradients, add surface-elevated/subtle classes |
| `src/app/layout.tsx` | Inter font, metadata update, favicon |
| `src/components/layout/sidebar.tsx` | SVG logo, remove session readiness, clean sidebar |
| `src/components/layout/header.tsx` | Remove Precision Workspace badge, clean style |
| `src/app/(app)/dashboard/page.tsx` | Remove "Command Center", clean stats, 24h time |
| `src/app/(app)/admin/page.tsx` | EU standards labels |
| `src/app/auth/signin/page.tsx` | Scriva branding, teal colors, GDPR badge |
| `src/app/auth/signup/page.tsx` | Same as signin |
| `src/app/(app)/patients/page.tsx` | Remove Export JSON button |
| `src/components/ui/button.tsx` | Teal primary variant |
| `src/lib/i18n/translations.ts` | All text replacements |
| `public/favicon.svg` | Create new teal favicon |
| All .tsx files | MedScribe → Scriva text replacement |
