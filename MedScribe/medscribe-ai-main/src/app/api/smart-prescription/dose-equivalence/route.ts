import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

/** GET ?from=Name&fromDose=100&to=OtherName — returns equivalent dose when switching. */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const sp = new URL(request.url).searchParams;
    const fromNameOrId = sp.get("from")?.trim();
    const fromDoseParam = sp.get("fromDose")?.trim();
    const fromUnit = sp.get("fromUnit") || "mg";
    const toNameOrId = sp.get("to")?.trim();

    if (!fromNameOrId || !fromDoseParam || !toNameOrId)
      return NextResponse.json({ error: "Params: from, fromDose, to" }, { status: 400 });

    const fromDose = parseFloat(fromDoseParam);
    if (Number.isNaN(fromDose) || fromDose <= 0)
      return NextResponse.json({ error: "fromDose must be positive number" }, { status: 400 });

    const isUuid = (s: string) => /^[0-9a-f-]{36}$/i.test(s);
    const fromId = isUuid(fromNameOrId) ? fromNameOrId : null;
    const toId = isUuid(toNameOrId) ? toNameOrId : null;

    const fromQuery = fromId
      ? supabase.from("medications").select("id, name").eq("id", fromId)
      : supabase.from("medications").select("id, name").ilike("name", fromNameOrId);
    const { data: fromMeds } = await fromQuery;
    const fromMed = (fromMeds && fromMeds.length) ? fromMeds[0] : null;

    const toQuery = toId
      ? supabase.from("medications").select("id, name").eq("id", toId)
      : supabase.from("medications").select("id, name").ilike("name", toNameOrId);
    const { data: toMeds } = await toQuery;
    const toMed = (toMeds && toMeds.length) ? toMeds[0] : null;

    if (!fromMed || !toMed)
      return NextResponse.json({ error: "Medication not found" }, { status: 404 });

    if (fromMed.id === toMed.id)
      return NextResponse.json({
        from: { medication: fromMed.name, dose: fromDose, unit: fromUnit },
        to: { medication: toMed.name, dose: fromDose, unit: fromUnit },
        equivalent: fromDose,
        unit: fromUnit,
        note: "Same medication.",
      });

    const { data: equivRows } = await supabase
      .from("dose_equivalences")
      .select("from_value, from_unit, to_value, to_unit, notes")
      .eq("from_medication_id", fromMed.id)
      .eq("to_medication_id", toMed.id);

    const eq = (equivRows && equivRows.length) ? equivRows[0] : null;
    if (!eq) {
      return NextResponse.json({
        from: { medication: fromMed.name, dose: fromDose, unit: fromUnit },
        to: { medication: toMed.name },
        equivalent: null,
        note: "No equivalence data. Consult Maudsley/BNF.",
      });
    }

    const ratio = (eq.to_value as number) / (eq.from_value as number);
    const equivalentDose = Math.round(fromDose * ratio * 10) / 10;

    return NextResponse.json({
      from: { medication: fromMed.name, dose: fromDose, unit: fromUnit },
      to: { medication: toMed.name, dose: equivalentDose, unit: eq.to_unit },
      equivalent: equivalentDose,
      unit: eq.to_unit,
      note: eq.notes || undefined,
    });
  } catch (err) {
    console.error("[dose-equivalence]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
