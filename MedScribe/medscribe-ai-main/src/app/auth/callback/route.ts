import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

/**
 * OAuth callback — Google (and any future providers).
 * Supabase redirects here with ?code=... after the user completes OAuth.
 * Works for BOTH sign-in and new user registration (Supabase handles both).
 */
export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next") ?? "/dashboard";
  const errorParam =
    requestUrl.searchParams.get("error_description") ??
    requestUrl.searchParams.get("error");

  // Provider returned an error (e.g. user cancelled)
  if (errorParam) {
    const msg = errorParam.includes("access_denied")
      ? "Sign-in was cancelled."
      : decodeURIComponent(errorParam);
    return NextResponse.redirect(
      new URL(`/auth/signin?error=${encodeURIComponent(msg)}`, requestUrl.origin)
    );
  }

  if (!code) {
    return NextResponse.redirect(
      new URL("/auth/signin?error=missing_code", requestUrl.origin)
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error("[auth/callback] exchangeCodeForSession error:", error.message);
    return NextResponse.redirect(
      new URL(
        `/auth/signin?error=${encodeURIComponent("Google sign-in failed — please try again.")}`,
        requestUrl.origin
      )
    );
  }

  // Prevent open-redirect attacks: only allow same-origin paths, exclude /auth
  const safePath =
    next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/auth")
      ? next
      : "/dashboard";

  return NextResponse.redirect(new URL(safePath, requestUrl.origin));
}
