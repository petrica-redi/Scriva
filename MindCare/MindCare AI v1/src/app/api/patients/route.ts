import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/utils/demo-auth";

/**
 * GET /api/patients — List patients with optional search
 * POST /api/patients — Create a new patient
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const user = await getUser();

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = (page - 1) * limit;

    let query = supabase
      .from("patients")
      .select("*", { count: "exact" })
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (search) {
      query = query.or(`full_name.ilike.%${search}%,mrn.ilike.%${search}%`);
    }

    const { data, count, error } = await query.range(offset, offset + limit - 1);

    if (error) throw error;

    return NextResponse.json({
      data: data || [],
      pagination: { page, limit, total: count || 0, pages: Math.ceil((count || 0) / limit) },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to fetch patients" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const user = await getUser();

    const body = await request.json();
    const { full_name, mrn, date_of_birth, gender, contact_info } = body;

    if (!full_name?.trim()) {
      return NextResponse.json({ error: "Patient name is required" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("patients")
      .insert({
        user_id: user.id,
        full_name: full_name.trim(),
        mrn: mrn?.trim() || null,
        date_of_birth: date_of_birth || null,
        gender: gender || null,
        contact_info: contact_info || {},
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to create patient" },
      { status: 500 }
    );
  }
}
