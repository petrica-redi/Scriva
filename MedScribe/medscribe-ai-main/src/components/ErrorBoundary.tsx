"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";

const RELOAD_KEY = "scriva_eb_reload";
const RELOAD_MAX = 2;

function isStaleBundleError(error: Error): boolean {
  const msg = error.message ?? "";
  return (
    msg.includes("Minified React error #310") ||
    msg.includes("more hooks than during") ||
    msg.includes("less hooks than during") ||
    msg.includes("Minified React error #423") ||
    msg.includes("Minified React error #418") ||
    msg.includes("Loading chunk") ||
    msg.includes("ChunkLoadError") ||
    msg.includes("Failed to fetch dynamically imported module")
  );
}

function tryAutoRecover(): boolean {
  try {
    const attempts = parseInt(sessionStorage.getItem(RELOAD_KEY) ?? "0", 10);
    if (attempts >= RELOAD_MAX) return false;
    sessionStorage.setItem(RELOAD_KEY, String(attempts + 1));
    const url = new URL(window.location.href);
    url.searchParams.set("_v", Date.now().toString());
    window.location.replace(url.toString());
    return true;
  } catch {
    return false;
  }
}

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
    if (isStaleBundleError(error) && tryAutoRecover()) {
      return; // page is reloading with cache-busting param
    }

    if (typeof window !== "undefined") {
      import("@sentry/nextjs")
        .then((Sentry) => {
          Sentry.captureException(error, {
            extra: { componentStack: errorInfo.componentStack },
          });
        })
        .catch(() => {});
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="flex min-h-screen items-center justify-center bg-gray-50 p-8">
            <div className="max-w-md text-center space-y-4">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                <svg
                  className="h-6 w-6 text-red-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
                  />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-900">
                Something went wrong
              </h2>
              <p className="text-sm text-gray-600">
                A new version of Scriva is available. Please refresh your
                browser to continue.
              </p>
              <button
                onClick={() => {
                  try { sessionStorage.removeItem(RELOAD_KEY); } catch {}
                  this.setState({ hasError: false, error: undefined });
                  const url = new URL(window.location.href);
                  url.searchParams.set("_v", Date.now().toString());
                  window.location.replace(url.toString());
                }}
                className="inline-flex items-center gap-2 rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-teal-800"
              >
                Refresh page
              </button>
            </div>
          </div>
        )
      );
    }

    return this.props.children;
  }
}
