"""Billing code suggestion endpoints."""

from fastapi import APIRouter, Depends, HTTPException

from models.schemas import BillingSuggestionRequest, BillingSuggestionResponse
from services.billing_engine import suggest_billing_codes
from utils.auth import verify_token
from utils.logging import get_logger

router = APIRouter()
logger = get_logger("billing")


@router.post("/billing/suggest", response_model=BillingSuggestionResponse)
async def suggest_codes(
    request: BillingSuggestionRequest,
    auth: dict = Depends(verify_token),
):
    """Suggest ICD-10 and CPT billing codes based on clinical note content."""
    logger.info("billing_suggestion_requested", user_id=auth["user_id"])

    try:
        result = await suggest_billing_codes(
            note_content=request.note_content,
            specialty=request.specialty,
        )
        return result
    except Exception as e:
        logger.error("billing_suggestion_failed", error=str(e))
        raise HTTPException(status_code=500, detail="Billing code suggestion failed")
