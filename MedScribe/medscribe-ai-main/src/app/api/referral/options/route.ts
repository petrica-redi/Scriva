import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import clinicPhysicianMap from "../../../../../clinic-physician-map.json";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const capitalize = (s: string) =>
  s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const specialty = searchParams.get("specialty")?.trim() || "";
  const clinicId = searchParams.get("clinicId")?.trim() || "";

  if (!specialty) {
    return NextResponse.json({ clinics: [], physicians: [] });
  }

  try {
    const searchTerm = capitalize(specialty);

    const { data: clinics, error: clinicError } = await supabase
      .from("clinics")
      .select("id, name, type, specialty, city, country, email, phone, address")
      .or(
        `name.ilike.%${searchTerm}%,specialty.cs.{${searchTerm}},specialty.cs.{${specialty.toLowerCase()}}`
      )
      .limit(50);

    if (clinicError) {
      console.error("[ReferralOptions] Clinics error:", clinicError);
      return NextResponse.json({ clinics: [], physicians: [] });
    }

    let physQuery = supabase
      .from("physicians")
      .select("id, name, specialty, city, country, email, phone")
      .ilike("specialty", `%${searchTerm}%`)
      .limit(100);

    if (clinicId) {
      const physicianIds = (clinicPhysicianMap as { id: string; clinic_ids: string[] }[])
        .filter((m) => m.clinic_ids?.includes(clinicId))
        .map((m) => m.id);
      if (physicianIds.length > 0) {
        physQuery = physQuery.in("id", physicianIds);
      }
    }

    const { data: physicians } = await physQuery;

    return NextResponse.json({
      clinics: clinics || [],
      physicians: physicians || [],
    });
  } catch (e) {
    console.error("[ReferralOptions] Error:", e);
    return NextResponse.json({ clinics: [], physicians: [] });
  }
}
