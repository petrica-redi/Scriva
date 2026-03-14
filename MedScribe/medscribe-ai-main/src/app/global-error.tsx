"use client";

import * as Sentry from "@sentry/nextjs";
import NextError from "next/error";
import { useEffect } from "react";

const RELOAD_KEY = "scriva_reload_attempt";
const RELOAD_MAX = 2;

/** Auto-reload on stale-chunk / hooks-mismatch errors that happen after a new deployment. */
function tryAutoRecover(error: Error) {
  const isStaleBundle =
    // React hooks count mismatch (old + new bundle loaded simultaneously)
    error.message?.includes("Minified React error #310") ||
    error.message?.includes("more hooks than during") ||
    error.message?.includes("less hooks than during") ||
    // Webpack chunk load failure
    error.message?.includes("Loading chunk") ||
    error.message?.includes("ChunkLoadError");

  if (!isStaleBundle) return false;

  try {
    const attempts = parseInt(sessionStorage.getItem(RELOAD_KEY) ?? "0", 10);
    if (attempts >= RELOAD_MAX) return false; // Already tried, stop looping
    sessionStorage.setItem(RELOAD_KEY, String(attempts + 1));
    window.location.reload();
    return true;
  } catch {
    return false;
  }
}

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  useEffect(() => {
    if (tryAutoRecover(error)) return; // Will reload — no need to show error
    Sentry.captureException(error);
  }, [error]);

  return (
    <html>
      <body>
        <NextError statusCode={0} />
      </body>
    </html>
  );
}
