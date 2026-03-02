"""Note generation endpoints using Claude API."""

from fastapi import APIRouter, Depends, HTTPException
from tenacity import retry, stop_after_attempt, wait_exponential

from models.schemas import NoteGenerationRequest, NoteGenerationResponse, ErrorResponse
from services.note_generator import generate_clinical_note
from utils.auth import verify_token
from utils.logging import get_logger

router = APIRouter()
logger = get_logger("notes")


@router.post(
    "/generate-note",
    response_model=NoteGenerationResponse,
    responses={500: {"model": ErrorResponse}},
)
async def generate_note(
    request: NoteGenerationRequest,
    auth: dict = Depends(verify_token),
):
    """
    Generate a structured clinical note from a consultation transcript.

    Accepts the full transcript text, template ID, specialty, and optional
    patient context. Returns structured note sections and billing code suggestions.
    """
    logger.info(
        "note_generation_requested",
        user_id=auth["user_id"],
        template_id=request.template_id,
        specialty=request.specialty,
        # NEVER log transcript content (PHI)
    )

    try:
        result = await generate_clinical_note(
            transcript=request.transcript,
            template_id=request.template_id,
            specialty=request.specialty,
            patient_context=request.patient_context,
        )
        return result
    except Exception as e:
        logger.error("note_generation_failed", error=str(e), user_id=auth["user_id"])
        raise HTTPException(
            status_code=500,
            detail={"error": "Note generation failed", "code": "NOTE_GEN_ERROR", "retryable": True},
        )
