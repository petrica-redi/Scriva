"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Users, Plus, Building, UserPlus } from "lucide-react";

interface TeamMember {
  id: string;
  role: string;
  users: { id: string; full_name: string; specialty: string | null; role: string };
}

interface Organization {
  id: string;
  name: string;
  type: string;
}

export function TeamPanel() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [myRole, setMyRole] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [orgName, setOrgName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("member");

  useEffect(() => {
    fetch("/api/team")
      .then((r) => r.ok ? r.json() : { data: [] })
      .then((data) => {
        setOrganizations(data.organizations || []);
        setMembers(data.members || []);
        setMyRole(data.myRole || "");
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const createOrg = async () => {
    if (!orgName) return;
    const response = await fetch("/api/team", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "create_org", name: orgName }),
    });
    if (response.ok) {
      const org = await response.json();
      setOrganizations([org]);
      setShowCreate(false);
      setOrgName("");
    }
  };

  const inviteMember = async () => {
    if (!inviteEmail || !organizations[0]) return;
    await fetch("/api/team", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "invite", organization_id: organizations[0].id, email: inviteEmail, role: inviteRole }),
    });
    setShowInvite(false);
    setInviteEmail("");
  };

  const roleColors: Record<string, string> = {
    owner: "bg-purple-100 text-purple-800",
    admin: "bg-blue-100 text-blue-800",
    member: "bg-green-100 text-green-800",
    resident: "bg-yellow-100 text-yellow-800",
    nurse: "bg-pink-100 text-pink-800",
  };

  if (loading) return <Card><CardContent className="p-4"><p className="text-sm text-medical-muted">Loading team...</p></CardContent></Card>;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="w-4 h-4 text-brand-600" />
            Team Collaboration
          </CardTitle>
          {organizations.length > 0 && (myRole === "owner" || myRole === "admin") && (
            <Button size="sm" variant="outline" onClick={() => setShowInvite(!showInvite)}>
              <UserPlus className="w-3 h-3 mr-1" /> Invite
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {organizations.length === 0 ? (
          <div className="text-center py-6">
            <Building className="w-10 h-10 text-medical-muted mx-auto mb-2" />
            <p className="text-sm text-medical-muted mb-3">No organization yet. Create one to collaborate with your team.</p>
            {showCreate ? (
              <div className="flex gap-2 max-w-sm mx-auto">
                <Input placeholder="Organization name" value={orgName} onChange={(e) => setOrgName(e.target.value)} />
                <Button onClick={createOrg}>Create</Button>
              </div>
            ) : (
              <Button onClick={() => setShowCreate(true)}><Plus className="w-4 h-4 mr-1" /> Create Organization</Button>
            )}
          </div>
        ) : (
          <>
            <div className="p-2.5 bg-brand-50 rounded-lg border border-brand-200">
              <div className="flex items-center gap-2">
                <Building className="w-4 h-4 text-brand-600" />
                <span className="text-sm font-medium text-brand-700">{organizations[0].name}</span>
                <Badge className={roleColors[myRole] || ""}>{myRole}</Badge>
              </div>
            </div>

            {showInvite && (
              <div className="p-3 border border-brand-200 rounded-lg space-y-2">
                <Input type="email" placeholder="Email address" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} />
                <div className="flex gap-2">
                  <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value)} className="border rounded px-2 text-sm flex-1">
                    <option value="member">Member</option>
                    <option value="admin">Admin</option>
                    <option value="resident">Resident</option>
                    <option value="nurse">Nurse</option>
                  </select>
                  <Button size="sm" onClick={inviteMember}>Send Invite</Button>
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              {members.map((m) => (
                <div key={m.id} className="flex items-center justify-between p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-800">
                  <div>
                    <p className="text-sm font-medium text-medical-text">{m.users.full_name}</p>
                    {m.users.specialty && <p className="text-xs text-medical-muted">{m.users.specialty}</p>}
                  </div>
                  <Badge className={`text-xs ${roleColors[m.role] || ""}`}>{m.role}</Badge>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
