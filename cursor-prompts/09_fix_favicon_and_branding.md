# Fix Favicon 404 + Integrate Scriva Branding into Platform

**Model: Sonnet 4** (build task)

## Part A — Fix Favicon 404

### Problem
Browser always requests `/favicon.ico` regardless of HTML metadata. The app only has `/public/favicon.svg`. Console shows: `Failed to load resource: the server responded with a status of 404 () - /favicon.ico:1`

### Fix

Create a Next.js App Router icon file that generates the favicon from the Scriva logo mark:

**Create `src/app/icon.tsx`:**

```tsx
import { ImageResponse } from 'next/og';

export const size = { width: 32, height: 32 };
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 32,
          height: 32,
          background: '#0f766e',
          borderRadius: 7,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
        }}
      >
        {/* Simplified mark — "S" letterform at small sizes */}
        <div style={{ color: 'white', fontSize: 20, fontWeight: 800, fontFamily: 'Inter, sans-serif' }}>
          S
        </div>
      </div>
    ),
    { ...size }
  );
}
```

**Also create `src/app/apple-icon.tsx`** for Apple devices:

```tsx
import { ImageResponse } from 'next/og';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 180,
          height: 180,
          background: '#0f766e',
          borderRadius: 40,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div style={{ color: 'white', fontSize: 110, fontWeight: 800, fontFamily: 'Inter, sans-serif' }}>
          S
        </div>
      </div>
    ),
    { ...size }
  );
}
```

**Update `src/app/layout.tsx` metadata** — remove the manual icon config since App Router auto-discovers icon.tsx:

```typescript
// Remove this from metadata:
icons: {
  icon: "/favicon.svg",
},
```

Keep `/public/favicon.svg` as a fallback but the icon.tsx approach handles all formats including favicon.ico requests.

---

## Part B — Integrate Scriva Branding into Platform

Apply the Scriva brand system (teal palette, Inter font, new logo mark, European voice) across all pages.

### B1. Replace logo mark everywhere

The old logo was a waveform SVG (`M4 12h2l3-6 4 12 3-6h4`). Replace it with the new triad icon (document + microphone + stethoscope disc).

**Create `src/components/ui/ScrivaLogo.tsx`:**

```tsx
interface ScrivaLogoProps {
  size?: number;
  variant?: 'light' | 'dark';
  className?: string;
}

export function ScrivaLogo({ size = 32, variant = 'light', className }: ScrivaLogoProps) {
  const bg = variant === 'light' ? '#0f766e' : '#14b8a6';
  const fg = variant === 'light' ? '#fff' : '#042f2e';
  const fgMuted = variant === 'light' ? 'rgba(13,148,136,0.5)' : 'rgba(13,148,136,0.4)';
  const fgSub = variant === 'light' ? 'rgba(255,255,255,0.7)' : 'rgba(4,47,46,0.6)';

  return (
    <svg width={size} height={size} viewBox="0 0 72 72" fill="none" className={className}>
      <rect x="4" y="4" width="64" height="64" rx="16" fill={bg} />
      {/* Document */}
      <rect x="12" y="18" width="22" height="28" rx="3" fill={fg} opacity="0.95" />
      <line x1="16" y1="26" x2="30" y2="26" stroke={fgMuted} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="16" y1="30" x2="27" y2="30" stroke={fgMuted} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="16" y1="34" x2="24" y2="34" stroke={fgMuted} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="16" y1="38" x2="28" y2="38" stroke={fgMuted} strokeWidth="1.5" strokeLinecap="round" />
      {/* Microphone */}
      <rect x="42" y="14" width="12" height="18" rx="6" fill={fg} opacity="0.95" />
      <path d="M42 27 Q42 35 48 35 Q54 35 54 27" stroke={fg} strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.7" />
      <line x1="48" y1="35" x2="48" y2="40" stroke={fg} strokeWidth="2" strokeLinecap="round" opacity="0.7" />
      <line x1="44" y1="40" x2="52" y2="40" stroke={fg} strokeWidth="2" strokeLinecap="round" opacity="0.7" />
      {/* Stethoscope disc */}
      <circle cx="48" cy="54" r="9" fill={fg} opacity="0.95" />
      <circle cx="48" cy="54" r="5.5" fill={bg} />
      <circle cx="48" cy="54" r="2.5" fill={fg} opacity="0.8" />
    </svg>
  );
}
```

### B2. Update sidebar

In `src/components/layout/sidebar.tsx`:
- Replace the inline waveform SVG with `<ScrivaLogo size={32} />`
- Keep the text "Scriva" and subtitle "Clinical AI"

### B3. Update header

In `src/components/layout/header.tsx`:
- If the logo appears in the header, replace with `<ScrivaLogo size={28} />`

### B4. Update sign-in page

In `src/app/auth/signin/page.tsx`:
- Replace any old logo with `<ScrivaLogo size={48} />`
- Ensure page uses the Scriva teal palette
- Add "Clinical AI" tagline below the logo

### B5. Update the recording page

In `src/app/(app)/consultation/[id]/record/page.tsx`:
- Ensure the Scriva brand colors are used (teal-700 for primary actions)
- The "Stop Recording" button should use red (danger color)
- Ensure the overall layout feels clean and uncluttered

### B6. Update favicon.svg with new mark

Replace `public/favicon.svg` content with the triad icon:

```svg
<svg width="32" height="32" viewBox="0 0 72 72" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect x="4" y="4" width="64" height="64" rx="16" fill="#0f766e"/>
  <rect x="12" y="18" width="22" height="28" rx="3" fill="#fff" opacity="0.95"/>
  <line x1="16" y1="26" x2="30" y2="26" stroke="#0d9488" stroke-width="1.5" stroke-linecap="round" opacity="0.5"/>
  <line x1="16" y1="30" x2="27" y2="30" stroke="#0d9488" stroke-width="1.5" stroke-linecap="round" opacity="0.5"/>
  <line x1="16" y1="34" x2="24" y2="34" stroke="#0d9488" stroke-width="1.5" stroke-linecap="round" opacity="0.5"/>
  <line x1="16" y1="38" x2="28" y2="38" stroke="#0d9488" stroke-width="1.5" stroke-linecap="round" opacity="0.5"/>
  <rect x="42" y="14" width="12" height="18" rx="6" fill="#fff" opacity="0.95"/>
  <path d="M42 27 Q42 35 48 35 Q54 35 54 27" stroke="#fff" stroke-width="2" stroke-linecap="round" fill="none" opacity="0.7"/>
  <line x1="48" y1="35" x2="48" y2="40" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity="0.7"/>
  <line x1="44" y1="40" x2="52" y2="40" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity="0.7"/>
  <circle cx="48" cy="54" r="9" fill="#fff" opacity="0.95"/>
  <circle cx="48" cy="54" r="5.5" fill="#0f766e"/>
  <circle cx="48" cy="54" r="2.5" fill="#fff" opacity="0.8"/>
</svg>
```

## Acceptance Criteria

- [ ] No 404 for `/favicon.ico` in console
- [ ] Favicon shows the Scriva "S" in teal rounded square
- [ ] Apple touch icon works on iOS
- [ ] New triad logo (doc + mic + stethoscope) visible in sidebar, header, sign-in page
- [ ] `ScrivaLogo` component created and reusable
- [ ] All references to old waveform SVG are removed
- [ ] `npm run build` succeeds
