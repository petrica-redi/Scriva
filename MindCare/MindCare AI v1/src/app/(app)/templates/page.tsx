import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Note Templates - MindCare AI",
  description: "Manage your clinical note templates",
};

const TABS = [
  { id: "all", label: "All Templates" },
  { id: "system", label: "System" },
  { id: "custom", label: "My Templates" },
];

interface TemplatesPageProps {
  searchParams: Promise<{ tab?: string }>;
}

export default async function TemplatesPage({
  searchParams,
}: TemplatesPageProps) {
  const supabase = await createClient();

  let userId: string | null = null;
  try {
    const { data: { user } } = await supabase.auth.getUser();
    userId = user?.id || null;
  } catch {}

  const demoUserId = userId || "00000000-0000-0000-0000-000000000000";

  const params = await searchParams;
  const activeTab = params.tab || "all";

  // Build query based on active tab
  let query = supabase.from("note_templates").select("*");

  if (activeTab === "system") {
    query = query.eq("is_system", true);
  } else if (activeTab === "custom") {
    query = query.eq("user_id", demoUserId).eq("is_system", false);
  } else {
    // "all" tab - show both system and user's custom templates
    query = query.or(`is_system.eq.true,user_id.eq.${demoUserId}`);
  }

  const { data: templates } = await query.order("is_system", {
    ascending: false,
  }).order("name");

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-medical-text">
          Note Templates
        </h1>
        <Link href="/templates/new/edit">
          <Button>Create Template</Button>
        </Link>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 border-b border-medical-border">
        {TABS.map((tab) => {
          const href =
            tab.id === "all"
              ? "/templates"
              : `/templates?tab=${tab.id}`;
          const isActive = activeTab === tab.id;

          return (
            <Link
              key={tab.id}
              href={href}
              className={`px-4 py-2.5 text-sm font-medium transition ${
                isActive
                  ? "border-b-2 border-brand-600 text-brand-600"
                  : "text-medical-muted hover:text-medical-text"
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>

      {/* Templates Grid */}
      {templates && templates.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {templates.map((template: any) => (
            <Link
              key={template.id}
              href={`/templates/${template.id}/edit`}
              className="group"
            >
              <Card className="h-full transition group-hover:shadow-md">
                <CardContent className="flex flex-col gap-4 pt-6">
                  {/* Header with title and badge */}
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-medical-text group-hover:text-brand-600">
                      {template.name}
                    </h3>
                    {template.is_system && (
                      <span className="flex-shrink-0 rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-600">
                        System
                      </span>
                    )}
                  </div>

                  {/* Description */}
                  <p className="text-sm text-medical-muted line-clamp-2">
                    {template.description || "No description"}
                  </p>

                  {/* Footer info */}
                  <div className="flex items-center gap-3 text-xs text-medical-muted pt-2">
                    <span>{template.specialty || "General"}</span>
                    <span className="text-gray-300">&middot;</span>
                    <span>
                      {template.sections?.length ?? 0}{" "}
                      {template.sections?.length === 1
                        ? "section"
                        : "sections"}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <div className="flex items-center justify-center rounded-xl border border-medical-border bg-white py-12">
          <div className="text-center">
            <p className="text-medical-muted mb-4">
              {activeTab === "custom"
                ? "You haven't created any custom templates yet."
                : "No templates available."}
            </p>
            <Link href="/templates/new/edit">
              <Button variant="secondary">Create Your First Template</Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
