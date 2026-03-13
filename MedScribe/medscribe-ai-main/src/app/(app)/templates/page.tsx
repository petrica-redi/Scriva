import { createClient } from "@/lib/supabase/server";
import { TemplatesView } from "@/components/templates/TemplatesView";

export const metadata = {
  title: "Note Templates - MedScribe",
  description: "Manage your clinical note templates",
};

interface TemplatesPageProps {
  searchParams: Promise<{ tab?: string }>;
}

export default async function TemplatesPage({
  searchParams,
}: TemplatesPageProps) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const params = await searchParams;
  const activeTab = params.tab || "all";

  let query = supabase.from("note_templates").select("*");

  if (activeTab === "system") {
    query = query.eq("is_system", true);
  } else if (activeTab === "custom") {
    query = query.eq("user_id", user.id).eq("is_system", false);
  } else {
    query = query.or(`is_system.eq.true,user_id.eq.${user.id}`);
  }

  const { data: templates } = await query.order("is_system", {
    ascending: false,
  }).order("name");

  return (
    <TemplatesView
      templates={(templates || []).map((t) => ({
        id: t.id,
        name: t.name,
        is_system: t.is_system,
        description: t.description,
        specialty: t.specialty,
        updated_at: t.updated_at,
        sections: t.sections as unknown[] | undefined,
      }))}
      activeTab={activeTab}
    />
  );
}
