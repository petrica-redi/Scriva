"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
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

export default function TemplateEditorPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const supabase = createClient();
  const { toast } = useToast();
  const isNew = params?.id === "new";

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [specialty, setSpecialty] = useState("general");
  const [sections, setSections] = useState<TemplateSection[]>([]);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [isSystem, setIsSystem] = useState(false);

  // Load template if editing
  useEffect(() => {
    if (isNew) return;

    const loadTemplate = async () => {
      const { data, error } = await supabase
        .from("note_templates")
        .select("*")
        .eq("id", params?.id)
        .single();

      if (error || !data) {
        toast("Template not found", "error");
        router.push("/templates");
        return;
      }

      setName(data.name);
      setDescription(data.description || "");
      setSpecialty(data.specialty || "general");
      setSections(data.sections || []);
      setIsSystem(data.is_system);
      setLoading(false);
    };

    loadTemplate();
  }, [params?.id, isNew, supabase, router, toast]);

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
    // Re-order
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
      toast("Template name is required", "error");
      return;
    }
    if (sections.length === 0) {
      toast("Add at least one section", "error");
      return;
    }

    setSaving(true);

    try {
      const templateData = {
        name: name.trim(),
        description: description.trim() || null,
        specialty,
        sections,
        is_published: false,
      };

      if (isNew) {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        const { error } = await supabase.from("note_templates").insert({
          ...templateData,
          user_id: user?.id,
          is_system: false,
        });

        if (error) throw error;
        toast("Template created", "success");
      } else {
        const { error } = await supabase
          .from("note_templates")
          .update(templateData)
          .eq("id", params?.id);

        if (error) throw error;
        toast("Template saved", "success");
      }

      router.push("/templates");
    } catch (err) {
      toast("Failed to save template", "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-brand-600" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-medical-text">
          {isNew ? "Create Template" : "Edit Template"}
        </h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.push("/templates")}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || isSystem}>
            {saving ? "Saving..." : "Save Template"}
          </Button>
        </div>
      </div>

      {isSystem && (
        <div className="rounded-lg bg-amber-50 p-4 text-sm text-amber-700">
          System templates cannot be edited. Duplicate this template to create your own version.
        </div>
      )}

      {/* Template Info */}
      <Card>
        <CardHeader>
          <CardTitle>Template Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            id="name"
            label="Template Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., SOAP Note"
            disabled={isSystem}
          />
          <div className="space-y-1">
            <label htmlFor="description" className="block text-sm font-medium text-medical-text">
              Description
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this template for?"
              disabled={isSystem}
              rows={2}
              className="block w-full rounded-lg border border-medical-border px-4 py-3 text-medical-text focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 disabled:bg-gray-50"
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
              disabled={isSystem}
              className="block w-full rounded-lg border border-medical-border px-4 py-3 text-medical-text focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 disabled:bg-gray-50"
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
          {!isSystem && (
            <Button size="sm" onClick={addSection}>
              Add Section
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {sections.length === 0 ? (
            <p className="py-8 text-center text-sm text-medical-muted">
              No sections yet. Click &ldquo;Add Section&rdquo; to get started.
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
                  {!isSystem && (
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
                  )}
                </div>

                <Input
                  value={section.title}
                  onChange={(e) => updateSection(index, "title", e.target.value)}
                  placeholder="Section title (e.g., Subjective)"
                  disabled={isSystem}
                />

                <div className="space-y-1">
                  <label className="block text-xs font-medium text-medical-muted">
                    AI Prompt Instruction
                  </label>
                  <textarea
                    value={section.prompt}
                    onChange={(e) => updateSection(index, "prompt", e.target.value)}
                    placeholder="What should the AI write in this section?"
                    disabled={isSystem}
                    rows={2}
                    className="block w-full rounded-lg border border-medical-border px-3 py-2 text-sm text-medical-text focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 disabled:bg-gray-100"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-medium text-medical-muted">
                    Example Content
                  </label>
                  <textarea
                    value={section.example}
                    onChange={(e) => updateSection(index, "example", e.target.value)}
                    placeholder="Example of what this section should look like"
                    disabled={isSystem}
                    rows={2}
                    className="block w-full rounded-lg border border-medical-border px-3 py-2 text-sm text-medical-text focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 disabled:bg-gray-100"
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
