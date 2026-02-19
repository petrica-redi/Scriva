import { NextResponse } from "next/server";

/**
 * GET /api/deepgram/test
 * Tests the Deepgram API key by making a simple REST call.
 * This helps distinguish between invalid key vs model/connection issues.
 */
export async function GET() {
  const apiKey = process.env.DEEPGRAM_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ status: "error", message: "No DEEPGRAM_API_KEY in .env.local" });
  }

  try {
    // Test 1: Check key validity by listing projects
    const projectsRes = await fetch("https://api.deepgram.com/v1/projects", {
      headers: { Authorization: `Token ${apiKey}` },
    });

    if (!projectsRes.ok) {
      const errText = await projectsRes.text();
      return NextResponse.json({
        status: "error",
        message: `API key rejected (HTTP ${projectsRes.status})`,
        detail: errText,
        key_preview: `${apiKey.substring(0, 8)}...`,
      });
    }

    const projects = await projectsRes.json();
    const projectId = projects?.projects?.[0]?.project_id;

    // Test 2: Check available models
    let modelsInfo = null;
    if (projectId) {
      const usageRes = await fetch(
        `https://api.deepgram.com/v1/projects/${projectId}/usage/fields`,
        { headers: { Authorization: `Token ${apiKey}` } }
      );
      if (usageRes.ok) {
        modelsInfo = await usageRes.json();
      }
    }

    return NextResponse.json({
      status: "ok",
      message: "API key is valid!",
      key_preview: `${apiKey.substring(0, 8)}...`,
      project_id: projectId,
      projects_count: projects?.projects?.length,
      models: modelsInfo,
    });
  } catch (err) {
    return NextResponse.json({
      status: "error",
      message: err instanceof Error ? err.message : "Unknown error",
      key_preview: `${apiKey.substring(0, 8)}...`,
    });
  }
}
