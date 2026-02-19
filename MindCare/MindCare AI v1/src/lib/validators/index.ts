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
      "deleted",
    ])
    .optional(),
  metadata: z.record(z.unknown()).optional(),
});

export type UpdateConsultationInput = z.infer<
  typeof updateConsultationSchema
>;

// Clinical Note Validators

export const generateNoteSchema = z.object({
  consultation_id: z.string().uuid("Invalid consultation ID"),
  template: z.string().min(1, "Template is required"),
  transcript: z.string().min(1, "Transcript is required"),
  language: z.string().optional(),
  metadata: z
    .object({
      specialty: z.string().optional(),
      patient_name: z.string().optional(),
      visit_type: z.string().optional(),
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
