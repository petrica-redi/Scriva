import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's organizations and team members
    const { data: memberships } = await supabase
      .from("team_members")
      .select("*, organizations(*)")
      .eq("user_id", user.id);

    if (!memberships || memberships.length === 0) {
      return NextResponse.json({ data: [] });
    }

    const orgIds = memberships.map((m) => m.organization_id);

    const { data: allMembers } = await supabase
      .from("team_members")
      .select("*, users(id, full_name, specialty, role)")
      .in("organization_id", orgIds);

    return NextResponse.json({
      organizations: memberships.map((m) => m.organizations),
      members: allMembers || [],
      myRole: memberships[0]?.role,
    });
  } catch (err) {
    console.error("Team GET error:", err);
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
    const { action } = body;

    if (action === "create_org") {
      const { name, type } = body;
      if (!name) {
        return NextResponse.json({ error: "Organization name is required" }, { status: 400 });
      }

      const { data: org, error: orgError } = await supabase
        .from("organizations")
        .insert({ name, type: type || "clinic" })
        .select()
        .single();

      if (orgError) {
        return NextResponse.json({ error: "Failed to create organization" }, { status: 500 });
      }

      // Add creator as owner
      await supabase
        .from("team_members")
        .insert({ organization_id: org.id, user_id: user.id, role: "owner" });

      // Update user's organization_id
      await supabase
        .from("users")
        .update({ organization_id: org.id })
        .eq("id", user.id);

      return NextResponse.json(org, { status: 201 });
    }

    if (action === "invite") {
      const { organization_id, email, role } = body;
      if (!organization_id || !email) {
        return NextResponse.json({ error: "organization_id and email are required" }, { status: 400 });
      }

      // Verify inviter has admin/owner role
      const { data: inviterMembership } = await supabase
        .from("team_members")
        .select("role")
        .eq("organization_id", organization_id)
        .eq("user_id", user.id)
        .single();

      if (!inviterMembership || !["owner", "admin"].includes(inviterMembership.role)) {
        return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
      }

      return NextResponse.json({ message: "Invitation sent", email, role: role || "member" });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err) {
    console.error("Team POST error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
