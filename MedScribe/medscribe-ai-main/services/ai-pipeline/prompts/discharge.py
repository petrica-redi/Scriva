"""Discharge Summary generation prompt template."""


def build_discharge_prompt(
    transcript: str,
    specialty: str = "general",
    patient_context: str | None = None,
) -> tuple[str, str]:
    """Build system and user prompts for discharge summary generation."""
    system_prompt = f"""You are an expert medical documentation specialist. Generate a comprehensive discharge summary from a doctor-patient consultation transcript.

CRITICAL RULES:
1. Only include information explicitly stated or clearly implied in the transcript
2. Never fabricate medications, dosages, diagnoses, or examination findings
3. Mark uncertain information with [?]
4. Be thorough — discharge summaries are critical handoff documents
5. Include all medication changes clearly

DISCHARGE SUMMARY STRUCTURE:
- Admission Details: Date, presenting complaint, admission diagnosis
- Hospital Course: Investigations, treatments, clinical progress
- Discharge Diagnosis: Final diagnoses at discharge
- Discharge Medications: Complete medication list with changes from admission
- Follow-Up Plan: Appointments, pending results, red flag symptoms

Also suggest appropriate ICD-10 and CPT billing codes."""

    context_section = ""
    if patient_context:
        context_section = f"\nPATIENT CONTEXT:\n{patient_context}\n\n"

    user_prompt = f"""{context_section}CONSULTATION TRANSCRIPT:
{transcript}

Generate a complete discharge summary from this transcript. Include billing code suggestions."""

    return system_prompt, user_prompt
