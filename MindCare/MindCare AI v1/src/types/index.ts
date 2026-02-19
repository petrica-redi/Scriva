// ============================================================================
// Core Application Types
// ============================================================================

// --- User ---
export interface User {
  id: string;
  full_name: string;
  email: string;
  specialty: string | null;
  license_number: string | null;
  organization_id: string | null;
  role: "clinician" | "admin" | "reviewer";
  settings: UserSettings;
  created_at: string;
  updated_at: string;
}

export interface UserSettings {
  default_template_id?: string;
  default_visit_type?: string;
  audio_quality?: "standard" | "high";
  silence_threshold?: number;
  theme?: "light" | "dark" | "system";
}

// --- Patient ---
export interface Patient {
  id: string;
  user_id: string;
  mrn: string | null;
  full_name: string;
  date_of_birth: string | null;
  gender: string | null;
  contact_info: Record<string, string>;
  ehr_patient_id: string | null;
  created_at: string;
  updated_at: string;
}

// --- Consultation ---
export type ConsultationStatus =
  | "scheduled"
  | "recording"
  | "transcribed"
  | "note_generated"
  | "reviewed"
  | "finalized"
  | "deleted";

export interface Consultation {
  id: string;
  user_id: string;
  patient_id: string | null;
  visit_type: string;
  status: ConsultationStatus;
  consent_given: boolean;
  consent_timestamp: string | null;
  recording_duration_seconds: number | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface ConsultationWithRelations extends Consultation {
  patient?: Patient | null;
  transcript?: Transcript | null;
  clinical_notes?: ClinicalNote[];
}

// --- Transcript ---
export interface TranscriptSegment {
  speaker: "doctor" | "patient";
  text: string;
  start_time: number;
  end_time: number;
  confidence: number;
}

export interface Transcript {
  id: string;
  consultation_id: string;
  segments: TranscriptSegment[];
  full_text: string | null;
  language: string;
  provider: string;
  created_at: string;
  updated_at: string;
}

// --- Clinical Note ---
export type NoteStatus = "draft" | "reviewed" | "finalized";

export interface NoteSection {
  title: string;
  content: string;
  order: number;
}

export interface BillingCode {
  code: string;
  system: "ICD-10" | "CPT";
  description: string;
  confidence: number;
  rationale?: string;
  accepted: boolean;
}

export interface ClinicalNote {
  id: string;
  consultation_id: string;
  template_id: string | null;
  sections: NoteSection[];
  billing_codes: BillingCode[];
  status: NoteStatus;
  ai_model: string | null;
  generation_metadata: Record<string, unknown>;
  finalized_at: string | null;
  finalized_by: string | null;
  created_at: string;
  updated_at: string;
}

// --- Note Template ---
export interface TemplateSection {
  id: string;
  title: string;
  prompt: string;
  example: string;
  order: number;
}

export interface NoteTemplate {
  id: string;
  user_id: string | null;
  name: string;
  description: string | null;
  specialty: string | null;
  sections: TemplateSection[];
  is_system: boolean;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

// --- Audio / Recording ---
export type ConsultationMode = "in-person" | "remote";

export type ConnectionStatus =
  | "disconnected"
  | "connecting"
  | "connected"
  | "error";

export interface LiveTranscriptItem {
  speaker: number;
  text: string;
  timestamp: number;
  isFinal: boolean;
  confidence: number;
}

export interface RecordingState {
  isRecording: boolean;
  isPaused: boolean;
  duration: number;
  audioLevel: number;
  connectionStatus: ConnectionStatus;
  transcript: LiveTranscriptItem[];
}

// --- Audit Log ---
export type AuditAction =
  | "view_transcript"
  | "generate_note"
  | "edit_note"
  | "finalize_note"
  | "export_note"
  | "view_patient"
  | "start_recording"
  | "stop_recording";

export type AuditResourceType =
  | "consultation"
  | "transcript"
  | "clinical_note"
  | "patient";

export interface AuditLogEntry {
  id: string;
  user_id: string;
  action: AuditAction;
  resource_type: AuditResourceType;
  resource_id: string;
  metadata: Record<string, unknown>;
  ip_address: string | null;
  created_at: string;
}

// --- API Responses ---
export interface ApiError {
  error: string;
  code: string;
  retryable: boolean;
}

export interface NoteGenerationRequest {
  transcript: string;
  template_id: string;
  specialty: string;
  patient_context?: string;
}

export interface NoteGenerationResponse {
  note: {
    sections: NoteSection[];
  };
  billing_codes: BillingCode[];
  model: string;
}

// --- Dashboard ---
export interface DashboardStats {
  todayConsultations: number;
  pendingReviews: number;
  totalConsultations: number;
  recentConsultations: ConsultationWithRelations[];
}
