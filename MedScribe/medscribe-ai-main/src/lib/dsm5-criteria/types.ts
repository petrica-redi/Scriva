/**
 * Types for DSM-5 / ICD-10 criteria engine.
 * Used for live mapping: LLM extraction + deterministic rules validation.
 */

export type CriterionType =
  | "symptom"
  | "checklist"
  | "temporal"
  | "functional_impact"
  | "exclusion";

export interface CriterionItemDef {
  description: string;
}

export interface CriterionDef {
  id: string;
  description: string;
  type: CriterionType;
  required?: boolean;
  minimum_required?: number;
  minimum_duration_months?: number;
  items?: Record<string, CriterionItemDef>;
  exclusions_to_check?: string[];
}

export interface DisorderCriteriaDef {
  code: string;
  name: string;
  coding_system: string;
  dsm5_equivalent?: string;
  criteria: Record<string, CriterionDef>;
  differential_diagnoses: string[];
  recommended_investigations?: string[];
}

/** Per-criterion evaluation returned by LLM extraction */
export interface CriterionEvaluation {
  met: boolean | null;
  evidence?: string | null;
  confidence?: "high" | "medium" | "low";
  follow_up_needed?: string | null;
  reported_duration_months?: number | null;
  /** For checklist: evaluation per item (e.g. C1, C2, ...) */
  items?: Record<string, { met: boolean | null; evidence?: string | null }>;
}

/** Full evaluation for one disorder */
export interface CriteriaEvaluationResult {
  diagnosis_code: string;
  diagnosis_name: string;
  criteria: Record<string, CriterionEvaluation>;
  suggested_questions?: string[];
}

/** Alert from rules engine (deterministic validation) */
export interface CriteriaAlert {
  type: "CRITERIA_NOT_MET" | "INSUFFICIENT_CRITERIA" | "DURATION_NOT_MET";
  severity: "high" | "medium" | "low";
  message: string;
  suggestion?: string;
  criterion_id?: string;
}
