import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

/**
 * OAuth callback (e.g. Google sign-in).
 * Supabase redirects here with ?code=... after provider auth.
 * Exchange code for session and redirect to dashboard (or ?next= path).
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";
  const errorParam = searchParams.get("error_description") ?? searchParams.get("error");

  if (errorParam) {
    return NextResponse.redirect(
      new URL(`/auth/signin?error=${encodeURIComponent(errorParam)}`, request.url)
    );
  }

  if (!code) {
    return NextResponse.redirect(
      new URL("/auth/signin?error=invalid_callback", request.url)
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(
      new URL(`/auth/signin?error=${encodeURIComponent(error.message)}`, request.url)
    );
  }

  // Only allow relative same-origin redirects to prevent open-redirect attacks.
  // Reject anything that isn't a root-relative path, or points back into /auth.
  const safePath =
    next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/auth")
      ? next
      : "/dashboard";

  return NextResponse.redirect(new URL(safePath, request.url));
}
