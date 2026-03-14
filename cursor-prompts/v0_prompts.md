# Scriva — v0.dev Prompts
# Paste each prompt separately into v0.dev (https://v0.dev)

---

## PROMPT 1: Logo & Favicon System

```
Design a complete logo system for "Scriva" — a premium European clinical AI
platform for doctors. The brand helps physicians with real-time transcription
and clinical documentation.

Create a React component that displays all logo variations:

1. PRIMARY LOGO (horizontal)
   - Logomark: A minimal, geometric icon combining a medical waveform/heartbeat
     line with a subtle pen nib or document shape. Single-path SVG, works at 16px
     and 512px. NOT a stethoscope — too generic.
   - Wordmark: "Scriva" in Inter font, 600 weight, tracking -0.02em
   - Subtitle below wordmark: "Clinical AI" in 10px uppercase, tracking 0.16em
   - Colors: logomark in white on teal (#0f766e) rounded-xl background,
     wordmark in #1a2332

2. ICON ONLY (for favicon, app icon)
   - The logomark inside a teal (#0f766e) rounded-xl square
   - Show at 32px, 64px, 128px, 512px sizes
   - Must be recognizable at 16x16px

3. WORDMARK ONLY (for header)
   - "Scriva" text with the logomark inline to the left
   - Light version (on dark background): white text + white icon
   - Dark version (on light background): #1a2332 text + teal icon

4. FAVICON VARIATIONS
   - 32x32 SVG: logomark on teal background, 8px border-radius
   - 16x16 simplified version
   - Apple touch icon: 180x180 with teal background, centered logomark

Style: European medical premium. Think Nabla, Linear, Vercel.
Clean, geometric, no gradients, no skeuomorphism.
Teal palette: primary #0f766e, light #f0fdfa, dark #042f2e.

Show all variations on a white background with labels, organized in a grid.
Include the raw SVG code for the favicon in a code block below the preview.
```

---

## PROMPT 2: Brand Guidelines Page

```
Create a comprehensive brand guidelines page for "Scriva" — a European
clinical AI platform for doctors. Single React component, scrollable,
print-ready quality.

Sections:

1. BRAND OVERVIEW
   - Logo display (use a teal waveform icon + "Scriva" wordmark)
   - Mission: "Clinical AI for European Healthcare"
   - Brand values: Trust, Clarity, Precision, Privacy

2. COLOR PALETTE
   Display as large swatches with hex codes, RGB, and usage labels:
   - Primary: #0f766e (Teal 700) — buttons, active states, logo bg
   - Primary Light: #f0fdfa (Teal 50) — backgrounds, hover states
   - Primary Medium: #0d9488 (Teal 600) — links, accents
   - Primary Dark: #115e59 (Teal 800) — pressed states
   - Text: #1a2332 — headings, body text
   - Muted: #6b7a8d — secondary text, labels
   - Background: #fafbfc — page background
   - Surface: #ffffff — cards, panels
   - Border: #e8ecf0 — dividers, card borders
   - Success: #059669 — positive states
   - Warning: #d97706 — alerts
   - Danger: #dc2626 — errors, recording indicator

   Show a DO/DON'T section: correct teal usage vs incorrect (teal on teal,
   low contrast, mixing with blue)

3. TYPOGRAPHY
   - Heading: Inter, 600 weight, tracking -0.02em, sizes: 32/24/20/16
   - Body: Inter, 400 weight, 16px/24px line-height
   - Label: Inter, 500 weight, 10-11px, uppercase, tracking 0.12-0.16em
   - Mono: JetBrains Mono, 14px (for clinical codes, IDs)
   Show sample text in each style with a medical context:
   "Patient Consultation — Dr. Ana Popescu" etc.

4. SPACING & RADIUS
   - Border radius: 8px (small), 12px (medium/buttons), 16px (cards),
     24px (panels)
   - Padding: 12px (tight), 16px (normal), 20px (comfortable), 24px (spacious)
   - Card shadow: 0 1px 2px rgba(0,0,0,0.03), 0 4px 16px rgba(0,0,0,0.03)

5. BUTTON STYLES
   Show buttons in all variants:
   - Primary: bg-[#0f766e] text-white rounded-xl px-5 py-2.5 font-medium
   - Secondary: bg-white border border-[#e8ecf0] text-[#1a2332] rounded-xl
   - Ghost: text-[#6b7a8d] hover:bg-gray-50 rounded-xl
   - Danger: bg-[#dc2626] text-white rounded-xl
   Each in default, hover, active, disabled states

6. CARD COMPONENTS
   Show 3 card types used in the app:
   - Stat card (number + label + icon)
   - Patient card (avatar + name + details)
   - Consultation card (status badge + time + patient)
   All using the teal palette, clean borders, subtle shadows

7. COMPLIANCE BADGES
   Design clean badge components for:
   - "GDPR Compliant" (with EU flag shield icon)
   - "EU Data Residency" (with EU stars)
   - "ISO 27001" (with checkmark)
   - "HL7 FHIR R4" (with interop icon)
   Style: subtle, pill-shaped, gray-50 background, small text,
   professional — not flashy

8. ICONOGRAPHY
   Use lucide-react icons throughout. Show the icon set used in the app:
   LayoutDashboard, ClipboardPlus, BrainCircuit, Users, Calendar,
   FileText, Database, Settings, Bell, Search
   All at 20px in #6b7a8d (muted) and #0f766e (active teal)

Background: white. Typography: Inter. Use Tailwind classes.
Make it look like a Figma-exported brand guide — clean, organized,
professional.
```

