"""Base prompt utilities and template routing."""

from prompts.soap_note import build_soap_prompt
from prompts.referral import build_referral_prompt
from prompts.discharge import build_discharge_prompt


# Template ID → prompt builder mapping
PROMPT_BUILDERS = {
    "SOAP Note": build_soap_prompt,
    "soap": build_soap_prompt,
    "Referral Letter": build_referral_prompt,
    "referral": build_referral_prompt,
    "Discharge Summary": build_discharge_prompt,
    "discharge": build_discharge_prompt,
}


def get_prompt_builder(template_id: str):
    """Get the prompt builder function for a given template ID.

    Falls back to SOAP note if template not found.
    """
    return PROMPT_BUILDERS.get(template_id, build_soap_prompt)


def build_prompt_for_template(
    template_id: str,
    transcript: str,
    specialty: str = "general",
    patient_context: str | None = None,
) -> tuple[str, str]:
    """Build system and user prompts for any supported template."""
    builder = get_prompt_builder(template_id)
    return builder(
        transcript=transcript,
        specialty=specialty,
        patient_context=patient_context,
    )
