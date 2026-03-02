"use client";

import { useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const INACTIVITY_TIMEOUT = 8 * 60 * 60 * 1000; // 8 hours — session persists across work shift
const ACTIVITY_EVENTS = ["mousedown", "keydown", "touchstart", "scroll"] as const;

export function useSessionTimeout() {
  const router = useRouter();
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleTimeout = useCallback(async () => {
    // Sign out and clear all sensitive data
    const supabase = createClient();
    await supabase.auth.signOut();

    // Redirect to sign-in with timeout message
    router.push("/auth/signin?reason=timeout");
  }, [router]);

  const resetTimer = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(handleTimeout, INACTIVITY_TIMEOUT);
  }, [handleTimeout]);

  useEffect(() => {
    // Set initial timer
    resetTimer();

    // Reset on user activity
    const handlers = ACTIVITY_EVENTS.map((event) => {
      const handler = () => resetTimer();
      window.addEventListener(event, handler, { passive: true });
      return { event, handler };
    });

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      handlers.forEach(({ event, handler }) =>
        window.removeEventListener(event, handler)
      );
    };
  }, [resetTimer]);
}
