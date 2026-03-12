"use client";

import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ClipboardList, Search, ChevronDown, ChevronUp, AlertTriangle } from "lucide-react";
import { SUPPORTED_CRITERIA_CODES } from "@/lib/dsm5-criteria";

const DIAGNOSIS_LABELS: Record<string, string> = {
  "F41.1": "GAD (F41.1)",
};

interface CriteriaTrackerProps {
  transcript: string;
  diagnosisCode?: string;
}

interface CriterionEvaluation {
  met: boolean | null;
  evidence?: string | null;
  confidence?: string;
  follow_up_needed?: string | null;
  items?: Record<string, { met: boolean | null; evidence?: string | null }>;
}

interface EvaluateResult {
  diagnosis_code: string;
  diagnosis_name: string;
  criteria: Record<string, CriterionEvaluation>;
  suggested_questions: string[];
  alerts?: Array<{ criterion_id: string; severity: string; message: string }>;
}

export function CriteriaTracker({ transcript, diagnosisCode = "F41.1" }: CriteriaTrackerProps) {
  const [result, setResult] = useState<EvaluateResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCode, setSelectedCode] = useState(diagnosisCode);
  const [expandedCriterion, setExpandedCriterion] = useState<string | null>(null);

  const runEvaluation = useCallback(async () => {
    if (!transcript.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/ai/evaluate-criteria", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcript,
          diagnosis_code: selectedCode,
        }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Evaluation failed");
      }
      const data = await response.json();
      setResult(data);
      if (Object.keys(data.criteria || {}).length > 0) {
        setExpandedCriterion(Object.keys(data.criteria)[0]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Evaluation failed");
    } finally {
      setLoading(false);
    }
  }, [transcript, selectedCode]);

  const metCount = result
    ? Object.values(result.criteria || {}).filter((c) => c.met === true).length
    : 0;
  const totalCount = result ? Object.keys(result.criteria || {}).length : 0;

  if (!result && !loading) {
    return (
      <Card className="border-brand-200 bg-brand-50/30">
        <CardContent className="p-4">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-brand-600" />
              <span className="text-sm font-medium text-medical-text">Criteria Tracker</span>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={selectedCode}
                onChange={(e) => setSelectedCode(e.target.value)}
                className="rounded border border-medical-border px-2 py-1 text-xs text-medical-text bg-white"
              >
                {SUPPORTED_CRITERIA_CODES.map((code) => (
                  <option key={code} value={code}>
                    {DIAGNOSIS_LABELS[code] ?? code}
                  </option>
                ))}
              </select>
              <Button size="sm" onClick={runEvaluation} disabled={!transcript.trim()}>
                <Search className="w-4 h-4 mr-1" /> Evaluate
              </Button>
            </div>
          </div>
          <p className="text-xs text-medical-muted mt-1">
            Check DSM-5 criteria against transcript (e.g. GAD duration, symptom count).
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
            <span className="text-sm text-medical-muted">Evaluating criteria...</span>
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
          <Button size="sm" variant="outline" onClick={runEvaluation} className="mt-2">
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-brand-200">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-brand-600" />
            Criteria: {result?.diagnosis_name} ({result?.diagnosis_code})
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">
              {metCount}/{totalCount} met
            </Badge>
            <Button size="sm" variant="ghost" onClick={runEvaluation}>
              <Search className="w-3 h-3 mr-1" /> Re-evaluate
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 pt-0">
        {result?.alerts && result.alerts.length > 0 && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-2 space-y-1">
            {result.alerts.map((a, i) => (
              <div key={i} className="flex items-start gap-2 text-xs">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                <span className="text-amber-800">{a.message}</span>
              </div>
            ))}
          </div>
        )}
        {result?.criteria &&
          Object.entries(result.criteria).map(([key, c]) => (
            <div key={key} className="border border-medical-border rounded-lg overflow-hidden">
              <button
                className="w-full flex items-center justify-between p-2.5 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left"
                onClick={() => setExpandedCriterion(expandedCriterion === key ? null : key)}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-medium ${
                      c.met === true
                        ? "bg-green-100 text-green-700"
                        : c.met === false
                          ? "bg-red-100 text-red-700"
                          : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {c.met === true ? "✓" : c.met === false ? "✗" : "?"}
                  </span>
                  <span className="text-sm font-medium text-medical-text">Criterion {key}</span>
                </div>
                {expandedCriterion === key ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </button>
              {expandedCriterion === key && (
                <div className="border-t border-medical-border p-2.5 space-y-1.5 text-xs text-medical-muted">
                  {c.evidence && (
                    <p>
                      <span className="font-medium text-medical-text">Evidence:</span> {c.evidence}
                    </p>
                  )}
                  {c.follow_up_needed && (
                    <p className="text-brand-600">Follow-up: {c.follow_up_needed}</p>
                  )}
                </div>
              )}
            </div>
          ))}
        {result?.suggested_questions && result.suggested_questions.length > 0 && (
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-2.5">
            <p className="text-xs font-medium text-blue-800 mb-1.5">Suggested questions</p>
            <ul className="list-disc list-inside space-y-0.5 text-xs text-blue-700">
              {result.suggested_questions.slice(0, 5).map((q, i) => (
                <li key={i}>{q}</li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
