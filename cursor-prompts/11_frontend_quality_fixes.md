# Frontend Quality & Stability Fixes

**Model: Sonnet 4** (build task)

## Context

A frontend audit found several issues that cause runtime errors, memory leaks, and poor UX in edge cases. These fixes improve stability and accessibility.

---

## Fix 1 — Add Error Boundary to App Layout (CRITICAL)

### Problem
`src/app/(app)/layout.tsx` has no Error Boundary. Any unhandled error in the app shell crashes the entire page with a white screen.

### Fix

**Create `src/components/ErrorBoundary.tsx`:**

```tsx
"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Send to Sentry if available
    if (typeof window !== "undefined" && (window as any).__SENTRY__) {
      import("@sentry/nextjs").then((Sentry) => {
        Sentry.captureException(error, { extra: { componentStack: errorInfo.componentStack } });
      });
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="flex min-h-screen items-center justify-center bg-medical-bg p-8">
            <div className="max-w-md text-center space-y-4">
              <h2 className="text-xl font-semibold text-medical-text">Something went wrong</h2>
              <p className="text-medical-muted">
                An unexpected error occurred. Please refresh the page or contact support if the issue persists.
              </p>
              <button
                onClick={() => this.setState({ hasError: false })}
                className="px-4 py-2 bg-teal-700 text-white rounded-lg hover:bg-teal-800 transition"
              >
                Try again
              </button>
            </div>
          </div>
        )
      );
    }

    return this.props.children;
  }
}
```

**Wrap the app layout:**

```tsx
// src/app/(app)/layout.tsx
import { ErrorBoundary } from "@/components/ErrorBoundary";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary>
      {/* existing layout content */}
    </ErrorBoundary>
  );
}
```

---

## Fix 2 — localStorage SSR Guard in I18nProvider (HIGH)

### Problem
`src/lib/i18n/context.tsx` accesses `localStorage` during initial render. This throws during SSR/prerendering.

### Fix
Guard localStorage access behind a `typeof window` check:

```typescript
// In the I18nProvider, wherever localStorage is accessed:
const getStoredLocale = (): string => {
  if (typeof window === "undefined") return "en";
  try {
    return localStorage.getItem("scriva-locale") || "en";
  } catch {
    return "en";
  }
};
```

Apply this pattern to every `localStorage.getItem` and `localStorage.setItem` call in the file.

---

## Fix 3 — setTimeout Leak in useNetworkStatus (HIGH)

### Problem
`src/components/ui/NetworkStatusBanner.tsx` (or `useNetworkStatus` hook) uses `setTimeout` to debounce network status changes but doesn't clear the timeout on unmount.

### Fix

```typescript
useEffect(() => {
  let timeoutId: ReturnType<typeof setTimeout>;

  const handleOnline = () => {
    timeoutId = setTimeout(() => setIsOnline(true), 1000);
  };
  const handleOffline = () => {
    setIsOnline(false);
  };

  window.addEventListener("online", handleOnline);
  window.addEventListener("offline", handleOffline);

  return () => {
    clearTimeout(timeoutId);
    window.removeEventListener("online", handleOnline);
    window.removeEventListener("offline", handleOffline);
  };
}, []);
```

---

## Fix 4 — Null Checks in AIAssistantPanel (HIGH)

### Problem
`src/components/consultation/AIAssistantPanel.tsx` accesses properties on potentially null/undefined objects from API responses without guards.

### Fix
Add optional chaining and fallbacks:

```typescript
// Before:
const suggestions = response.data.suggestions;

// After:
const suggestions = response?.data?.suggestions ?? [];
```

Audit every property access on API response data in this file and add `?.` chains.

---

## Fix 5 — AudioContext Close Error (MEDIUM)

### Problem
`src/hooks/useAudioRecorder.ts` calls `audioContext.close()` but doesn't catch the error if the context is already closed.

### Fix

```typescript
// Wrap close in try-catch
const stopRecording = async () => {
  try {
    if (audioContextRef.current?.state !== "closed") {
      await audioContextRef.current?.close();
    }
  } catch (err) {
    console.warn("AudioContext already closed:", err);
  }
  // ... rest of cleanup
};
```

---

## Fix 6 — Polling Interval Memory Leak (MEDIUM)

### Problem
Some components use `setInterval` for polling (e.g., consultation status, waiting room updates) but don't clear the interval on unmount in all code paths.

### Fix
Search the codebase for `setInterval` and ensure every one has a corresponding cleanup:

```typescript
useEffect(() => {
  const intervalId = setInterval(() => {
    // polling logic
  }, 30_000);

  return () => clearInterval(intervalId);
}, [/* deps */]);
```

---

## Fix 7 — Remove console.error in Production (MEDIUM)

### Problem
Several files use `console.error` and `console.log` directly. These leak information in production.

### Fix
Create a logger utility:

```typescript
// src/lib/logger.ts
const isDev = process.env.NODE_ENV !== "production";

export const logger = {
  error: (...args: unknown[]) => {
    if (isDev) console.error(...args);
    // In production, errors go to Sentry (already configured)
  },
  warn: (...args: unknown[]) => {
    if (isDev) console.warn(...args);
  },
  info: (...args: unknown[]) => {
    if (isDev) console.info(...args);
  },
};
```

Replace direct `console.error` / `console.log` calls in key files:
- `src/hooks/useAudioRecorder.ts`
- `src/hooks/useAudioBackup.ts`
- `src/lib/ai/*.ts`
- `src/app/api/**/*.ts`

---

## Fix 8 — Accessibility Improvements (MEDIUM)

Add missing ARIA attributes and keyboard navigation:

1. **Sidebar navigation**: Add `role="navigation"` and `aria-label="Main navigation"`
2. **Recording controls**: Add `aria-label` to icon-only buttons (record, stop, pause)
3. **Modal dialogs**: Ensure focus trapping and `role="dialog"` with `aria-modal="true"`
4. **Status indicators**: Add `role="status"` and `aria-live="polite"` to the network status banner and recording timer

---

## Acceptance Criteria

- [ ] Error Boundary catches rendering errors and shows recovery UI
- [ ] No SSR errors from localStorage access
- [ ] No setTimeout/setInterval memory leaks
- [ ] AIAssistantPanel handles null API responses gracefully
- [ ] AudioContext cleanup doesn't throw
- [ ] No console.error/log calls in production bundle
- [ ] Key interactive elements have proper ARIA labels
- [ ] `npm run build` succeeds
