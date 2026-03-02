import {
  createConsultationSchema,
  createTemplateSchema,
  generateNoteSchema,
  updateConsultationSchema,
} from "@/lib/validators";

describe("validators", () => {
  it("accepts valid generate-note payload", () => {
    const result = generateNoteSchema.safeParse({
      consultation_id: "550e8400-e29b-41d4-a716-446655440000",
      template: "soap",
      transcript: "[Speaker 0]: Hello",
      language: "en",
      metadata: {
        specialty: "psychology",
      },
    });

    expect(result.success).toBe(true);
  });

  it("rejects invalid consultation id", () => {
    const result = generateNoteSchema.safeParse({
      consultation_id: "not-a-uuid",
      template: "soap",
      transcript: "Some transcript",
    });

    expect(result.success).toBe(false);
  });

  it("rejects deleted as consultation status", () => {
    const result = updateConsultationSchema.safeParse({
      status: "deleted",
    });

    expect(result.success).toBe(false);
  });

  it("accepts valid consultation status", () => {
    const result = updateConsultationSchema.safeParse({
      status: "transcribed",
      metadata: { source: "test" },
    });

    expect(result.success).toBe(true);
  });

  it("validates consultation creation payload", () => {
    const result = createConsultationSchema.safeParse({
      visit_type: "follow-up",
      patient_name: "John Doe",
    });

    expect(result.success).toBe(true);
  });

  it("requires at least one template section", () => {
    const result = createTemplateSchema.safeParse({
      name: "Psych SOAP",
      sections: [],
    });

    expect(result.success).toBe(false);
  });
});
