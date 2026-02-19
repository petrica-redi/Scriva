"""Pydantic models for request/response validation."""

from pydantic import BaseModel, Field


# --- Transcript ---
class TranscriptSegment(BaseModel):
    speaker: str = Field(description="'doctor' or 'patient'")
    text: str
    start_time: float
    end_time: float
    confidence: float = Field(ge=0, le=1)


class TranscriptMessage(BaseModel):
    """WebSocket message sent to browser."""
    type: str = "transcript"
    speaker: int
    text: str
    is_final: bool
    confidence: float
    timestamp: float


# --- Note Generation ---
class NoteSection(BaseModel):
    title: str
    content: str
    order: int


class NoteGenerationRequest(BaseModel):
    transcript: str
    template_id: str
    specialty: str = "general"
    patient_context: str | None = None


class NoteGenerationResponse(BaseModel):
    note: dict  # {sections: [NoteSection]}
    billing_codes: list[dict]
    model: str


# --- Billing ---
class BillingCode(BaseModel):
    code: str
    system: str = Field(description="'ICD-10' or 'CPT'")
    description: str
    confidence: float = Field(ge=0, le=1)
    rationale: str = ""


class BillingSuggestionRequest(BaseModel):
    note_content: str
    specialty: str = "general"


class BillingSuggestionResponse(BaseModel):
    icd10_codes: list[BillingCode]
    cpt_codes: list[BillingCode]


# --- EHR ---
class PatientSearchResult(BaseModel):
    id: str
    mrn: str | None = None
    full_name: str
    date_of_birth: str | None = None
    gender: str | None = None


class EHRNotePayload(BaseModel):
    consultation_id: str
    patient_ehr_id: str
    note_content: str
    note_title: str
    encounter_date: str


# --- Common ---
class ErrorResponse(BaseModel):
    error: str
    code: str
    retryable: bool = False
