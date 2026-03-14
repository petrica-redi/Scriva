# Critical Security Fixes — API & Data Layer

**Model: Sonnet 4** (build task)

## Context

A security audit of the Scriva platform found several critical and high-severity issues in API routes and data access patterns. These must be fixed before any public deployment.

---

## Fix 1 — Deepgram API Key Exposure (CRITICAL)

### Problem
`src/app/api/deepgram/stream-key/route.ts` has a fallback that returns `process.env.DEEPGRAM_API_KEY` directly to the client if `createProjectKey()` fails. This exposes the master API key.

### Fix
Remove the fallback. If temporary key creation fails, return an error to the client — never expose the master key.

```typescript
// REMOVE any fallback like:
// return NextResponse.json({ key: process.env.DEEPGRAM_API_KEY });

// REPLACE with:
return NextResponse.json(
  { error: "Failed to create streaming session. Please try again." },
  { status: 503 }
);
```

Also add authentication check at the top of this route — only logged-in users should request STT keys:

```typescript
import { createServerClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  // ... rest of key creation
}
```

---

## Fix 2 — Unauthenticated Routes (HIGH)

### Problem
`/api/waiting-room` and `/api/booking` routes accept requests without verifying the user session.

### Fix
Add auth guard to both routes. Example for waiting-room:

```typescript
// src/app/api/waiting-room/route.ts
import { createServerClient } from "@/lib/supabase/server";

export async function GET(req: Request) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  // ... existing logic, but scope queries to user's org
}
```

Apply the same pattern to all methods (GET, POST, PATCH, DELETE) in:
- `src/app/api/waiting-room/route.ts`
- `src/app/api/booking/route.ts`
- `src/app/api/booking/[id]/route.ts`

---

## Fix 3 — SQL Injection in Search (CRITICAL)

### Problem
`src/app/api/patients/route.ts` (or similar search route) passes user input directly into a `.textSearch()` call without sanitization. Supabase's `textSearch` can be exploited with crafted tsquery syntax.

### Fix
Sanitize search input before passing to textSearch:

```typescript
function sanitizeSearchQuery(query: string): string {
  // Remove tsquery special characters
  return query
    .replace(/[&|!():*<>'"\\]/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .join(" & ");
}

// Usage:
const sanitized = sanitizeSearchQuery(searchQuery);
if (!sanitized) {
  return NextResponse.json({ data: [] });
}
const { data } = await supabase
  .from("patients")
  .select("*")
  .textSearch("search_vector", sanitized);
```

---

## Fix 4 — Patient Update Ownership Bypass (HIGH)

### Problem
`PATCH /api/patients/[id]` updates a patient without verifying the patient belongs to the current user's organization. An attacker could modify another org's patient records by guessing IDs.

### Fix
Always scope updates to the user's org:

```typescript
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Get user's org
  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", user.id)
    .single();

  const body = await req.json();

  // Scope update to user's org
  const { data, error } = await supabase
    .from("patients")
    .update(body)
    .eq("id", params.id)
    .eq("organization_id", profile.organization_id)
    .select()
    .single();

  if (!data) {
    return NextResponse.json({ error: "Patient not found" }, { status: 404 });
  }
  // ...
}
```

---

## Fix 5 — Incomplete GDPR Data Deletion (HIGH)

### Problem
The GDPR data deletion route (`/api/gdpr/delete` or similar) doesn't delete from all user-related tables. It misses: `consultations`, `transcripts`, `audio_recordings`, `ai_suggestions`, `vitals`.

### Fix
Ensure cascading deletion in order (respecting FK constraints):

```typescript
// Delete in dependency order
const tables = [
  "ai_suggestions",      // depends on consultations
  "transcripts",         // depends on consultations
  "audio_recordings",    // depends on consultations
  "vitals",              // depends on consultations
  "consultations",       // depends on patients
  "patients",            // depends on organization
  "waiting_room_entries", // depends on organization
  "bookings",            // depends on organization
];

for (const table of tables) {
  const { error } = await supabaseAdmin
    .from(table)
    .delete()
    .eq("user_id", userId);  // or organization_id where applicable

  if (error) {
    console.error(`GDPR deletion failed for ${table}:`, error);
    return NextResponse.json(
      { error: `Deletion incomplete — failed at ${table}` },
      { status: 500 }
    );
  }
}
```

---

## Fix 6 — Unbounded Admin Export (MEDIUM)

### Problem
Admin export endpoints fetch all rows without pagination limits, which can cause OOM on large datasets.

### Fix
Add a hard limit and pagination:

```typescript
const MAX_EXPORT_ROWS = 10000;

const { data, error } = await supabaseAdmin
  .from("consultations")
  .select("*")
  .eq("organization_id", orgId)
  .range(0, MAX_EXPORT_ROWS - 1)
  .order("created_at", { ascending: false });
```

---

## Fix 7 — Rate Limiting on Auth-Adjacent Routes (MEDIUM)

### Problem
Routes like `/api/auth/signup-request` and `/api/waiting-room` have no rate limiting, enabling spam.

### Fix
Add a simple in-memory rate limiter (sufficient for single-instance deployments):

```typescript
// src/lib/rate-limit.ts
const hits = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = hits.get(key);

  if (!entry || now > entry.resetAt) {
    hits.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (entry.count >= limit) return false;
  entry.count++;
  return true;
}

// Usage in route:
const ip = req.headers.get("x-forwarded-for") || "unknown";
if (!rateLimit(`waiting-room:${ip}`, 10, 60_000)) {
  return NextResponse.json({ error: "Too many requests" }, { status: 429 });
}
```

---

## Acceptance Criteria

- [ ] No API key is ever returned to the client as a fallback
- [ ] All API routes verify user authentication
- [ ] Search inputs are sanitized before database queries
- [ ] Patient updates are scoped to the user's organization
- [ ] GDPR deletion covers all user-related tables
- [ ] Admin exports have row limits
- [ ] Auth-adjacent routes have rate limiting
- [ ] `npm run build` succeeds
