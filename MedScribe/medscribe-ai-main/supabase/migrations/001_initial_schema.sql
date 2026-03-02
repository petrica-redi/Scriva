-- ============================================================================
-- AI Medical Scribe — Initial Database Schema
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- TABLES
-- ============================================================================

-- Users (extends Supabase auth.users)
CREATE TABLE public.users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  specialty text,
  license_number text,
  organization_id uuid,
  role text NOT NULL DEFAULT 'clinician' CHECK (role IN ('clinician', 'admin', 'reviewer')),
  settings jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Patients
CREATE TABLE public.patients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  mrn text,
  full_name text NOT NULL,
  date_of_birth date,
  gender text,
  contact_info jsonb NOT NULL DEFAULT '{}',
  ehr_patient_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, mrn)
);

-- Consultations
CREATE TABLE public.consultations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  patient_id uuid REFERENCES public.patients(id) ON DELETE SET NULL,
  visit_type text NOT NULL DEFAULT 'general',
  status text NOT NULL DEFAULT 'scheduled' CHECK (
    status IN ('scheduled', 'recording', 'transcribed', 'note_generated', 'reviewed', 'finalized')
  ),
  consent_given boolean NOT NULL DEFAULT false,
  consent_timestamp timestamptz,
  recording_duration_seconds integer,
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Note Templates
CREATE TABLE public.note_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  specialty text,
  sections jsonb NOT NULL DEFAULT '[]',
  is_system boolean NOT NULL DEFAULT false,
  is_published boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Transcripts
CREATE TABLE public.transcripts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  consultation_id uuid NOT NULL UNIQUE REFERENCES public.consultations(id) ON DELETE CASCADE,
  segments jsonb NOT NULL DEFAULT '[]',
  full_text text,
  language text NOT NULL DEFAULT 'en',
  provider text NOT NULL DEFAULT 'deepgram',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Clinical Notes
CREATE TABLE public.clinical_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  consultation_id uuid NOT NULL REFERENCES public.consultations(id) ON DELETE CASCADE,
  template_id uuid REFERENCES public.note_templates(id) ON DELETE SET NULL,
  sections jsonb NOT NULL DEFAULT '[]',
  billing_codes jsonb NOT NULL DEFAULT '[]',
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'reviewed', 'finalized')),
  ai_model text,
  generation_metadata jsonb NOT NULL DEFAULT '{}',
  finalized_at timestamptz,
  finalized_by uuid REFERENCES public.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Audit Log
CREATE TABLE public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  action text NOT NULL,
  resource_type text NOT NULL,
  resource_id uuid NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}',
  ip_address inet,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX idx_patients_user_id ON public.patients(user_id);
CREATE INDEX idx_consultations_user_id_created ON public.consultations(user_id, created_at DESC);
CREATE INDEX idx_consultations_status ON public.consultations(status);
CREATE INDEX idx_consultations_patient_id ON public.consultations(patient_id);
CREATE INDEX idx_clinical_notes_consultation_id ON public.clinical_notes(consultation_id);
CREATE INDEX idx_clinical_notes_status ON public.clinical_notes(status);
CREATE INDEX idx_audit_log_user_id_created ON public.audit_log(user_id, created_at DESC);
CREATE INDEX idx_audit_log_resource ON public.audit_log(resource_type, resource_id);
CREATE INDEX idx_note_templates_user_id ON public.note_templates(user_id);
CREATE INDEX idx_note_templates_specialty ON public.note_templates(specialty);

-- Full-text search on transcripts
CREATE INDEX idx_transcripts_full_text ON public.transcripts USING gin(to_tsvector('english', full_text));

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consultations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transcripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinical_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.note_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Users: can read/update own profile
CREATE POLICY "users_select_own" ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "users_update_own" ON public.users FOR UPDATE USING (auth.uid() = id);

-- Patients: full CRUD on own patients
CREATE POLICY "patients_select_own" ON public.patients FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "patients_insert_own" ON public.patients FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "patients_update_own" ON public.patients FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "patients_delete_own" ON public.patients FOR DELETE USING (auth.uid() = user_id);

-- Consultations: full CRUD on own consultations
CREATE POLICY "consultations_select_own" ON public.consultations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "consultations_insert_own" ON public.consultations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "consultations_update_own" ON public.consultations FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "consultations_delete_own" ON public.consultations FOR DELETE USING (auth.uid() = user_id);

