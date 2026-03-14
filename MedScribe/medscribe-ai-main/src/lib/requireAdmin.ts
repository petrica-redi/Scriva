import { ROLE_HEADER } from "@/lib/supabase/middleware";

/**
 * Guard for admin-only API route handlers.
 *
 * The middleware in src/lib/supabase/middleware.ts already verifies the
 * caller's role against the database and injects `x-medscribe-role: admin`
 * into the forwarded request before the handler ever runs.  It also strips
 * any client-supplied value of that header, so trusting it here is safe.
 *
 * Usage:
 *   const denied = requireAdmin(request);
 *   if (denied) return denied;
 *   // ... rest of handler
 *
 * Returns a Response (401 or 403) when the caller is not an admin, or
 * `null` when access is allowed.
 */
export function requireAdmin(request: Request): Response | null {
  const role = request.headers.get(ROLE_HEADER);

  if (!role) {
    // The middleware should have returned 401 before reaching here for
    // unauthenticated callers.  This branch is a belt-and-suspenders guard
    // for direct (non-middleware) invocations such as unit tests.
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (role !== "admin") {
    return Response.json({ error: "Forbidden: admin role required" }, { status: 403 });
  }

  return null;
}
