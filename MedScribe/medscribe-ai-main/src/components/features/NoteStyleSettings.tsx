"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Wand2, Save } from "lucide-react";

interface NoteStylePreferences {
  verbosity: "concise" | "moderate" | "detailed";
  format_preference: "bullet_points" | "prose" | "mixed";
  include_social_history: boolean;
  include_family_history: boolean;
  assessment_style: "numbered_list" | "narrative" | "problem_based";
  custom_instructions: string;
}

export function NoteStyleSettings() {
  const [prefs, setPrefs] = useState<NoteStylePreferences>({
    verbosity: "moderate",
    format_preference: "mixed",
    include_social_history: true,
    include_family_history: true,
    assessment_style: "numbered_list",
    custom_instructions: "",
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/note-style")
      .then((r) => r.ok ? r.json() : null)
      .then((data) => { if (data?.preferences && Object.keys(data.preferences).length > 0) setPrefs({ ...prefs, ...data.preferences }); })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const save = async () => {
    setSaving(true);
    await fetch("/api/note-style", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ preferences: prefs }),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Wand2 className="w-4 h-4 text-brand-600" />
          Note Style Preferences
        </CardTitle>
        <p className="text-xs text-medical-muted">Customize how AI generates your clinical notes to match your personal writing style.</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="text-sm font-medium text-medical-text">Verbosity Level</label>
          <div className="flex gap-2 mt-1">
            {(["concise", "moderate", "detailed"] as const).map((v) => (
              <button key={v} className={`px-3 py-1.5 text-sm rounded-md border transition-colors ${prefs.verbosity === v ? "bg-brand-50 border-brand-300 text-brand-700" : "border-medical-border text-medical-muted hover:bg-gray-50"}`} onClick={() => setPrefs({ ...prefs, verbosity: v })}>
                {v.charAt(0).toUpperCase() + v.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-medical-text">Format Preference</label>
          <div className="flex gap-2 mt-1">
            {([["bullet_points", "Bullet Points"], ["prose", "Prose"], ["mixed", "Mixed"]] as const).map(([value, label]) => (
              <button key={value} className={`px-3 py-1.5 text-sm rounded-md border transition-colors ${prefs.format_preference === value ? "bg-brand-50 border-brand-300 text-brand-700" : "border-medical-border text-medical-muted hover:bg-gray-50"}`} onClick={() => setPrefs({ ...prefs, format_preference: value })}>
                {label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-medical-text">Assessment Style</label>
          <div className="flex gap-2 mt-1">
            {([["numbered_list", "Numbered List"], ["narrative", "Narrative"], ["problem_based", "Problem-Based"]] as const).map(([value, label]) => (
              <button key={value} className={`px-3 py-1.5 text-sm rounded-md border transition-colors ${prefs.assessment_style === value ? "bg-brand-50 border-brand-300 text-brand-700" : "border-medical-border text-medical-muted hover:bg-gray-50"}`} onClick={() => setPrefs({ ...prefs, assessment_style: value })}>
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={prefs.include_social_history} onChange={(e) => setPrefs({ ...prefs, include_social_history: e.target.checked })} className="rounded border-medical-border" />
            <span className="text-sm text-medical-text">Include Social History</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={prefs.include_family_history} onChange={(e) => setPrefs({ ...prefs, include_family_history: e.target.checked })} className="rounded border-medical-border" />
            <span className="text-sm text-medical-text">Include Family History</span>
          </label>
        </div>

        <div>
          <label className="text-sm font-medium text-medical-text">Custom Instructions</label>
          <textarea className="w-full mt-1 p-2 border border-medical-border rounded-md text-sm resize-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500" rows={3} placeholder="e.g., Always use metric units. Include differential confidence percentages. Format medications with brand names in parentheses..." value={prefs.custom_instructions} onChange={(e) => setPrefs({ ...prefs, custom_instructions: e.target.value })} />
        </div>

        <Button onClick={save} disabled={saving} className="w-full">
          <Save className="w-4 h-4 mr-2" />
          {saving ? "Saving..." : saved ? "Saved!" : "Save Style Preferences"}
        </Button>
      </CardContent>
    </Card>
  );
}
