"""EHR integration endpoints (FHIR R4)."""

from fastapi import APIRouter, Depends, HTTPException

from models.schemas import PatientSearchResult, EHRNotePayload
from utils.auth import verify_token
from utils.logging import get_logger

router = APIRouter()
logger = get_logger("ehr")


@router.get("/ehr/patients", response_model=list[PatientSearchResult])
async def search_patients(
    search: str,
    auth: dict = Depends(verify_token),
):
    """Search patients in connected EHR system."""
    # TODO: Implement FHIR patient search
    logger.info("ehr_patient_search", user_id=auth["user_id"])
    return []


@router.post("/ehr/notes")
async def push_note_to_ehr(
    payload: EHRNotePayload,
    auth: dict = Depends(verify_token),
):
    """Push finalized clinical note to connected EHR system."""
    # TODO: Implement FHIR DocumentReference creation
    logger.info("ehr_note_push", user_id=auth["user_id"], consultation_id=payload.consultation_id)
    return {"status": "not_implemented", "message": "EHR integration coming in Phase 4"}


@router.get("/ehr/patient/{patient_id}/context")
async def get_patient_context(
    patient_id: str,
    auth: dict = Depends(verify_token),
):
    """Pull patient history from connected EHR system."""
    # TODO: Implement FHIR Condition/MedicationRequest read
    logger.info("ehr_context_pull", user_id=auth["user_id"])
    return {"context": None, "message": "EHR integration coming in Phase 4"}


@router.get("/ehr/status")
async def ehr_status(auth: dict = Depends(verify_token)):
    """Check EHR connection health."""
    return {"connected": False, "provider": None, "message": "No EHR configured"}
