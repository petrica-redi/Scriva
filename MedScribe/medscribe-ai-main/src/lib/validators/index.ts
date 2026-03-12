import { z } from "zod";

// Consultation Validators

export const createConsultationSchema = z.object({
  visit_type: z.string().min(1, "Visit type is required"),
  patient_name: z.string().optional(),
  notes: z.string().optional(),
});

export type CreateConsultationInput = z.infer<
  typeof createConsultationSchema
>;

export const updateConsultationSchema = z.object({
  status: z
    .enum([
      "scheduled",
      "recording",
      "transcribed",
      "note_generated",
      "reviewed",
      "finalized",
    ])
    .optional(),
  metadata: z.record(z.unknown()).optional(),
});

export type UpdateConsultationInput = z.infer<
  typeof updateConsultationSchema
>;

// Clinical Note Validators

const ALLOWED_TEMPLATES = [
  "SOAP Note",
  "Referral Letter",
  "Discharge Summary",
  "Progress Note",
  "Patient Handout",
  "Specialist Consultation",
] as const;

export const generateNoteSchema = z.object({
  consultation_id: z.string().uuid("Invalid consultation ID"),
  template: z.enum(ALLOWED_TEMPLATES, {
    errorMap: () => ({ message: "Invalid template type" }),
  }),
  transcript: z
    .string()
    .min(1, "Transcript is required")
    .max(500_000, "Transcript exceeds maximum length"),
  language: z.string().max(10).optional(),
  metadata: z
    .object({
      specialty: z.string().max(100).optional(),
      patient_name: z.string().max(200).optional(),
      visit_type: z.string().max(100).optional(),
    })
    .optional(),
});

export type GenerateNoteInput = z.infer<typeof generateNoteSchema>;

// Template Validators

export const createTemplateSchema = z.object({
  name: z.string().min(1, "Template name is required").max(255),
  description: z.string().max(500).optional(),
  specialty: z.string().optional(),
  sections: z
    .array(
      z.object({
        title: z.string().min(1, "Section title is required"),
        prompt: z.string().min(1, "Section prompt is required"),
        example: z.string().optional(),
        order: z.number().min(0),
      })
    )
    .min(1, "At least one section is required"),
});

export type CreateTemplateInput = z.infer<typeof createTemplateSchema>;

// Follow-ups POST
export const followUpsPostSchema = z.object({
  patient_id: z.string().uuid("Invalid patient ID"),
  consultation_id: z.string().uuid().optional(),
  type: z.string().min(1, "Type is required").max(100),
  title: z.string().min(1, "Title is required").max(500),
  description: z.string().max(2000).optional(),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "due_date must be YYYY-MM-DD"),
  priority: z.enum(["low", "medium", "high"]).optional(),
});
export type FollowUpsPostInput = z.infer<typeof followUpsPostSchema>;

// Visit summaries POST
export const visitSummariesPostSchema = z.object({
  consultation_id: z.string().uuid("Invalid consultation ID"),
  patient_id: z.string().uuid("Invalid patient ID"),
  clinical_note_sections: z
    .array(z.object({ title: z.string(), content: z.string() }))
    .optional(),
});
export type VisitSummariesPostInput = z.infer<typeof visitSummariesPostSchema>;
