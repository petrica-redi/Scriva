import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/audit";
import { requireAdmin } from "@/lib/requireAdmin";

/**
 * GET /api/admin/data?table=...&page=0&per_page=25&status=...&date_from=...&date_to=...
 *
 * Generic paginated query endpoint for admin panel tabs that need to see ALL
 * rows regardless of who owns them (bypasses RLS via the service-role client).
 *
 * Previously each admin tab called the anon/session Supabase client directly,
 * which applies RLS — so admins only saw their own records, not the platform
 * totals they expected.
 *
 * Allowed tables: consultations | transcripts | clinical_notes |
 *                 consultation_documents | audit_log
 */

const ALLOWED_TABLES = new Set([
  "consultations",
  "transcripts",
  "clinical_notes",
  "consultation_documents",
  "audit_log",
]);

type AllowedTable =
  | "consultations"
  | "transcripts"
  | "clinical_notes"
  | "consultation_documents"
  | "audit_log";

export async function GET(request: Request) {
  const denied = requireAdmin(request);
  if (denied) return denied;

  const { searchParams } = new URL(request.url);
  const table = searchParams.get("table") ?? "";

  if (!ALLOWED_TABLES.has(table)) {
    return NextResponse.json(
      { error: `Invalid table. Allowed: ${[...ALLOWED_TABLES].join(", ")}` },
      { status: 400 }
    );
  }

  const page = Math.max(0, parseInt(searchParams.get("page") ?? "0", 10));
  const perPage = Math.min(100, Math.max(1, parseInt(searchParams.get("per_page") ?? "25", 10)));
  const status = searchParams.get("status") ?? "";
  const dateFrom = searchParams.get("date_from") ?? "";
  const dateTo = searchParams.get("date_to") ?? "";
  const documentType = searchParams.get("document_type") ?? "";

  try {
    // supabaseAdmin uses the service-role key and bypasses RLS entirely.
    let query = supabaseAdmin
      .from(table as AllowedTable)
      .select("*")
      .order("created_at", { ascending: false })
      .range(page * perPage, (page + 1) * perPage - 1);

    if (status && status !== "all") {
      query = query.eq("status", status);
    }
    if (dateFrom) {
      query = query.gte("created_at", dateFrom);
    }
    if (dateTo) {
      query = query.lte("created_at", `${dateTo}T23:59:59`);
    }
    if (documentType && table === "consultation_documents") {
      query = query.eq("document_type", documentType);
    }

    const { data, error } = await query;

    if (error) {
      console.error(`[Admin data] Query error on ${table}:`, error);
      return NextResponse.json({ error: "Query failed" }, { status: 500 });
    }

    return NextResponse.json({ data: data ?? [], table, page, per_page: perPage });
  } catch (err) {
    console.error("[Admin data] Unexpected error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
