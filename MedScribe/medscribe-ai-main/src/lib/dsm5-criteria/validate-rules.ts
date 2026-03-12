import type { DisorderCriteriaDef, CriterionEvaluation, CriteriaAlert } from "./types";

/**
 * Deterministic rules validation (no LLM).
 * Run after LLM extraction to produce alerts for temporal/checklist rules.
 */
export function validateWithRules(
  diagnosisCode: string,
  criteriaDef: DisorderCriteriaDef,
  evaluation: Record<string, CriterionEvaluation>
): CriteriaAlert[] {
  const alerts: CriteriaAlert[] = [];

  for (const [criterionId, criterion] of Object.entries(criteriaDef.criteria)) {
    const ev = evaluation[criterionId];
    if (!ev) continue;

    if (criterion.type === "temporal" && criterion.minimum_duration_months != null) {
      const reported = ev.reported_duration_months;
      const required = criterion.minimum_duration_months;
      if (reported != null && reported < required) {
        alerts.push({
          type: "DURATION_NOT_MET",
          severity: "high",
          criterion_id: criterionId,
          message: `${diagnosisCode} requires ≥${required} months. Patient reported ${reported} month(s). Criterion NOT met.`,
          suggestion:
            criteriaDef.differential_diagnoses.length > 0
              ? `Consider ${criteriaDef.differential_diagnoses[0]} as alternative if duration is shorter.`
              : undefined,
        });
      }
    }

    if (criterion.type === "checklist" && criterion.items && criterion.minimum_required != null) {
      const itemEvs = ev.items ?? {};
      let metCount = 0;
      const missing: string[] = [];
      for (const [itemKey, itemDef] of Object.entries(criterion.items)) {
        const itemVal = itemEvs[itemKey];
        if (itemVal?.met === true) metCount++;
        else missing.push(itemDef.description);
      }
      if (metCount < criterion.minimum_required) {
        alerts.push({
          type: "INSUFFICIENT_CRITERIA",
          severity: "medium",
          criterion_id: criterionId,
          message: `${metCount}/${criterion.minimum_required} criteria met. Missing or not documented: ${missing.slice(0, 4).join("; ")}${missing.length > 4 ? "…" : ""}`,
          suggestion: "Ask follow-up questions for the missing items above.",
        });
      }
    }
  }

  return alerts;
}
