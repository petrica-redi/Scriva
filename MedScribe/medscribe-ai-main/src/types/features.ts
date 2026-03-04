// Clinical Decision Support
export interface DrugInteraction {
  id: string;
  drug_a: string;
  drug_b: string;
  severity: "critical" | "major" | "moderate" | "minor";
  description: string;
  mechanism: string | null;
  recommendation: string | null;
  source: string;
  created_at: string;
}

export interface ClinicalAlert {
  id: string;
  consultation_id: string | null;
  user_id: string;
  patient_id: string | null;
  alert_type: "drug_interaction" | "differential_diagnosis" | "guideline_nudge" | "missing_screening" | "red_flag" | "contraindication";
  severity: "critical" | "high" | "medium" | "low" | "info";
  title: string;
  description: string;
  evidence_source: string | null;
  is_dismissed: boolean;
  dismissed_at: string | null;
  dismissed_reason: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

// Team Collaboration
export interface Organization {
  id: string;
  name: string;
  type: "clinic" | "hospital" | "practice" | "network";
  settings: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface TeamMember {
  id: string;
  organization_id: string;
  user_id: string;
  role: "owner" | "admin" | "member" | "resident" | "nurse";
  invited_by: string | null;
  joined_at: string;
}

export interface NoteCosign {
  id: string;
  clinical_note_id: string;
  requested_by: string;
  assigned_to: string;
  status: "pending" | "approved" | "rejected" | "revision_requested";
  comments: string | null;
  signed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface PatientShare {
  id: string;
  patient_id: string;
  owner_id: string;
  shared_with: string;
  permission: "read" | "write" | "admin";
  created_at: string;
}

// Patient Portal
export interface PortalMessage {
  id: string;
  patient_id: string;
  sender_type: "patient" | "provider";
  sender_id: string;
  subject: string | null;
  body: string;
  is_read: boolean;
  read_at: string | null;
  parent_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface PatientEducation {
  id: string;
  title: string;
  content: string;
  category: string;
  condition_codes: string[];
  language: string;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

export interface VisitSummary {
  id: string;
  consultation_id: string;
  patient_id: string;
  summary_text: string;
  medications: Array<{ name: string; dosage: string; frequency: string; instructions: string }>;
  instructions: string | null;
  follow_up_date: string | null;
  is_shared: boolean;
  shared_at: string | null;
  created_at: string;
}

// Follow-Up System
export type FollowUpType = "appointment" | "lab_review" | "medication_check" | "screening" | "referral_outcome" | "symptom_check" | "custom";
export type FollowUpStatus = "pending" | "completed" | "overdue" | "cancelled" | "snoozed";

export interface FollowUp {
  id: string;
  user_id: string;
  patient_id: string;
  consultation_id: string | null;
  type: FollowUpType;
  title: string;
  description: string | null;
  due_date: string;
  priority: "urgent" | "high" | "medium" | "low";
  status: FollowUpStatus;
  completed_at: string | null;
  snoozed_until: string | null;
  reminder_sent: boolean;
  reminder_sent_at: string | null;
  auto_generated: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

// Smart Scheduling
export interface SchedulingPreference {
  id: string;
  user_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  slot_duration_minutes: number;
  buffer_minutes: number;
  max_patients: number | null;
  is_active: boolean;
}

export interface VisitDurationStat {
  id: string;
  user_id: string;
  visit_type: string;
  avg_duration_minutes: number;
  min_duration_minutes: number | null;
  max_duration_minutes: number | null;
  sample_count: number;
  last_updated: string;
}

export interface ScheduleSuggestion {
  suggested_time: string;
  estimated_duration: number;
  buffer_after: number;
  confidence: number;
  reason: string;
}

// Wearable / IoT
export type DeviceType = "blood_pressure" | "glucometer" | "pulse_oximeter" | "thermometer" | "weight_scale" | "ecg" | "spirometer" | "activity_tracker" | "manual";

export interface VitalReading {
  id: string;
  patient_id: string;
  user_id: string;
  device_type: DeviceType;
  device_name: string | null;
  reading_type: string;
  value: number;
  unit: string;
  secondary_value: number | null;
  secondary_unit: string | null;
  recorded_at: string;
  notes: string | null;
  is_abnormal: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface VitalTrend {
  reading_type: string;
  readings: Array<{ value: number; secondary_value?: number; recorded_at: string; is_abnormal: boolean }>;
  avg: number;
  min: number;
  max: number;
  trend: "improving" | "stable" | "worsening";
}

// AI Receptionist / Intake
export type IntakeFormType = "pre_visit" | "new_patient" | "follow_up" | "screening" | "custom";

export interface IntakeQuestion {
  id: string;
  text: string;
  type: "text" | "textarea" | "select" | "multiselect" | "boolean" | "number" | "date" | "scale";
  options?: string[];
  required: boolean;
  category?: string;
  order: number;
}

export interface IntakeForm {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  form_type: IntakeFormType;
  questions: IntakeQuestion[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface IntakeResponse {
  id: string;
  form_id: string;
  patient_id: string | null;
  consultation_id: string | null;
  respondent_name: string | null;
  respondent_email: string | null;
  responses: Record<string, unknown>;
  triage_result: { urgency: "emergency" | "urgent" | "routine" | "non_urgent"; reasoning: string; recommended_action: string } | null;
  ai_summary: string | null;
  status: "submitted" | "reviewed" | "integrated";
  submitted_at: string;
  reviewed_at: string | null;
}

// FHIR
export interface FHIRSyncLog {
  id: string;
  user_id: string;
  direction: "import" | "export";
  resource_type: string;
  fhir_id: string | null;
  local_id: string | null;
  status: "pending" | "success" | "failed" | "partial";
  error_message: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

// Offline
export interface OfflineQueueItem {
  id: string;
  user_id: string;
  action: string;
  resource_type: string;
  payload: Record<string, unknown>;
  status: "queued" | "syncing" | "synced" | "failed";
  retry_count: number;
  error_message: string | null;
  created_at: string;
  synced_at: string | null;
}

// Pre-Visit Brief
export interface PreVisitBrief {
  patient: { name: string; age: number | null; gender: string | null; mrn: string | null };
  lastVisit: { date: string; visit_type: string; summary: string } | null;
  activeMedications: Array<{ name: string; dosage: string; since: string }>;
  pendingFollowUps: Array<{ title: string; due_date: string; type: string }>;
  recentVitals: Array<{ type: string; value: number; unit: string; date: string; abnormal: boolean }>;
  riskFactors: string[];
  overdueScreenings: string[];
  recentAlerts: ClinicalAlert[];
}

// Note Style Preferences
export interface NoteStylePreferences {
  verbosity: "concise" | "moderate" | "detailed";
  format_preference: "bullet_points" | "prose" | "mixed";
  include_social_history: boolean;
  include_family_history: boolean;
  assessment_style: "numbered_list" | "narrative" | "problem_based";
  custom_instructions: string;
  learned_patterns: Record<string, string>;
}

// Voice Command
export interface VoiceCommand {
  command: string;
  action: "add_allergy" | "add_medication" | "correction" | "flag_followup" | "mark_urgent" | "add_diagnosis" | "pause" | "resume" | "bookmark";
  payload: string;
  timestamp: number;
}
