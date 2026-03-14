import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * The internal header name used to pass the verified admin role from middleware
 * to route handlers.  Middleware always strips any client-supplied value of this
 * header before the route handler runs, so handlers can safely trust it.
 */
export const ROLE_HEADER = "x-scriva-role";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh session — also important for Server Components
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isApiRoute    = pathname.startsWith("/api/");
  const isAuthPage    = pathname.startsWith("/auth");
  const isPublicPage  =
    pathname.startsWith("/book") ||
    pathname.startsWith("/privacy") ||
    pathname.startsWith("/terms") ||
    pathname.startsWith("/waiting-room") ||
    pathname.startsWith("/api/clinics") ||
    pathname.startsWith("/api/bookings") ||
    pathname.startsWith("/api/waiting-room") ||
    pathname.startsWith("/api/health") ||
    pathname.startsWith("/intake") ||
    pathname.startsWith("/api/intake/responses") ||
    pathname === "/rootCA.pem";

  // ── Unauthenticated ────────────────────────────────────────────────────────
  if (!user && !isAuthPage && !isPublicPage) {
    if (isApiRoute) {
      // API callers must receive JSON, not an HTML redirect page
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const url = request.nextUrl.clone();
    url.pathname = "/auth/signin";
    return NextResponse.redirect(url);
  }

  // ── Authenticated user on an auth page → go to dashboard ──────────────────
  if (user && isAuthPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  // ── Admin guard ────────────────────────────────────────────────────────────
  // Covers both the admin panel page (/admin/*) and admin API routes (/api/admin/*).
  //
  // Security note: we always strip any client-supplied x-scriva-role header
  // BEFORE the check, then inject it only after a successful DB verification.
  // This prevents spoofing: a client cannot pass "x-scriva-role: admin" and
  // bypass the DB check because middleware removes it unconditionally first.
  const isAdminPage = pathname.startsWith("/admin");
  const isAdminApi  = pathname.startsWith("/api/admin");

  if (user && (isAdminPage || isAdminApi)) {
    const { data: profile } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    const isAdmin = profile?.role === "admin";

    if (!isAdmin) {
      if (isAdminApi) {
        return NextResponse.json(
          { error: "Forbidden: admin role required" },
          { status: 403 }
        );
      }
      // Page route: send the user somewhere safe with a flash parameter
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      url.searchParams.set("notice", "admin_required");
      return NextResponse.redirect(url);
    }

    // Admin verified — build a new request that strips any client-supplied role
    // header and replaces it with our trusted value.  Route handlers can read
    // this header with request.headers.get(ROLE_HEADER) and skip their own DB
    // role check entirely.
    const forwardedHeaders = new Headers(request.headers);
    forwardedHeaders.delete(ROLE_HEADER);      // strip client value
    forwardedHeaders.set(ROLE_HEADER, "admin"); // set verified value

    const adminResponse = NextResponse.next({
      request: { headers: forwardedHeaders },
    });

    // Copy any auth cookies the Supabase client may have refreshed onto the
    // new response so the browser session stays in sync.
    supabaseResponse.cookies.getAll().forEach(({ name, value, ...opts }) => {
      adminResponse.cookies.set(name, value, opts as Parameters<typeof adminResponse.cookies.set>[2]);
    });

    return adminResponse;
  }

  return supabaseResponse;
}
