"use client";

import { useEffect, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: Record<string, unknown>) => void;
          renderButton: (
            element: HTMLElement,
            config: Record<string, unknown>,
          ) => void;
          prompt: () => void;
        };
      };
    };
  }
}

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "";

interface UseGoogleSignInOptions {
  onError?: (msg: string) => void;
  onLoading?: (loading: boolean) => void;
}

export function useGoogleSignIn({
  onError,
  onLoading,
}: UseGoogleSignInOptions = {}) {
  const router = useRouter();
  const buttonRef = useRef<HTMLDivElement>(null);
  const scriptLoadedRef = useRef(false);
  const buttonRenderedRef = useRef(false);
  // Keep a stable ref so GIS always calls the latest handler (avoids stale closure)
  const callbackRef = useRef<(response: { credential: string }) => Promise<void>>(
    async () => undefined,
  );

  const handleCredentialResponse = useCallback(
    async (response: { credential: string }) => {
      onLoading?.(true);
      onError?.("");

      const supabase = createClient();
      const { error } = await supabase.auth.signInWithIdToken({
        provider: "google",
        token: response.credential,
      });

      if (error) {
        onError?.(error.message);
        onLoading?.(false);
        return;
      }

      router.push("/dashboard");
      router.refresh();
    },
    [router, onError, onLoading],
  );

  // Keep callbackRef current so GIS always calls the latest version
  useEffect(() => {
    callbackRef.current = handleCredentialResponse;
  }, [handleCredentialResponse]);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;

    function initAndRender() {
      if (!window.google?.accounts?.id || !buttonRef.current) return;

      // Always re-initialize so the callback is fresh
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        // Stable wrapper so GIS always calls the current closure
        callback: (response: { credential: string }) => callbackRef.current(response),
        ux_mode: "popup",
      });

      if (!buttonRenderedRef.current) {
        buttonRenderedRef.current = true;
        // Use a fixed width of 400 as fallback; GIS will cap at container width anyway
        const width = buttonRef.current.offsetWidth || 400;

        window.google.accounts.id.renderButton(buttonRef.current, {
          theme: "outline",
          size: "large",
          width,
          text: "continue_with",
          shape: "rectangular",
          logo_alignment: "left",
        });
      }
    }

    if (window.google?.accounts?.id) {
      initAndRender();
      return;
    }

    if (scriptLoadedRef.current) {
      // Script is loading — poll until ready
      const interval = setInterval(() => {
        if (window.google?.accounts?.id) {
          clearInterval(interval);
          initAndRender();
        }
      }, 100);
      return () => clearInterval(interval);
    }

    scriptLoadedRef.current = true;
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = initAndRender;
    document.head.appendChild(script);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once — callbackRef stays current via the effect above

  return { buttonRef };
}
