"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useI18n } from "@/lib/i18n/i18n-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import type { TemplateSection } from "@/types";

const SPECIALTIES = [
  "general",
  "cardiology",
  "dermatology",
  "emergency",
  "endocrinology",
  "gastroenterology",
  "internal-medicine",
  "neurology",
  "ob-gyn",
  "oncology",
  "orthopedics",
  "pediatrics",
  "psychiatry",
  "pulmonology",
  "surgery",
  "urology",
  "specialist",
];

export default function NewTemplatePage() {
  const router = useRouter();
  const { t } = useI18n();
  const supabase = useMemo(() => createClient(), []);
  const { toast } = useToast();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [specialty, setSpecialty] = useState("general");
  const [sections, setSections] = useState<TemplateSection[]>([]);
  const [saving, setSaving] = useState(false);

  const addSection = () => {
    const newSection: TemplateSection = {
      id: crypto.randomUUID(),
      title: "",
      prompt: "",
      example: "",
      order: sections.length + 1,
    };
    setSections([...sections, newSection]);
  };

  const updateSection = (index: number, field: keyof TemplateSection, value: string | number) => {
    const updated = [...sections];
    updated[index] = { ...updated[index], [field]: value };
    setSections(updated);
  };

  const removeSection = (index: number) => {
    const updated = sections.filter((_, i) => i !== index);
    setSections(updated.map((s, i) => ({ ...s, order: i + 1 })));
  };

  const moveSection = (index: number, direction: "up" | "down") => {
    if (
      (direction === "up" && index === 0) ||
      (direction === "down" && index === sections.length - 1)
    )
      return;

    const updated = [...sections];
    const swapIndex = direction === "up" ? index - 1 : index + 1;
    [updated[index], updated[swapIndex]] = [updated[swapIndex], updated[index]];
    setSections(updated.map((s, i) => ({ ...s, order: i + 1 })));
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast(t("templates.nameRequired"), "error");
      return;
    }
    if (sections.length === 0) {
      toast(t("templates.addOneSection"), "error");
      return;
    }

    setSaving(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { error } = await supabase.from("note_templates").insert({
        name: name.trim(),
        description: description.trim() || null,
        specialty,
        sections,
        is_published: false,
        user_id: user?.id,
        is_system: false,
      });

      if (error) throw error;
      toast(t("templates.created"), "success");
      router.push("/templates");
    } catch (err) {
      toast(t("templates.saveFailed"), "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-medical-text">
          {t("templates.createTemplate")}
        </h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.push("/templates")}>
            {t("common.cancel")}
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? t("templates.saving") : t("templates.saveTemplate")}
          </Button>
        </div>
      </div>

      {/* Template Info */}
      <Card>
        <CardHeader>
          <CardTitle>{t("templates.templateDetails")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            id="name"
            label={t("templates.templateName")}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., SOAP Note"
          />
          <div className="space-y-1">
            <label htmlFor="description" className="block text-sm font-medium text-medical-text">
              {t("templates.description")}
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this template for?"
              rows={2}
              className="block w-full rounded-lg border border-medical-border px-4 py-3 text-medical-text focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="specialty" className="block text-sm font-medium text-medical-text">
              Specialty
            </label>
            <select
              id="specialty"
              value={specialty}
              onChange={(e) => setSpecialty(e.target.value)}
              className="block w-full rounded-lg border border-medical-border px-4 py-3 text-medical-text focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            >
              {SPECIALTIES.map((s) => (
                <option key={s} value={s}>
                  {s.charAt(0).toUpperCase() + s.slice(1).replace("-", " ")}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Sections */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Sections ({sections.length})</CardTitle>
          <Button size="sm" onClick={addSection}>
            {t("templates.addSection")}
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {sections.length === 0 ? (
            <p className="py-8 text-center text-sm text-medical-muted">
              {t("templates.noSections")}
            </p>
          ) : (
            sections.map((section, index) => (
              <div
                key={section.id}
                className="rounded-lg border border-medical-border bg-gray-50 p-4 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-medical-muted">
                    Section {index + 1}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => moveSection(index, "up")}
                      disabled={index === 0}
                      className="rounded p-1 text-medical-muted hover:bg-white disabled:opacity-30"
                      title="Move up"
                    >
                      &#8593;
                    </button>
                    <button
                      onClick={() => moveSection(index, "down")}
                      disabled={index === sections.length - 1}
                      className="rounded p-1 text-medical-muted hover:bg-white disabled:opacity-30"
                      title="Move down"
                    >
                      &#8595;
                    </button>
                    <button
                      onClick={() => removeSection(index)}
                      className="rounded p-1 text-red-500 hover:bg-red-50"
                      title="Remove section"
                    >
                      &#10005;
                    </button>
                  </div>
                </div>

                <Input
                  value={section.title}
                  onChange={(e) => updateSection(index, "title", e.target.value)}
                  placeholder="Section title (e.g., Subjective)"
                />

                <div className="space-y-1">
                  <label className="block text-xs font-medium text-medical-muted">
                    {t("templates.aiPrompt")}
                  </label>
                  <textarea
                    value={section.prompt}
                    onChange={(e) => updateSection(index, "prompt", e.target.value)}
                    placeholder="What should the AI write in this section?"
                    rows={2}
                    className="block w-full rounded-lg border border-medical-border px-3 py-2 text-sm text-medical-text focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-medium text-medical-muted">
                    {t("templates.exampleContent")}
                  </label>
                  <textarea
                    value={section.example}
                    onChange={(e) => updateSection(index, "example", e.target.value)}
                    placeholder="Example of what this section should look like"
                    rows={2}
                    className="block w-full rounded-lg border border-medical-border px-3 py-2 text-sm text-medical-text focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                  />
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
