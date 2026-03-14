"use client";

import dynamic from "next/dynamic";

// ─── Fix React Error #310 ────────────────────────────────────────────
// The record page uses 100+ hooks, WebSocket, MediaRecorder, AudioContext,
// and IndexedDB — all browser-only APIs. SSR-ing this component causes
// React hydration mismatches between Next.js's internal server-React
// (next/dist/compiled/react) and the client React, triggering Error #310.
//
// Loading it with ssr:false ensures it only ever renders on the client,
// where a single React instance is in play.
const RecordPageClient = dynamic(
  () => import("./RecordPageClient"),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <svg
            className="h-8 w-8 animate-spin text-teal-600"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
          <p className="text-sm text-gray-500">Loading consultation...</p>
        </div>
      </div>
    ),
  }
);

export default function RecordPage() {
  return <RecordPageClient />;
}