-- Transcripts: access via consultation ownership
CREATE POLICY "transcripts_select_own" ON public.transcripts FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.consultations c WHERE c.id = consultation_id AND c.user_id = auth.uid()
  ));
CREATE POLICY "transcripts_insert_own" ON public.transcripts FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.consultations c WHERE c.id = consultation_id AND c.user_id = auth.uid()
  ));
CREATE POLICY "transcripts_update_own" ON public.transcripts FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.consultations c WHERE c.id = consultation_id AND c.user_id = auth.uid()
  ));

-- Clinical Notes: access via consultation ownership
CREATE POLICY "clinical_notes_select_own" ON public.clinical_notes FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.consultations c WHERE c.id = consultation_id AND c.user_id = auth.uid()
  ));
CREATE POLICY "clinical_notes_insert_own" ON public.clinical_notes FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.consultations c WHERE c.id = consultation_id AND c.user_id = auth.uid()
  ));
CREATE POLICY "clinical_notes_update_own" ON public.clinical_notes FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.consultations c WHERE c.id = consultation_id AND c.user_id = auth.uid()
  ));

-- Note Templates: see system templates + own templates
CREATE POLICY "templates_select" ON public.note_templates FOR SELECT
  USING (is_system = true OR auth.uid() = user_id OR is_published = true);
CREATE POLICY "templates_insert_own" ON public.note_templates FOR INSERT
  WITH CHECK (auth.uid() = user_id AND is_system = false);
CREATE POLICY "templates_update_own" ON public.note_templates FOR UPDATE
  USING (auth.uid() = user_id AND is_system = false);
CREATE POLICY "templates_delete_own" ON public.note_templates FOR DELETE
  USING (auth.uid() = user_id AND is_system = false);

-- Audit Log: insert-only for authenticated users
CREATE POLICY "audit_log_insert" ON public.audit_log FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "audit_log_select_own" ON public.audit_log FOR SELECT
  USING (auth.uid() = user_id);

-- ============================================================================
-- UPDATED_AT TRIGGER
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.patients
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.consultations
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.transcripts
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.clinical_notes
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.note_templates
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================================
-- AUTO-CREATE USER PROFILE ON SIGNUP
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- SEED DATA: Default Note Templates
-- ============================================================================

