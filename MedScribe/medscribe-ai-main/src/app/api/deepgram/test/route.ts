import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/deepgram/test
 * Authenticated health-check for server-side Deepgram connectivity.
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const apiKey = process.env.DEEPGRAM_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        {
          status: "error",
          message: "Deepgram is not configured on the server",
        },
        { status: 500 }
      );
    }

    const projectsRes = await fetch("https://api.deepgram.com/v1/projects", {
      headers: { Authorization: `Token ${apiKey}` },
      cache: "no-store",
    });

    if (!projectsRes.ok) {
      return NextResponse.json(
        {
          status: "error",
          message: `Deepgram connectivity failed (HTTP ${projectsRes.status})`,
        },
        { status: 502 }
      );
    }

    const projects = await projectsRes.json();
    const projectId = projects?.projects?.[0]?.project_id ?? null;

    return NextResponse.json({
      status: "ok",
      message: "Deepgram connectivity verified",
      has_projects: Array.isArray(projects?.projects)
        ? projects.projects.length > 0
        : false,
      project_id: projectId,
    });
  } catch (err) {
    console.error("[Deepgram Test] Error:", err);
    return NextResponse.json(
      {
        status: "error",
        message: "Deepgram connectivity check failed",
      },
      { status: 500 }
    );
  }
}
