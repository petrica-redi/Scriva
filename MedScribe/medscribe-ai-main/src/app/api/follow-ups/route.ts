import { createClient } from "@/lib/supabase/server";
import { followUpsPostSchema } from "@/lib/validators";
import { apiError } from "@/lib/api-response";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status");
    const patientId = searchParams.get("patient_id");
    const limit = parseInt(searchParams.get("limit") || "50", 10);

    let query = supabase
      .from("follow_ups")
      .select("*")
      .eq("user_id", user.id)
      .order("due_date", { ascending: true })
      .limit(limit);

    if (status) {
      query = query.eq("status", status);
    } else {
      query = query.in("status", ["pending", "overdue"]);
    }

    if (patientId) {
      query = query.eq("patient_id", patientId);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: "Failed to fetch follow-ups" }, { status: 500 });
    }

    // Auto-mark overdue items
    const today = new Date().toISOString().split("T")[0];
    const overdueIds = (data || [])
      .filter((f) => f.status === "pending" && f.due_date < today)
      .map((f) => f.id);

    if (overdueIds.length > 0) {
      await supabase
        .from("follow_ups")
        .update({ status: "overdue" })
        .in("id", overdueIds);
    }

    return NextResponse.json({ data: data || [] });
  } catch (err) {
    console.error("Follow-ups GET error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return apiError("Unauthorized", 401);
    }

    const body = await request.json();
    const parsed = followUpsPostSchema.safeParse(body);
    if (!parsed.success) {
      const msg = parsed.error.flatten().fieldErrors
        ? Object.entries(parsed.error.flatten().fieldErrors)
            .map(([k, v]) => `${k}: ${(v as string[])?.[0] ?? "invalid"}`)
            .join("; ")
        : "Validation failed";
      return apiError(msg, 400, "VALIDATION_ERROR");
    }
    const { patient_id, consultation_id, type, title, description, due_date, priority } = parsed.data;

    const { data, error } = await supabase
      .from("follow_ups")
      .insert({
        user_id: user.id,
        patient_id,
        consultation_id: consultation_id || null,
        type,
        title,
        description: description || null,
        due_date,
        priority: priority ?? "medium",
        status: "pending",
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: "Failed to create follow-up" }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    console.error("Follow-ups POST error:", err);
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

    const { id, status, snoozed_until } = await request.json();

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const updateData: Record<string, unknown> = {};
    if (status) {
      updateData.status = status;
      if (status === "completed") updateData.completed_at = new Date().toISOString();
    }
    if (snoozed_until) {
      updateData.snoozed_until = snoozed_until;
      updateData.status = "snoozed";
    }

    const { data, error } = await supabase
      .from("follow_ups")
      .update(updateData)
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: "Failed to update follow-up" }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error("Follow-ups PATCH error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
