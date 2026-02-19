"""Billing code suggestion engine using Claude API."""

from anthropic import AsyncAnthropic
from tenacity import retry, stop_after_attempt, wait_exponential

from models.config import get_settings
from models.schemas import BillingSuggestionResponse, BillingCode
from utils.logging import get_logger

logger = get_logger("billing_engine")

BILLING_SYSTEM_PROMPT = """You are a medical billing specialist. Analyze the clinical note and suggest appropriate billing codes.

For each code, provide:
- The code (ICD-10 for diagnoses, CPT for procedures)
- A description
- Your confidence level (0.0-1.0)
- A brief rationale

Rules:
- Only suggest codes supported by the documentation
- Prefer specific codes over unspecified ones
- Include the most appropriate E/M (evaluation and management) CPT code
- Flag any codes where documentation may be insufficient with lower confidence
"""

BILLING_SCHEMA = {
    "type": "object",
    "properties": {
        "icd10_codes": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "code": {"type": "string"},
                    "system": {"type": "string", "enum": ["ICD-10"]},
                    "description": {"type": "string"},
                    "confidence": {"type": "number"},
                    "rationale": {"type": "string"},
                },
                "required": ["code", "system", "description", "confidence"],
            },
        },
        "cpt_codes": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "code": {"type": "string"},
                    "system": {"type": "string", "enum": ["CPT"]},
                    "description": {"type": "string"},
                    "confidence": {"type": "number"},
                    "rationale": {"type": "string"},
                },
                "required": ["code", "system", "description", "confidence"],
            },
        },
    },
    "required": ["icd10_codes", "cpt_codes"],
}


@retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=1, max=4))
async def suggest_billing_codes(
    note_content: str,
    specialty: str = "general",
) -> BillingSuggestionResponse:
    """Analyze clinical note and suggest ICD-10 and CPT billing codes."""
    settings = get_settings()
    client = AsyncAnthropic(api_key=settings.anthropic_api_key)

    user_prompt = f"""Analyze this clinical note for a {specialty} consultation and suggest billing codes.

Clinical Note:
{note_content}
"""

    response = await client.messages.create(
        model=settings.claude_model,
        max_tokens=2048,
        temperature=0.1,
        system=BILLING_SYSTEM_PROMPT,
        messages=[{"role": "user", "content": user_prompt}],
        tools=[
            {
                "name": "suggest_billing_codes",
                "description": "Suggest ICD-10 and CPT billing codes",
                "input_schema": BILLING_SCHEMA,
            }
        ],
        tool_choice={"type": "tool", "name": "suggest_billing_codes"},
    )

    for block in response.content:
        if block.type == "tool_use":
            result = block.input
            return BillingSuggestionResponse(
                icd10_codes=[BillingCode(**c) for c in result.get("icd10_codes", [])],
                cpt_codes=[BillingCode(**c) for c in result.get("cpt_codes", [])],
            )

    return BillingSuggestionResponse(icd10_codes=[], cpt_codes=[])
