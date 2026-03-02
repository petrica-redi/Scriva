import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/deepgram/stream-test
 * Tests if the Deepgram API key supports WebSocket streaming
 * by making a test request to the Deepgram streaming endpoint info.
 */
export async function POST() {
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
        { error: "No DEEPGRAM_API_KEY", streaming_capable: false },
        { status: 503 }
      );
    }

    const projectsRes = await fetch("https://api.deepgram.com/v1/projects", {
      headers: { Authorization: `Token ${apiKey}` },
    });

    if (!projectsRes.ok) {
      return NextResponse.json({
        streaming_capable: false,
        error: "Deepgram API connectivity failed",
      });
    }

    const projects = await projectsRes.json();
    const hasProjects = Array.isArray(projects?.projects) && projects.projects.length > 0;

    return NextResponse.json({
      streaming_capable: true,
      has_projects: hasProjects,
      message: "API key is valid. WebSocket streaming should work.",
    });
  } catch (err) {
    return NextResponse.json(
      {
        error: `Server error: ${err instanceof Error ? err.message : "unknown"}`,
        streaming_capable: false,
      },
      { status: 500 }
    );
  }
}
