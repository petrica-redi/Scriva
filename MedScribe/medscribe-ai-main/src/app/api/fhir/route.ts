import { createClient } from "@/lib/supabase/server";
import { logAuditEvent } from "@/lib/audit";
import { NextRequest, NextResponse } from "next/server";

const FHIR_BASE = process.env.FHIR_SERVER_URL;

async function fhirFetch(path: string, options?: RequestInit) {
  if (!FHIR_BASE) throw new Error("FHIR server not configured");

  const response = await fetch(`${FHIR_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/fhir+json",
      Accept: "application/fhir+json",
      ...(process.env.FHIR_CLIENT_ID && {
        Authorization: `Bearer ${process.env.FHIR_ACCESS_TOKEN || ""}`,
      }),
      ...options?.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`FHIR request failed: ${response.status}`);
  }

  return response.json();
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const action = request.nextUrl.searchParams.get("action");

    if (action === "status") {
      const configured = Boolean(FHIR_BASE);
      let reachable = false;
      if (configured) {
        try {
          await fhirFetch("/metadata");
          reachable = true;
        } catch { /* not reachable */ }
      }
      return NextResponse.json({ configured, reachable, server: FHIR_BASE || null });
    }

    if (action === "search_patient") {
      const name = request.nextUrl.searchParams.get("name");
      const identifier = request.nextUrl.searchParams.get("identifier");
      
      let searchPath = "/Patient?";
      if (name) searchPath += `name=${encodeURIComponent(name)}&`;
      if (identifier) searchPath += `identifier=${encodeURIComponent(identifier)}&`;
      searchPath += "_count=20";

      const bundle = await fhirFetch(searchPath);
      
      const patients = (bundle.entry || []).map((e: Record<string, unknown>) => {
        const resource = e.resource as Record<string, unknown>;
        const name = (resource.name as Array<{ given?: string[]; family?: string }>)?.[0];
        return {
          fhir_id: resource.id,
          full_name: `${(name?.given || []).join(" ")} ${name?.family || ""}`.trim(),
          date_of_birth: resource.birthDate,
          gender: resource.gender,
          identifier: ((resource.identifier as Array<{ value?: string }>) || [])[0]?.value,
        };
      });

      return NextResponse.json({ patients });
    }

    if (action === "sync_log") {
      const { data: logs } = await supabase
        .from("fhir_sync_log")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);

      return NextResponse.json({ data: logs || [] });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err) {
    console.error("FHIR GET error:", err);
    return NextResponse.json({ error: "FHIR operation failed" }, { status: 500 });
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
    const { action } = body;

    if (action === "import_patient") {
      const { fhir_id } = body;
      if (!fhir_id) {
        return NextResponse.json({ error: "fhir_id is required" }, { status: 400 });
      }

      const fhirPatient = await fhirFetch(`/Patient/${fhir_id}`);
      const name = (fhirPatient.name || [])[0];

      const { data: patient, error } = await supabase
        .from("patients")
        .insert({
          user_id: user.id,
          full_name: `${(name?.given || []).join(" ")} ${name?.family || ""}`.trim(),
          date_of_birth: fhirPatient.birthDate || null,
          gender: fhirPatient.gender || null,
          ehr_patient_id: fhir_id,
          contact_info: {
            phone: ((fhirPatient.telecom || []).find((t: Record<string, string>) => t.system === "phone") || {}).value,
            email: ((fhirPatient.telecom || []).find((t: Record<string, string>) => t.system === "email") || {}).value,
          },
        })
        .select()
        .single();

      if (error) {
        await supabase.from("fhir_sync_log").insert({
          user_id: user.id, direction: "import", resource_type: "Patient",
          fhir_id, status: "failed", error_message: error.message,
        });
        return NextResponse.json({ error: "Failed to import patient" }, { status: 500 });
      }

      await supabase.from("fhir_sync_log").insert({
        user_id: user.id, direction: "import", resource_type: "Patient",
        fhir_id, local_id: patient.id, status: "success",
      });

      await logAuditEvent(supabase, user.id, "fhir_import", "patient", patient.id, { fhir_id });

      return NextResponse.json(patient, { status: 201 });
    }

    if (action === "export_note") {
      const { consultation_id } = body;
      if (!consultation_id) {
        return NextResponse.json({ error: "consultation_id is required" }, { status: 400 });
      }

      const { data: note } = await supabase
        .from("clinical_notes")
        .select("*, consultations(patient_id)")
        .eq("consultation_id", consultation_id)
        .single();

      if (!note) {
        return NextResponse.json({ error: "Note not found" }, { status: 404 });
      }

      // Convert to FHIR DocumentReference
      const fhirDoc = {
        resourceType: "DocumentReference",
        status: "current",
        type: { coding: [{ system: "http://loinc.org", code: "11506-3", display: "Clinical Note" }] },
        subject: { reference: `Patient/${(note.consultations as Record<string, unknown>)?.patient_id || "unknown"}` },
        date: new Date().toISOString(),
        content: [{
          attachment: {
            contentType: "application/json",
            data: Buffer.from(JSON.stringify(note.sections)).toString("base64"),
          },
        }],
      };

      try {
        const result = await fhirFetch("/DocumentReference", { method: "POST", body: JSON.stringify(fhirDoc) });
        
        await supabase.from("fhir_sync_log").insert({
          user_id: user.id, direction: "export", resource_type: "DocumentReference",
          fhir_id: result.id, local_id: note.id, status: "success",
        });

        await logAuditEvent(supabase, user.id, "fhir_export", "clinical_note", note.id, { fhir_id: result.id });

        return NextResponse.json({ fhir_id: result.id, status: "exported" });
      } catch (exportErr) {
        await supabase.from("fhir_sync_log").insert({
          user_id: user.id, direction: "export", resource_type: "DocumentReference",
          local_id: note.id, status: "failed", error_message: String(exportErr),
        });
        return NextResponse.json({ error: "FHIR export failed" }, { status: 500 });
      }
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err) {
    console.error("FHIR POST error:", err);
    return NextResponse.json({ error: "FHIR operation failed" }, { status: 500 });
  }
}
