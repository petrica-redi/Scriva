import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const action = request.nextUrl.searchParams.get("action");

    if (action === "suggest") {
      const visitType = request.nextUrl.searchParams.get("visit_type") || "general";
      const date = request.nextUrl.searchParams.get("date");

      if (!date) {
        return NextResponse.json({ error: "date is required for suggestions" }, { status: 400 });
      }

      const dayOfWeek = new Date(date).getDay();

      const [{ data: prefs }, { data: stats }, { data: existingConsultations }] = await Promise.all([
        supabase.from("scheduling_preferences").select("*").eq("user_id", user.id).eq("day_of_week", dayOfWeek).single(),
        supabase.from("visit_duration_stats").select("*").eq("user_id", user.id).eq("visit_type", visitType).single(),
        supabase.from("consultations").select("created_at, metadata")
          .eq("user_id", user.id)
          .gte("created_at", `${date}T00:00:00`)
          .lte("created_at", `${date}T23:59:59`)
          .order("created_at", { ascending: true }),
      ]);

      const slotDuration = stats?.avg_duration_minutes || prefs?.slot_duration_minutes || 30;
      const buffer = prefs?.buffer_minutes || 5;
      const startTime = prefs?.start_time || "09:00";
      const endTime = prefs?.end_time || "17:00";

      // Find available slots
      const bookedTimes = (existingConsultations || []).map((c) => {
        const meta = (c.metadata || {}) as Record<string, unknown>;
        return {
          start: c.created_at,
          duration: (meta.estimated_duration as number) || slotDuration,
        };
      });

      const suggestions = [];
      const [startH, startM] = startTime.split(":").map(Number);
      const [endH, endM] = endTime.split(":").map(Number);
      let currentMinutes = startH * 60 + startM;
      const endMinutes = endH * 60 + endM;

      while (currentMinutes + slotDuration <= endMinutes && suggestions.length < 5) {
        const slotHour = Math.floor(currentMinutes / 60);
        const slotMin = currentMinutes % 60;
        const slotTime = `${date}T${String(slotHour).padStart(2, "0")}:${String(slotMin).padStart(2, "0")}:00`;

        const isAvailable = !bookedTimes.some((bt) => {
          const btStart = new Date(bt.start).getTime();
          const btEnd = btStart + bt.duration * 60 * 1000;
          const slotStart = new Date(slotTime).getTime();
          const slotEnd = slotStart + (slotDuration + buffer) * 60 * 1000;
          return slotStart < btEnd && slotEnd > btStart;
        });

        if (isAvailable) {
          suggestions.push({
            suggested_time: slotTime,
            estimated_duration: slotDuration,
            buffer_after: buffer,
            confidence: stats ? Math.min(0.95, 0.7 + stats.sample_count * 0.01) : 0.5,
            reason: stats
              ? `Based on ${stats.sample_count} previous ${visitType} visits averaging ${slotDuration} minutes`
              : "Default slot duration (no historical data yet)",
          });
        }

        currentMinutes += slotDuration + buffer;
      }

      return NextResponse.json({ suggestions });
    }

    // Default: return scheduling preferences
    const { data: preferences } = await supabase
      .from("scheduling_preferences")
      .select("*")
      .eq("user_id", user.id)
      .order("day_of_week", { ascending: true });

    return NextResponse.json({ data: preferences || [] });
  } catch (err) {
    console.error("Scheduling GET error:", err);
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

    const body = await request.json();
    const { preferences } = body;

    if (!preferences || !Array.isArray(preferences)) {
      return NextResponse.json({ error: "preferences array is required" }, { status: 400 });
    }

    // Upsert preferences
    const records = preferences.map((p: Record<string, unknown>) => ({
      user_id: user.id,
      day_of_week: p.day_of_week,
      start_time: p.start_time,
      end_time: p.end_time,
      slot_duration_minutes: p.slot_duration_minutes || 30,
      buffer_minutes: p.buffer_minutes || 5,
      max_patients: p.max_patients || null,
      is_active: p.is_active !== false,
    }));

    const { data, error } = await supabase
      .from("scheduling_preferences")
      .upsert(records, { onConflict: "user_id,day_of_week" })
      .select();

    if (error) {
      return NextResponse.json({ error: "Failed to save preferences" }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (err) {
    console.error("Scheduling POST error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
