import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/audit";
import { requireAdmin } from "@/lib/requireAdmin";

export interface AdminUserRow {
  id: string;
  email: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  full_name: string | null;
  role: string;
  specialty: string | null;
  patient_count: number;
  consultation_count: number;
}

/**
 * GET /api/admin/users
 * List all users with profile and counts. Admin only (checked via middleware + role).
 */
export async function GET(request: Request) {
  try {
    const denied = requireAdmin(request);
    if (denied) return denied;

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const perPage = Math.min(50, Math.max(1, parseInt(searchParams.get("per_page") ?? "25", 10)));
    const search = (searchParams.get("search") ?? "").trim().toLowerCase();
    const roleFilter = searchParams.get("role") ?? "";

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.listUsers({
      page,
      perPage,
    });

    if (authError) {
      console.error("[Admin users] Auth list error:", authError);
      return NextResponse.json(
        { error: "Failed to list users" },
        { status: 500 }
      );
    }

    const authUsers = authData.users ?? [];
    if (authUsers.length === 0) {
      return NextResponse.json({
        users: [],
        total: authData.total ?? 0,
        page,
        per_page: perPage,
      });
    }

    const ids = authUsers.map((u) => u.id);

    const [profilesRes, patientsRes, consultationsRes] = await Promise.all([
      supabaseAdmin.from("users").select("id, full_name, role, specialty").in("id", ids),
      // Filter to the current page of users — fetching ALL rows would be unbounded
      supabaseAdmin.from("patients").select("user_id").in("user_id", ids),
      supabaseAdmin.from("consultations").select("user_id").in("user_id", ids),
    ]);

    const profiles = new Map(
      (profilesRes.data ?? []).map((p) => [p.id, p])
    );
    const patientCounts = new Map<string, number>();
    (patientsRes.data ?? []).forEach((r) => {
      const uid = (r as { user_id: string }).user_id;
      patientCounts.set(uid, (patientCounts.get(uid) ?? 0) + 1);
    });
    const consultationCounts = new Map<string, number>();
    (consultationsRes.data ?? []).forEach((r) => {
      const uid = (r as { user_id: string }).user_id;
      consultationCounts.set(uid, (consultationCounts.get(uid) ?? 0) + 1);
    });

    let users: AdminUserRow[] = authUsers.map((u) => {
      const p = profiles.get(u.id);
      return {
        id: u.id,
        email: u.email ?? null,
        created_at: u.created_at ?? "",
        last_sign_in_at: u.last_sign_in_at ?? null,
        full_name: p?.full_name ?? null,
        role: p?.role ?? "clinician",
        specialty: p?.specialty ?? null,
        patient_count: patientCounts.get(u.id) ?? 0,
        consultation_count: consultationCounts.get(u.id) ?? 0,
      };
    });

    if (search) {
      users = users.filter(
        (u) =>
          (u.email ?? "").toLowerCase().includes(search) ||
          (u.full_name ?? "").toLowerCase().includes(search)
      );
    }
    if (roleFilter) {
      users = users.filter((u) => u.role === roleFilter);
    }

    return NextResponse.json({
      users,
      total: authData.total ?? 0,
      page,
      per_page: perPage,
    });
  } catch (err) {
    console.error("[Admin users] Error:", err);
    return NextResponse.json(
      { error: "Failed to load users" },
      { status: 500 }
    );
  }
}
