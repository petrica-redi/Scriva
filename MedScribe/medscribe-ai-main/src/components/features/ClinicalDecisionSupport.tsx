"use client";

import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Shield, BookOpen, Search, X, ChevronDown, ChevronUp } from "lucide-react";

interface CDSProps {
  consultationId?: string;
  patientId?: string;
  transcript?: string;
  medications?: string[];
  patientHistory?: string;
  onAlertDismiss?: (alertId: string) => void;
}

interface CDSResult {
  differentials: Array<{ diagnosis: string; icd10: string; confidence: number; reasoning: string }>;
  drug_interactions: Array<{ drugs: string[]; severity: string; description: string; recommendation: string }>;
  guideline_nudges: Array<{ guideline: string; source: string; relevance: string }>;
  red_flags: Array<{ finding: string; urgency: string; recommended_action: string }>;
  missing_screenings: Array<{ screening: string; reason: string; guideline_source: string }>;
}

const severityColors: Record<string, string> = {
  critical: "bg-red-100 text-red-800 border-red-200",
  major: "bg-orange-100 text-orange-800 border-orange-200",
  high: "bg-orange-100 text-orange-800 border-orange-200",
  moderate: "bg-yellow-100 text-yellow-800 border-yellow-200",
  medium: "bg-yellow-100 text-yellow-800 border-yellow-200",
  minor: "bg-blue-100 text-blue-800 border-blue-200",
  low: "bg-blue-100 text-blue-800 border-blue-200",
  info: "bg-gray-100 text-gray-800 border-gray-200",
};

export function ClinicalDecisionSupport({ consultationId, patientId, transcript, medications, patientHistory, onAlertDismiss }: CDSProps) {
  const [result, setResult] = useState<CDSResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedSection, setExpandedSection] = useState<string | null>("red_flags");

  const runAnalysis = useCallback(async () => {
    if (!transcript) return;
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/ai/clinical-decision-support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcript,
          medications: medications || [],
          patient_history: patientHistory || "",
          consultation_id: consultationId,
          patient_id: patientId,
        }),
      });

      if (!response.ok) throw new Error("Analysis failed");
      const data = await response.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setLoading(false);
    }
  }, [transcript, medications, patientHistory, consultationId, patientId]);

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  if (!result && !loading) {
    return (
      <Card className="border-brand-200 bg-brand-50/30">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-brand-600" />
              <span className="text-sm font-medium text-medical-text">Clinical Decision Support</span>
            </div>
            <Button size="sm" onClick={runAnalysis} disabled={!transcript}>
              <Search className="w-4 h-4 mr-1" /> Analyze
            </Button>
          </div>
          <p className="text-xs text-medical-muted mt-1">
            Powered by Scriva for drug interactions, differential diagnoses, and clinical guidelines.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card className="border-brand-200">
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-brand-600" />
            <span className="text-sm text-medical-muted">Analyzing consultation...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-red-200">
        <CardContent className="p-4">
          <p className="text-sm text-red-600">{error}</p>
          <Button size="sm" variant="outline" onClick={runAnalysis} className="mt-2">Retry</Button>
        </CardContent>
      </Card>
    );
  }

  const sections = [
    {
      key: "red_flags",
      title: "Red Flags",
      icon: AlertTriangle,
      items: result?.red_flags || [],
      iconColor: "text-red-500",
      renderItem: (item: Record<string, unknown>) => (
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-sm font-medium text-medical-text">{item.finding as string}</p>
            <p className="text-xs text-medical-muted mt-0.5">{item.recommended_action as string}</p>
          </div>
          <Badge className={severityColors[item.urgency as string] || severityColors.info}>{item.urgency as string}</Badge>
        </div>
      ),
    },
    {
      key: "drug_interactions",
      title: "Drug Interactions",
      icon: Shield,
      items: result?.drug_interactions || [],
      iconColor: "text-orange-500",
      renderItem: (item: Record<string, unknown>) => (
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-sm font-medium text-medical-text">{(item.drugs as string[])?.join(" + ")}</p>
            <p className="text-xs text-medical-muted mt-0.5">{item.description as string}</p>
            {item.recommendation ? <p className="text-xs text-brand-600 mt-0.5">{item.recommendation as string}</p> : null}
          </div>
          <Badge className={severityColors[item.severity as string] || severityColors.info}>{item.severity as string}</Badge>
        </div>
      ),
    },
    {
      key: "differentials",
      title: "Differential Diagnoses",
      icon: Search,
      items: result?.differentials || [],
      iconColor: "text-blue-500",
      renderItem: (item: Record<string, unknown>) => (
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-sm font-medium text-medical-text">{item.diagnosis as string} <span className="text-xs text-medical-muted">({item.icd10 as string})</span></p>
            <p className="text-xs text-medical-muted mt-0.5">{item.reasoning as string}</p>
          </div>
          <span className="text-xs font-mono text-medical-muted whitespace-nowrap">{Math.round((item.confidence as number) * 100)}%</span>
        </div>
      ),
    },
    {
      key: "guideline_nudges",
      title: "Clinical Guidelines",
      icon: BookOpen,
      items: result?.guideline_nudges || [],
      iconColor: "text-green-500",
      renderItem: (item: Record<string, unknown>) => (
        <div>
          <p className="text-sm font-medium text-medical-text">{item.guideline as string}</p>
          <p className="text-xs text-medical-muted mt-0.5">{item.relevance as string}</p>
          {item.source ? <p className="text-xs text-brand-600 mt-0.5">Source: {item.source as string}</p> : null}
        </div>
      ),
    },
  ];

  return (
    <Card className="border-brand-200">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Shield className="w-4 h-4 text-brand-600" />
            Clinical Decision Support
          </CardTitle>
          <Button size="sm" variant="ghost" onClick={runAnalysis}>
            <Search className="w-3 h-3 mr-1" /> Re-analyze
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 pt-0">
        {sections.map(({ key, title, icon: Icon, items, iconColor, renderItem }) => (
          <div key={key} className="border border-medical-border rounded-lg overflow-hidden">
            <button
              className="w-full flex items-center justify-between p-2.5 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              onClick={() => toggleSection(key)}
            >
              <div className="flex items-center gap-2">
                <Icon className={`w-4 h-4 ${iconColor}`} />
                <span className="text-sm font-medium text-medical-text">{title}</span>
                {items.length > 0 && (
                  <Badge variant="secondary" className="text-xs">{items.length}</Badge>
                )}
              </div>
              {expandedSection === key ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            {expandedSection === key && (
              <div className="border-t border-medical-border p-2.5 space-y-2.5">
                {items.length === 0 ? (
                  <p className="text-xs text-medical-muted text-center py-2">No {title.toLowerCase()} detected</p>
                ) : (
                  items.map((item, i) => (
                    <div key={i} className="p-2 bg-gray-50 dark:bg-gray-800 rounded">
                      {renderItem(item as Record<string, unknown>)}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        ))}

        {result?.missing_screenings && result.missing_screenings.length > 0 && (
          <div className="p-2.5 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 rounded-lg">
            <p className="text-xs font-medium text-yellow-800 dark:text-yellow-200 mb-1">Missing Screenings</p>
            {result.missing_screenings.map((s, i) => (
              <p key={i} className="text-xs text-yellow-700 dark:text-yellow-300">{s.screening} - {s.reason}</p>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