---

## PROMPT 3: Sign-In Page (Premium European)

```
Design a premium sign-in page for "Scriva" — a European clinical AI
platform for doctors. Domain: scriva.doctor

Layout: Centered card on a clean #fafbfc background. No split-screen,
no hero images — European professional minimalism.

Card contents (top to bottom):
1. Logo: teal waveform icon (SVG: M4 12h2l3-6 4 12 3-6h4, stroke white,
   on #0f766e rounded-xl bg) + "Scriva" text (19px, font-semibold, #1a2332)
   + "Clinical AI" subtitle (10px, uppercase, tracking wide, #0d9488)

2. Heading: "Welcome back" (24px, font-semibold, #1a2332)
   Subtext: "Sign in to your clinical workspace" (14px, #6b7a8d)

3. Google Sign-In button:
   - Full width, white bg, border #e8ecf0, rounded-xl, py-3
   - Google "G" color logo on left
   - "Continue with Google" text, font-medium, #1a2332
   - Hover: border-gray-300, subtle shadow

4. Divider: thin line with "or" centered, text #6b7a8d, 12px

5. Email input:
   - Label "Email address" (13px, font-medium, #1a2332)
   - Input: rounded-xl, border #e8ecf0, focus:border-[#0d9488]
     focus:ring-2 focus:ring-[#0d9488]/20

6. Password input:
   - Label "Password" with "Forgot password?" link (teal, 13px) aligned right
   - Input with show/hide toggle icon
   - Same focus style as email

7. Sign in button:
   - Full width, bg-[#0f766e], text-white, rounded-xl, py-3, font-semibold
   - Hover: bg-[#115e59]
   - "Sign in" text

8. Footer text: "Don't have an account? Request access"
   (14px, #6b7a8d, "Request access" as teal link)

9. Bottom of card, small muted text (11px, #6b7a8d):
   "GDPR Compliant · EU Data Residency · scriva.doctor"

Card style: white bg, border #e8ecf0, rounded-2xl, shadow-card,
max-width 420px, padding 40px

The page should feel like logging into a premium European fintech or
health platform — calm, trustworthy, minimal.
```

---

## PROMPT 4: Dashboard Layout

```
Design the main dashboard for "Scriva" — a clinical AI documentation
platform for European doctors.

Layout: Fixed sidebar (w-72) on left + scrollable main content.

SIDEBAR (already implemented — for context):
- Teal waveform logo + "Scriva" / "Clinical AI"
- Nav items with teal-50 active state
- White background, border-r

MAIN CONTENT:

1. GREETING (top)
   - "Good afternoon, Dr. Petrica Dulgheru" (28px, font-semibold, #1a2332)
   - "Your consultations and tasks for today" (14px, #6b7a8d)
   - Right side: "New Consultation" button (bg-[#0f766e], white text,
     rounded-xl, with a Plus icon)
   - No badges, no "command center", no decorative blurs. Clean.

2. STATS ROW (4 cards in a grid)
   Each card: white bg, border #e8ecf0, rounded-xl, shadow-card, p-5
   - "Today's Consultations" — number in 32px font-semibold #0f766e,
     small teal-50 icon circle
   - "Pending Reviews" — number in amber-600
   - "Notes Finalized" — number in emerald-600
   - "Needs Review" — number in rose-600
   No chevrons, no expand arrows. Clean numbers + labels.

3. TODAY'S SCHEDULE (table)
   - Section header: "Today's Schedule" (18px, font-semibold) +
     "View calendar" link (teal, 13px)
   - Table columns: TIME (24h format like 14:30), PATIENT, TYPE, STATUS, ACTION
   - Time in #6b7a8d monospace
   - Patient names: European (Ana Popescu, Klaus Weber, Sophie Martin)
   - Status badges: pill-shaped, small
     - "Scheduled" (gray-100, gray-700 text)
     - "In Progress" (teal-50, teal-700 text)
     - "Completed" (emerald-50, emerald-700 text)
   - Action: "Open" link in teal
   - Table rows: hover:bg-gray-50, clean borders

4. RECENT NOTES (below schedule)
   - Section header: "Recent Clinical Notes" + "View all" link
   - 3 cards showing recent consultations with:
     - Patient name + visit type
     - Template used (SOAP Note, Referral, etc.)
     - Time ago ("2 hours ago")
     - Status badge
   - Cards: white, border, rounded-xl, p-4, hover:shadow-md transition

Style: Clean white background (#fafbfc). No gradients. No glass effects.
No blur backgrounds. Premium European SaaS aesthetic — think Linear,
Notion, or Vercel dashboard. Inter font throughout.
Teal (#0f766e) for primary actions only. Everything else is neutral.
```

