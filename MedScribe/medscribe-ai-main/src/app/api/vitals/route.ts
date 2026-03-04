import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

const VITAL_RANGES: Record<string, { min: number; max: number; unit: string }> = {
  systolic_bp: { min: 90, max: 140, unit: "mmHg" },
  diastolic_bp: { min: 60, max: 90, unit: "mmHg" },
  heart_rate: { min: 60, max: 100, unit: "bpm" },
  temperature: { min: 36.1, max: 37.2, unit: "°C" },
  spo2: { min: 95, max: 100, unit: "%" },
  blood_glucose: { min: 70, max: 140, unit: "mg/dL" },
  weight: { min: 0, max: 500, unit: "kg" },
  respiratory_rate: { min: 12, max: 20, unit: "breaths/min" },
};

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const patientId = request.nextUrl.searchParams.get("patient_id");
    const readingType = request.nextUrl.searchParams.get("reading_type");
    const days = parseInt(request.nextUrl.searchParams.get("days") || "90", 10);

    if (!patientId) {
      return NextResponse.json({ error: "patient_id is required" }, { status: 400 });
    }

    const since = new Date();
    since.setDate(since.getDate() - days);

    let query = supabase
      .from("vital_readings")
      .select("*")
      .eq("patient_id", patientId)
      .eq("user_id", user.id)
      .gte("recorded_at", since.toISOString())
      .order("recorded_at", { ascending: false });

    if (readingType) {
      query = query.eq("reading_type", readingType);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: "Failed to fetch vitals" }, { status: 500 });
    }

    // Calculate trends per reading type
    const byType: Record<string, Array<Record<string, unknown>>> = {};
    for (const reading of data || []) {
      const type = reading.reading_type as string;
      if (!byType[type]) byType[type] = [];
      byType[type].push(reading);
    }

    const trends: Record<string, { avg: number; min: number; max: number; trend: string; latest: number }> = {};
    for (const [type, readings] of Object.entries(byType)) {
      const values = readings.map((r) => r.value as number);
      const avg = values.reduce((a, b) => a + b, 0) / values.length;
      const recent = values.slice(0, Math.min(5, values.length));
      const older = values.slice(Math.min(5, values.length));
      const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
      const olderAvg = older.length > 0 ? older.reduce((a, b) => a + b, 0) / older.length : recentAvg;

      let trend = "stable";
      if (recentAvg > olderAvg * 1.05) trend = "increasing";
      else if (recentAvg < olderAvg * 0.95) trend = "decreasing";

      trends[type] = {
        avg: Math.round(avg * 10) / 10,
        min: Math.min(...values),
        max: Math.max(...values),
        trend,
        latest: values[0],
      };
    }

    return NextResponse.json({ data: data || [], trends });
  } catch (err) {
    console.error("Vitals GET error:", err);
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
    const { patient_id, device_type, device_name, reading_type, value, unit, secondary_value, secondary_unit, notes, recorded_at } = body;

    if (!patient_id || !device_type || !reading_type || value === undefined || !unit) {
      return NextResponse.json({ error: "patient_id, device_type, reading_type, value, and unit are required" }, { status: 400 });
    }

    const range = VITAL_RANGES[reading_type];
    const is_abnormal = range ? (value < range.min || value > range.max) : false;

    const { data, error } = await supabase
      .from("vital_readings")
      .insert({
        patient_id,
        user_id: user.id,
        device_type,
        device_name: device_name || null,
        reading_type,
        value,
        unit,
        secondary_value: secondary_value || null,
        secondary_unit: secondary_unit || null,
        recorded_at: recorded_at || new Date().toISOString(),
        notes: notes || null,
        is_abnormal,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: "Failed to record vital" }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    console.error("Vitals POST error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
