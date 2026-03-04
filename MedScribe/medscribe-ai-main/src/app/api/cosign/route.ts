import { createClient } from "@/lib/supabase/server";
import { logAuditEvent } from "@/lib/audit";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = request.nextUrl.searchParams.get("role") || "assigned";

    let query = supabase
      .from("note_cosigns")
      .select("*, clinical_notes(id, consultation_id, status, sections)")
      .order("created_at", { ascending: false });

    if (role === "assigned") {
      query = query.eq("assigned_to", user.id);
    } else {
      query = query.eq("requested_by", user.id);
    }

    const statusFilter = request.nextUrl.searchParams.get("status");
    if (statusFilter) {
      query = query.eq("status", statusFilter);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: "Failed to fetch cosign requests" }, { status: 500 });
    }

    return NextResponse.json({ data: data || [] });
  } catch (err) {
    console.error("Cosign GET error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { clinical_note_id, assigned_to } = await request.json();

    if (!clinical_note_id || !assigned_to) {
      return NextResponse.json({ error: "clinical_note_id and assigned_to are required" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("note_cosigns")
      .insert({
        clinical_note_id,
        requested_by: user.id,
        assigned_to,
        status: "pending",
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: "Failed to create cosign request" }, { status: 500 });
    }

    await logAuditEvent(supabase, user.id, "cosign_requested", "clinical_note", clinical_note_id, { assigned_to });

    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    console.error("Cosign POST error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, status, comments } = await request.json();

    if (!id || !status) {
      return NextResponse.json({ error: "id and status are required" }, { status: 400 });
    }

    const updateData: Record<string, unknown> = { status, comments: comments || null };
    if (status === "approved") {
      updateData.signed_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from("note_cosigns")
      .update(updateData)
      .eq("id", id)
      .eq("assigned_to", user.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: "Failed to update cosign" }, { status: 500 });
    }

    await logAuditEvent(supabase, user.id, `cosign_${status}`, "clinical_note", data.clinical_note_id, { cosign_id: id });

    return NextResponse.json(data);
  } catch (err) {
    console.error("Cosign PATCH error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