---

## PROMPT 5: Recording Page (Doctor-Facing)

```
Design the consultation recording interface for "Scriva" — the screen
a doctor sees when recording a patient consultation.

This must be DEAD SIMPLE. A doctor with a patient sitting across the desk
needs to start recording in 2 seconds. No cognitive load.

Layout: Full width, no sidebar visible during recording.

PRE-RECORDING STATE:
- Top: "Scriva" small logo + patient name + visit type
- Center: Large circular "Start" button (120px diameter, bg-[#0f766e],
  white microphone icon, text "Start Recording" below)
- Below button: "Language: English" dropdown (small, subtle)
- Below that: consent checkbox with text:
  "Patient consents to audio recording for clinical documentation"
- Bottom: collapsible "Settings" section (closed by default) with:
  template selector, consultation mode toggle
- Overall feel: calm, focused, minimal. Like pressing record on a
  professional voice recorder.

RECORDING STATE:
- Background shifts to very subtle teal tint (#f0fdfa)
- Top bar: green pulsing dot + "Recording" + duration timer (00:04:32)
  in monospace + patient name
- Center: Clean audio waveform visualizer (teal colored, subtle animation)
- Below waveform: Live transcript scrolling area
  - Each segment shows "Doctor:" or "Patient:" label + text
  - Auto-scrolls to bottom
  - Clean typography, good line spacing
- Bottom bar:
  - Pause button (outline, gray)
  - Stop button (red, prominent)
  - Connection status: small "Live" badge with green dot (or yellow
    "Buffering" if connection issues)

POST-RECORDING STATE:
- Summary card: "Recording complete" with checkmark
  - Duration: 12:34
  - Words transcribed: 2,847
  - Speakers detected: 2
- Full transcript (editable textarea, clean border, good typography)
- Template selector dropdown
- "Generate Clinical Note" button (large, bg-[#0f766e], full width)
- "Save & Generate Later" secondary button below

Colors: #0f766e teal for primary actions, #dc2626 for stop/recording
indicator, #fafbfc background, white cards.
Font: Inter. Minimal UI — every pixel must earn its place.
```

---

## PROMPT 6: Email Template + Compliance Footer

```
Design an HTML email template for "Scriva" transactional emails
(welcome, password reset, consultation summary).

Requirements:
- Max width 560px, centered
- Header: Scriva logo (teal waveform + wordmark), clean divider
- Body: Clean typography, Inter-like system font stack
  (font-family: Inter, -apple-system, BlinkMacSystemFont, sans-serif)
- Primary CTA button: bg-[#0f766e], white text, rounded-lg,
  px-8 py-3, centered
- Footer:
  - "Scriva — Clinical AI for European Healthcare"
  - "scriva.doctor"
  - Compliance line: "GDPR Compliant · EU Data Residency ·
    Your data is processed within the European Union"
  - Unsubscribe link
  - Company address (placeholder)
  - EU flag small icon + "European Healthcare Technology"

Show 3 variations:
1. Welcome email ("Welcome to Scriva, Dr. [Name]")
2. Password reset ("Reset your password")
3. Consultation summary ("Your consultation note is ready")

Style: Professional, minimal, trustworthy. Like receiving an email
from a Swiss bank or premium European SaaS.
```

---

## HOW TO USE THESE

1. Go to https://v0.dev
2. Paste each prompt one at a time
3. v0 generates React/Tailwind code
4. For the LOGO (Prompt 1): Export the SVG code and save as:
   - `public/favicon.svg` (32x32 version)
   - `public/apple-touch-icon.png` (render the 180x180 version)
   - Update sidebar.tsx with the refined logomark SVG
5. For the BRAND GUIDE (Prompt 2): Export as a standalone HTML page,
   save as `docs/brand-guide.html` for your team
6. For SIGN-IN (Prompt 3): Copy the component code into
   `src/app/auth/signin/page.tsx`
7. For DASHBOARD (Prompt 4): Use as reference to refine
   `src/app/(app)/dashboard/page.tsx`
8. For RECORDING (Prompt 5): Use as reference to refine
   `src/app/(app)/consultation/[id]/record/page.tsx`
9. For EMAILS (Prompt 6): Save templates in `src/lib/email/templates/`
