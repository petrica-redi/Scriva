"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/lib/i18n/context";

interface Template {
  id: string;
  name: string;
  is_system: boolean;
  description: string | null;
  specialty: string | null;
  updated_at: string;
  sections?: unknown[];
}

interface TemplatesViewProps {
  templates: Template[];
  activeTab: string;
}

export function TemplatesView({ templates, activeTab }: TemplatesViewProps) {
  const { t } = useTranslation();

  const tabs = [
    { id: "all", label: t("templates.allTemplates") },
    { id: "system", label: t("templates.system") },
    { id: "custom", label: t("templates.myTemplates") },
  ];

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-medical-text">
          {t("templates.title")}
        </h1>
        <Link href="/templates/new/edit">
          <Button>{t("templates.create")}</Button>
        </Link>
      </div>

      <div className="flex gap-1 border-b border-medical-border">
        {tabs.map((tab) => {
          const href = tab.id === "all" ? "/templates" : `/templates?tab=${tab.id}`;
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

      {templates && templates.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => (
            <Link
              key={template.id}
              href={`/templates/${template.id}/edit`}
              className="group"
            >
              <Card className="h-full transition group-hover:shadow-md">
                <CardContent className="flex flex-col gap-4 pt-6">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-medical-text group-hover:text-brand-600">
                      {template.name}
                    </h3>
                    {template.is_system && (
                      <span className="flex-shrink-0 rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-600">
                        {t("templates.system")}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-medical-muted line-clamp-2">
                    {template.description || t("templates.noDescription")}
                  </p>
                  <div className="flex items-center gap-3 text-xs text-medical-muted pt-2">
                    <span>{template.specialty || t("templates.general")}</span>
                    <span className="text-gray-300">&middot;</span>
                    <span>
                      {template.sections?.length ?? 0}{" "}
                      {template.sections?.length === 1
                        ? t("templates.section")
                        : t("templates.sections")}
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
                ? t("templates.noCustom")
                : t("templates.noAvailable")}
            </p>
            <Link href="/templates/new/edit">
              <Button variant="secondary">{t("templates.createFirst")}</Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
