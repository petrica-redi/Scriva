import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

function sanitizeSearchInput(input: string): string {
  return input.replace(/[%_\\(),.'":;]/g, "");
}

const createPatientSchema = z.object({
  full_name: z.string().min(1, "Patient name is required").max(200),
  mrn: z.string().max(50).optional().nullable(),
  date_of_birth: z.string().optional().nullable(),
  gender: z.enum(["male", "female", "other", "prefer_not_to_say"]).optional().nullable(),
  contact_info: z.record(z.string()).optional(),
});

/**
 * GET /api/patients — List patients with optional search
 * POST /api/patients — Create a new patient
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const rawSearch = searchParams.get("search");
    const page = Math.max(1, parseInt(searchParams.get("page") || "1") || 1);
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20") || 20));
    const offset = (page - 1) * limit;

    let query = supabase
      .from("patients")
      .select("*", { count: "exact" })
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (rawSearch) {
      const search = sanitizeSearchInput(rawSearch.trim());
      if (search.length >= 2) {
        query = query.or(`full_name.ilike.%${search}%,mrn.ilike.%${search}%`);
      }
    }

    const { data, count, error } = await query.range(offset, offset + limit - 1);

    if (error) {
      return NextResponse.json({ error: "Failed to fetch patients" }, { status: 500 });
    }

    return NextResponse.json({
      data: data || [],
      pagination: { page, limit, total: count || 0, pages: Math.ceil((count || 0) / limit) },
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch patients" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const validation = createPatientSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.errors },
        { status: 400 }
      );
    }

    const { full_name, mrn, date_of_birth, gender, contact_info } = validation.data;

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

    if (error) {
      return NextResponse.json({ error: "Failed to create patient" }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Failed to create patient" },
      { status: 500 }
    );
  }
}