INSERT INTO public.note_templates (name, description, specialty, is_system, sections) VALUES
(
  'SOAP Note',
  'Standard SOAP format for general consultations',
  'general',
  true,
  '[
    {"id": "subjective", "title": "Subjective", "prompt": "Document the patient''s chief complaint, history of present illness, review of systems, and relevant past medical/social/family history as reported by the patient.", "example": "Patient presents with a 3-day history of persistent cough...", "order": 1},
    {"id": "objective", "title": "Objective", "prompt": "Document physical examination findings, vital signs, and any test/lab results discussed during the visit.", "example": "Vitals: BP 120/80, HR 72, Temp 37.2°C...", "order": 2},
    {"id": "assessment", "title": "Assessment", "prompt": "List diagnoses or differential diagnoses based on the subjective and objective findings.", "example": "1. Acute bronchitis (J20.9)...", "order": 3},
    {"id": "plan", "title": "Plan", "prompt": "Document the treatment plan including medications, follow-up instructions, referrals, and patient education provided.", "example": "1. Prescribed amoxicillin 500mg TID x 7 days...", "order": 4}
  ]'
),
(
  'Referral Letter',
  'Specialist referral correspondence',
  'general',
  true,
  '[
    {"id": "recipient", "title": "To", "prompt": "Identify the specialist or department being referred to.", "example": "Dr. Jane Smith, Department of Cardiology", "order": 1},
    {"id": "reason", "title": "Reason for Referral", "prompt": "Summarize why the patient is being referred, including the clinical question.", "example": "Requesting evaluation of new-onset atrial fibrillation...", "order": 2},
    {"id": "history", "title": "Clinical Summary", "prompt": "Relevant medical history, current medications, and recent investigations.", "example": "65-year-old male with hypertension...", "order": 3},
    {"id": "request", "title": "Specific Request", "prompt": "What specifically is being asked of the specialist.", "example": "Please advise on anticoagulation management...", "order": 4}
  ]'
),
(
  'Discharge Summary',
  'Hospital discharge documentation',
  'general',
  true,
  '[
    {"id": "admission", "title": "Admission Details", "prompt": "Date of admission, presenting complaint, and admission diagnosis.", "example": "Admitted 2024-01-15 with acute chest pain...", "order": 1},
    {"id": "hospital_course", "title": "Hospital Course", "prompt": "Summary of investigations, treatments, and clinical progress during admission.", "example": "Troponin negative x3. ECG showed normal sinus rhythm...", "order": 2},
    {"id": "discharge_diagnosis", "title": "Discharge Diagnosis", "prompt": "Final diagnoses at time of discharge.", "example": "1. Non-cardiac chest pain - musculoskeletal", "order": 3},
    {"id": "medications", "title": "Discharge Medications", "prompt": "Complete medication list at discharge with any changes from admission.", "example": "1. Ibuprofen 400mg TDS PRN for pain...", "order": 4},
    {"id": "follow_up", "title": "Follow-Up Plan", "prompt": "Follow-up appointments, pending results, and red flag symptoms for the patient.", "example": "GP review in 1 week. Return if chest pain recurs...", "order": 5}
  ]'
),
(
  'Progress Note',
  'Follow-up visit documentation',
  'general',
  true,
  '[
    {"id": "interval_history", "title": "Interval History", "prompt": "Changes since last visit, response to treatment, new symptoms.", "example": "Patient reports improvement in knee pain since starting physiotherapy...", "order": 1},
    {"id": "examination", "title": "Examination", "prompt": "Focused examination findings relevant to the follow-up.", "example": "Right knee: reduced swelling, improved ROM to 120°...", "order": 2},
    {"id": "results", "title": "Results Review", "prompt": "Any new test results, imaging, or lab work reviewed.", "example": "MRI knee (2024-01-20): Mild meniscal degeneration...", "order": 3},
    {"id": "plan", "title": "Plan", "prompt": "Updated treatment plan and next steps.", "example": "Continue physiotherapy. Review in 6 weeks...", "order": 4}
  ]'
),
(
  'Patient Handout',
  'Plain language summary for the patient',
  'general',
  true,
  '[
    {"id": "visit_summary", "title": "What We Discussed", "prompt": "Plain language summary of the consultation in patient-friendly terms. Avoid medical jargon.", "example": "Today we talked about your ongoing cough...", "order": 1},
    {"id": "diagnosis", "title": "What We Found", "prompt": "Explain the diagnosis or findings in simple terms.", "example": "You have a chest infection called bronchitis...", "order": 2},
    {"id": "treatment", "title": "Your Treatment Plan", "prompt": "Medications, dosages, and lifestyle recommendations in clear language.", "example": "Take the antibiotic tablets 3 times a day with food...", "order": 3},
    {"id": "warning_signs", "title": "When to Seek Help", "prompt": "Red flag symptoms that should prompt the patient to seek urgent care.", "example": "Come back or go to the emergency room if you develop...", "order": 4},
    {"id": "next_steps", "title": "Next Appointment", "prompt": "Follow-up instructions and what to expect.", "example": "Please book a follow-up appointment in 2 weeks...", "order": 5}
  ]'
),
(
  'Specialist Consultation',
  'Detailed specialist consultation note',
  'specialist',
  true,
  '[
    {"id": "referral_info", "title": "Referral Information", "prompt": "Who referred the patient and the clinical question being addressed.", "example": "Referred by Dr. Smith for evaluation of...", "order": 1},
    {"id": "history", "title": "History", "prompt": "Comprehensive history relevant to the specialist consultation.", "example": "55-year-old female presents with 6-month history of...", "order": 2},
    {"id": "examination", "title": "Examination", "prompt": "Specialist-focused examination findings.", "example": "Cardiovascular examination reveals...", "order": 3},
    {"id": "investigations", "title": "Investigations", "prompt": "Tests ordered or reviewed during the consultation.", "example": "ECG: Normal sinus rhythm. Echo: EF 55%...", "order": 4},
    {"id": "opinion", "title": "Opinion & Recommendations", "prompt": "Specialist assessment and recommended management plan.", "example": "In my opinion, this presentation is consistent with...", "order": 5},
    {"id": "communication", "title": "Communication to Referrer", "prompt": "Summary to be sent back to the referring clinician.", "example": "I have assessed your patient and recommend...", "order": 6}
  ]'
);
