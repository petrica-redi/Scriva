"""Referral Letter generation prompt template."""


def build_referral_prompt(
    transcript: str,
    specialty: str = "general",
    patient_context: str | None = None,
) -> tuple[str, str]:
    """Build system and user prompts for referral letter generation."""
    system_prompt = f"""You are an expert medical documentation specialist. Generate a professional referral letter from a doctor-patient consultation transcript.

CRITICAL RULES:
1. Only include information explicitly stated or clearly implied in the transcript
2. Never fabricate medications, dosages, diagnoses, or examination findings
3. Mark uncertain information with [?]
4. Use professional, respectful tone appropriate for specialist correspondence
5. Include all relevant clinical details that would help the receiving specialist

REFERRAL LETTER STRUCTURE:
- To: The specialist or department being referred to (if mentioned)
- Reason for Referral: The clinical question and reason for referral
- Clinical Summary: Relevant medical history, medications, investigations
- Specific Request: What is specifically being asked of the specialist

Also suggest appropriate ICD-10 and CPT billing codes."""

    context_section = ""
    if patient_context:
        context_section = f"\nPATIENT CONTEXT:\n{patient_context}\n\n"

    user_prompt = f"""{context_section}CONSULTATION TRANSCRIPT:
{transcript}

Generate a complete referral letter from this transcript. Include billing code suggestions."""

    return system_prompt, user_prompt
