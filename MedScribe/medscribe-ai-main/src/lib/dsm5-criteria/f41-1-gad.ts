import type { DisorderCriteriaDef } from "./types";

/** F41.1 Generalized Anxiety Disorder (DSM-5 300.02) */
export const F41_1_GAD: DisorderCriteriaDef = {
  code: "F41.1",
  name: "Generalized Anxiety Disorder",
  coding_system: "ICD-10",
  dsm5_equivalent: "300.02",
  criteria: {
    A: {
      id: "A",
      description: "Excessive anxiety and worry about multiple events/activities",
      type: "symptom",
      required: true,
    },
    B: {
      id: "B",
      description: "Difficulty controlling the worry",
      type: "symptom",
      required: true,
    },
    C: {
      id: "C",
      description: "3+ of the following symptoms",
      type: "checklist",
      minimum_required: 3,
      items: {
        C1: { description: "Restlessness or feeling on edge" },
        C2: { description: "Being easily fatigued" },
        C3: { description: "Difficulty concentrating or mind going blank" },
        C4: { description: "Irritability" },
        C5: { description: "Muscle tension" },
        C6: { description: "Sleep disturbance" },
      },
    },
    D: {
      id: "D",
      description: "Duration ≥ 6 months",
      type: "temporal",
      minimum_duration_months: 6,
    },
    E: {
      id: "E",
      description: "Causes clinically significant distress or impairment",
      type: "functional_impact",
      required: true,
    },
    F: {
      id: "F",
      description:
        "Not attributable to substance use, medical condition, or another mental disorder",
      type: "exclusion",
      required: true,
      exclusions_to_check: [
        "thyroid_disorder",
        "substance_use",
        "medication_side_effect",
        "another_anxiety_disorder",
      ],
    },
  },
  differential_diagnoses: ["F41.0", "F41.3", "F32.0", "F43.1"],
  recommended_investigations: ["TSH", "B1", "B6", "B12", "CBC", "metabolic_panel"],
};
