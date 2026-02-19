"""Clinical note generation using Claude API."""

import json
from anthropic import AsyncAnthropic
from tenacity import retry, stop_after_attempt, wait_exponential

from models.config import get_settings
from models.schemas import NoteGenerationResponse
from prompts.base import build_prompt_for_template
from utils.logging import get_logger

logger = get_logger("note_generator")

# Note output schema for Claude structured output
NOTE_SCHEMA = {
    "type": "object",
    "properties": {
        "sections": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "title": {"type": "string"},
                    "content": {"type": "string"},
                    "order": {"type": "integer"},
                },
                "required": ["title", "content", "order"],
            },
        },
        "billing_codes": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "code": {"type": "string"},
                    "system": {"type": "string", "enum": ["ICD-10", "CPT"]},
                    "description": {"type": "string"},
                    "confidence": {"type": "number"},
                    "rationale": {"type": "string"},
                },
                "required": ["code", "system", "description", "confidence"],
            },
        },
    },
    "required": ["sections", "billing_codes"],
}


@retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=1, max=4))
async def generate_clinical_note(
    transcript: str,
    template_id: str,
    specialty: str = "general",
    patient_context: str | None = None,
) -> NoteGenerationResponse:
    """
    Generate a structured clinical note from a consultation transcript.

    Uses Claude API with tool_use for structured JSON output.
    Retries up to 3 times with exponential backoff.
    """
    settings = get_settings()
    client = AsyncAnthropic(api_key=settings.anthropic_api_key)

    # Build prompts based on template type
    system_prompt, user_prompt = build_prompt_for_template(
        template_id=template_id,
        transcript=transcript,
        specialty=specialty,
        patient_context=patient_context,
    )

    logger.info("calling_claude", model=settings.claude_model, template_id=template_id)

    response = await client.messages.create(
        model=settings.claude_model,
        max_tokens=settings.claude_max_tokens,
        temperature=settings.claude_temperature,
        system=system_prompt,
        messages=[{"role": "user", "content": user_prompt}],
        tools=[
            {
                "name": "generate_clinical_note",
                "description": "Generate a structured clinical note with sections and billing codes",
                "input_schema": NOTE_SCHEMA,
            }
        ],
        tool_choice={"type": "tool", "name": "generate_clinical_note"},
    )

    # Extract structured output from tool use
    for block in response.content:
        if block.type == "tool_use":
            result = block.input
            return NoteGenerationResponse(
                note={"sections": result["sections"]},
                billing_codes=result.get("billing_codes", []),
                model=settings.claude_model,
            )

    raise ValueError("No structured output received from Claude API")
