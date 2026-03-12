import type { DisorderCriteriaDef } from "./types";
import { F41_1_GAD } from "./f41-1-gad";

const registry: Record<string, DisorderCriteriaDef> = {
  "F41.1": F41_1_GAD,
  // F32.x, F41.0, F43.10, F42, F31.x, F20.x, F51.0, F90.x, F43.2 can be added
  // with the same structure (see docs/IMPLEMENTARE-COPILOT-PSIHIATRIC.md).
};

/** All supported diagnosis codes for criteria evaluation */
export const SUPPORTED_CRITERIA_CODES = Object.keys(registry);

/** Load criteria definition by ICD-10 code (e.g. "F41.1") */
export function loadCriteria(diagnosisCode: string): DisorderCriteriaDef | null {
  const normalized = diagnosisCode.trim().toUpperCase();
  return registry[normalized] ?? null;
}

export type {
  DisorderCriteriaDef,
  CriterionDef,
  CriterionEvaluation,
  CriteriaEvaluationResult,
  CriteriaAlert,
} from "./types";
export { F41_1_GAD } from "./f41-1-gad";
export { validateWithRules } from "./validate-rules";
export { registry as dsm5CriteriaRegistry };
