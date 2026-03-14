# Fix React Error #310 — Invalid Hook Call

**Model: Sonnet 4** (build task) → then **Opus 4.6** to review

## Context

Production console shows: `Error: Minified React error #310` with a stack trace pointing to `useRef`. Error 310 = "Invalid hook call" — hooks called outside a function component, or duplicate React copies in the bundle.

The stack shows `Object.aA [as useRef]` → `t.useRef` which indicates a **library** is calling `useRef` from its own bundled React copy, conflicting with the app's React 19.

## Root Cause Analysis

Most likely culprits in order of probability:

1. **`@tiptap/react@2.10.0`** — TipTap's ProseMirror integration uses `useRef` internally and may bundle its own React copy when not properly deduped with React 19.
2. **`@sentry/nextjs@10.41.0`** — Sentry's Next.js wrapper instruments React and could conflict.
3. **`framer-motion@11.11.0`** — Uses internal refs heavily.

## Fix Steps

### Step 1: Force React deduplication in next.config.ts

Add a webpack alias to ensure ALL libraries resolve to the same React instance:

```typescript
// In next.config.ts, inside the nextConfig object, add:
webpack: (config) => {
  // Prevent duplicate React instances from libraries
  config.resolve.alias = {
    ...config.resolve.alias,
    react: require.resolve('react'),
    'react-dom': require.resolve('react-dom'),
  };
  return config;
},
```

### Step 2: Check for duplicate React in lockfile

Run:
```bash
npm ls react
npm ls react-dom
```

If you see more than one version listed, run:
```bash
npm dedupe
```

### Step 3: Pin TipTap to React 19-compatible version

Check if TipTap has a React 19 compatible release. If the error persists after Step 1, try:

```bash
npm install @tiptap/react@latest @tiptap/starter-kit@latest @tiptap/extension-placeholder@latest
```

If TipTap still causes issues, lazy-load TipTap components so they don't break pages that don't use them:

In any file that imports TipTap, wrap with dynamic import:
```typescript
import dynamic from 'next/dynamic';

const AIAssistantPanel = dynamic(
  () => import('@/components/consultation/AIAssistantPanel').then(mod => ({ default: mod.AIAssistantPanel })),
  { ssr: false }
);
```

### Step 4: Verify the fix

```bash
npm run build
npm run start
```

Open the recording page in Chrome, check the console. Error #310 should be gone.

## Files to modify

- `next.config.ts` — add webpack alias
- `package.json` / `package-lock.json` — dedupe or update TipTap
- Optionally: any page importing TipTap components (lazy-load them)

## Acceptance Criteria

- [ ] `npm run build` succeeds without errors
- [ ] No React Error #310 in production console
- [ ] Recording page loads without errors
- [ ] TipTap editor still works on the note page
