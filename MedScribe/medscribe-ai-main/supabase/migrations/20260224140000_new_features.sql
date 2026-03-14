-- ============================================================================
-- MedScribe AI — Migration 002: New Features (16 Feature Expansion)
-- ============================================================================

-- ============================================================================
-- 1. CLINICAL DECISION SUPPORT
-- ============================================================================

CREATE TABLE public.drug_interactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  drug_a text NOT NULL,
  drug_b text NOT NULL,
  severity text NOT NULL CHECK (severity IN ('critical', 'major', 'moderate', 'minor')),
  description text NOT NULL,
  mechanism text,
  recommendation text,
  source text DEFAULT 'internal',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(drug_a, drug_b)
);

CREATE TABLE public.clinical_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  consultation_id uuid REFERENCES public.consultations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  patient_id uuid REFERENCES public.patients(id) ON DELETE SET NULL,
  alert_type text NOT NULL CHECK (alert_type IN (
    'drug_interaction', 'differential_diagnosis', 'guideline_nudge',
    'missing_screening', 'red_flag', 'contraindication'
  )),
  severity text NOT NULL CHECK (severity IN ('critical', 'high', 'medium', 'low', 'info')),
  title text NOT NULL,
  description text NOT NULL,
  evidence_source text,
  is_dismissed boolean NOT NULL DEFAULT false,
  dismissed_at timestamptz,
  dismissed_reason text,
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_clinical_alerts_consultation ON public.clinical_alerts(consultation_id);
CREATE INDEX idx_clinical_alerts_user ON public.clinical_alerts(user_id, created_at DESC);
CREATE INDEX idx_clinical_alerts_patient ON public.clinical_alerts(patient_id);
CREATE INDEX idx_drug_interactions_drugs ON public.drug_interactions(drug_a, drug_b);

-- ============================================================================
-- 2. SMART NOTE PERSONALIZATION (extend users table)
-- ============================================================================

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS note_style_preferences jsonb NOT NULL DEFAULT '{}';

-- ============================================================================
-- 3. TEAM COLLABORATION & CO-SIGNING
-- ============================================================================

CREATE TABLE public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL DEFAULT 'clinic' CHECK (type IN ('clinic', 'hospital', 'practice', 'network')),
  settings jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'resident', 'nurse')),
  invited_by uuid REFERENCES public.users(id),
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(organization_id, user_id)
);

CREATE TABLE public.note_cosigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinical_note_id uuid NOT NULL REFERENCES public.clinical_notes(id) ON DELETE CASCADE,
  requested_by uuid NOT NULL REFERENCES public.users(id),
  assigned_to uuid NOT NULL REFERENCES public.users(id),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'revision_requested')),
  comments text,
  signed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.patient_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL REFERENCES public.users(id),
  shared_with uuid NOT NULL REFERENCES public.users(id),
  permission text NOT NULL DEFAULT 'read' CHECK (permission IN ('read', 'write', 'admin')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(patient_id, shared_with)
);

CREATE INDEX idx_team_members_org ON public.team_members(organization_id);
CREATE INDEX idx_team_members_user ON public.team_members(user_id);
CREATE INDEX idx_note_cosigns_note ON public.note_cosigns(clinical_note_id);
CREATE INDEX idx_note_cosigns_assigned ON public.note_cosigns(assigned_to, status);
CREATE INDEX idx_patient_shares_patient ON public.patient_shares(patient_id);

-- ============================================================================
-- 4. PATIENT PORTAL
-- ============================================================================

CREATE TABLE public.portal_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  sender_type text NOT NULL CHECK (sender_type IN ('patient', 'provider')),
  sender_id uuid NOT NULL,
  subject text,
  body text NOT NULL,
  is_read boolean NOT NULL DEFAULT false,
  read_at timestamptz,
  parent_id uuid REFERENCES public.portal_messages(id),
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.patient_education (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text NOT NULL,
  category text NOT NULL,
  condition_codes text[] DEFAULT '{}',
  language text NOT NULL DEFAULT 'en',
  is_published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.visit_summaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  consultation_id uuid NOT NULL REFERENCES public.consultations(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  summary_text text NOT NULL,
  medications jsonb NOT NULL DEFAULT '[]',
  instructions text,
  follow_up_date date,
  is_shared boolean NOT NULL DEFAULT false,
  shared_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_portal_messages_patient ON public.portal_messages(patient_id, created_at DESC);
CREATE INDEX idx_visit_summaries_patient ON public.visit_summaries(patient_id);
CREATE INDEX idx_visit_summaries_consultation ON public.visit_summaries(consultation_id);
CREATE INDEX idx_patient_education_category ON public.patient_education(category);

-- ============================================================================
-- 5. AUTOMATED FOLLOW-UP SYSTEM
-- ============================================================================

CREATE TABLE public.follow_ups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  consultation_id uuid REFERENCES public.consultations(id) ON DELETE SET NULL,
  type text NOT NULL CHECK (type IN (
    'appointment', 'lab_review', 'medication_check', 'screening',
    'referral_outcome', 'symptom_check', 'custom'
  )),
  title text NOT NULL,
  description text,
  due_date date NOT NULL,
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('urgent', 'high', 'medium', 'low')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'overdue', 'cancelled', 'snoozed')),
  completed_at timestamptz,
  snoozed_until date,
  reminder_sent boolean NOT NULL DEFAULT false,
  reminder_sent_at timestamptz,
  auto_generated boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_follow_ups_user_status ON public.follow_ups(user_id, status, due_date);
CREATE INDEX idx_follow_ups_patient ON public.follow_ups(patient_id);
CREATE INDEX idx_follow_ups_due ON public.follow_ups(due_date, status);

-- ============================================================================
-- 6. SMART SCHEDULING
-- ============================================================================

CREATE TABLE public.scheduling_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  day_of_week integer NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time time NOT NULL,
  end_time time NOT NULL,
  slot_duration_minutes integer NOT NULL DEFAULT 30,
  buffer_minutes integer NOT NULL DEFAULT 5,
  max_patients integer,
  is_active boolean NOT NULL DEFAULT true,
  UNIQUE(user_id, day_of_week)
);

CREATE TABLE public.visit_duration_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  visit_type text NOT NULL,
  avg_duration_minutes numeric(6,2) NOT NULL DEFAULT 30,
  min_duration_minutes numeric(6,2),
  max_duration_minutes numeric(6,2),
  sample_count integer NOT NULL DEFAULT 0,
  last_updated timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, visit_type)
);

-- ============================================================================
-- 7. WEARABLE / IoT INTEGRATION
-- ============================================================================

CREATE TABLE public.vital_readings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  device_type text NOT NULL CHECK (device_type IN (
    'blood_pressure', 'glucometer', 'pulse_oximeter', 'thermometer',
    'weight_scale', 'ecg', 'spirometer', 'activity_tracker', 'manual'
  )),
  device_name text,
  reading_type text NOT NULL,
  value numeric NOT NULL,
  unit text NOT NULL,
  secondary_value numeric,
  secondary_unit text,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  notes text,
  is_abnormal boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_vital_readings_patient ON public.vital_readings(patient_id, recorded_at DESC);
CREATE INDEX idx_vital_readings_type ON public.vital_readings(reading_type, patient_id);
CREATE INDEX idx_vital_readings_abnormal ON public.vital_readings(patient_id, is_abnormal) WHERE is_abnormal = true;

-- ============================================================================
-- 8. AI RECEPTIONIST / INTAKE
-- ============================================================================

CREATE TABLE public.intake_forms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  form_type text NOT NULL DEFAULT 'pre_visit' CHECK (form_type IN ('pre_visit', 'new_patient', 'follow_up', 'screening', 'custom')),
  questions jsonb NOT NULL DEFAULT '[]',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.intake_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id uuid NOT NULL REFERENCES public.intake_forms(id) ON DELETE CASCADE,
  patient_id uuid REFERENCES public.patients(id) ON DELETE SET NULL,
  consultation_id uuid REFERENCES public.consultations(id) ON DELETE SET NULL,
  respondent_name text,
  respondent_email text,
  responses jsonb NOT NULL DEFAULT '{}',
  triage_result jsonb,
  ai_summary text,
  status text NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'reviewed', 'integrated')),
  submitted_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz
);

CREATE INDEX idx_intake_forms_user ON public.intake_forms(user_id);
CREATE INDEX idx_intake_responses_form ON public.intake_responses(form_id);
CREATE INDEX idx_intake_responses_patient ON public.intake_responses(patient_id);

-- ============================================================================
-- 9. FHIR INTEGRATION TRACKING
-- ============================================================================

CREATE TABLE public.fhir_sync_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  direction text NOT NULL CHECK (direction IN ('import', 'export')),
  resource_type text NOT NULL,
  fhir_id text,
  local_id uuid,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failed', 'partial')),
  error_message text,
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_fhir_sync_user ON public.fhir_sync_log(user_id, created_at DESC);

-- ============================================================================
-- 10. OFFLINE SYNC TRACKING
-- ============================================================================

CREATE TABLE public.offline_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  action text NOT NULL,
  resource_type text NOT NULL,
  payload jsonb NOT NULL,
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'syncing', 'synced', 'failed')),
  retry_count integer NOT NULL DEFAULT 0,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  synced_at timestamptz
);

CREATE INDEX idx_offline_queue_user ON public.offline_queue(user_id, status);

-- ============================================================================
-- RLS POLICIES FOR NEW TABLES
-- ============================================================================

ALTER TABLE public.drug_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinical_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.note_cosigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portal_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_education ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visit_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follow_ups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheduling_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visit_duration_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vital_readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.intake_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.intake_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fhir_sync_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offline_queue ENABLE ROW LEVEL SECURITY;

-- Drug interactions: public read
CREATE POLICY "drug_interactions_read" ON public.drug_interactions FOR SELECT TO authenticated USING (true);

-- Clinical alerts: user-scoped
CREATE POLICY "clinical_alerts_select" ON public.clinical_alerts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "clinical_alerts_insert" ON public.clinical_alerts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "clinical_alerts_update" ON public.clinical_alerts FOR UPDATE USING (auth.uid() = user_id);

-- Organizations: members can read
CREATE POLICY "organizations_select" ON public.organizations FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.team_members tm WHERE tm.organization_id = id AND tm.user_id = auth.uid())
);

-- Team members: org members can read
CREATE POLICY "team_members_select" ON public.team_members FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.team_members tm WHERE tm.organization_id = organization_id AND tm.user_id = auth.uid())
);
CREATE POLICY "team_members_insert" ON public.team_members FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Note cosigns: involved parties can access
CREATE POLICY "cosigns_select" ON public.note_cosigns FOR SELECT USING (
  auth.uid() = requested_by OR auth.uid() = assigned_to
);
CREATE POLICY "cosigns_insert" ON public.note_cosigns FOR INSERT WITH CHECK (auth.uid() = requested_by);
CREATE POLICY "cosigns_update" ON public.note_cosigns FOR UPDATE USING (auth.uid() = assigned_to);

-- Patient shares: owner or shared user
CREATE POLICY "patient_shares_select" ON public.patient_shares FOR SELECT USING (
  auth.uid() = owner_id OR auth.uid() = shared_with
);
CREATE POLICY "patient_shares_insert" ON public.patient_shares FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "patient_shares_delete" ON public.patient_shares FOR DELETE USING (auth.uid() = owner_id);

-- Portal messages: patient owner (provider) can access
CREATE POLICY "portal_messages_select" ON public.portal_messages FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.patients p WHERE p.id = patient_id AND p.user_id = auth.uid())
  OR sender_id = auth.uid()
);
CREATE POLICY "portal_messages_insert" ON public.portal_messages FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.patients p WHERE p.id = patient_id AND p.user_id = auth.uid())
  OR sender_id = auth.uid()
);

-- Patient education: public read for authenticated
CREATE POLICY "education_read" ON public.patient_education FOR SELECT TO authenticated USING (is_published = true);

-- Visit summaries: user-scoped via patient ownership
CREATE POLICY "visit_summaries_select" ON public.visit_summaries FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.patients p WHERE p.id = patient_id AND p.user_id = auth.uid())
);
CREATE POLICY "visit_summaries_insert" ON public.visit_summaries FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.patients p WHERE p.id = patient_id AND p.user_id = auth.uid())
);

-- Follow-ups: user-scoped
CREATE POLICY "follow_ups_select" ON public.follow_ups FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "follow_ups_insert" ON public.follow_ups FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "follow_ups_update" ON public.follow_ups FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "follow_ups_delete" ON public.follow_ups FOR DELETE USING (auth.uid() = user_id);

-- Scheduling preferences: user-scoped
CREATE POLICY "scheduling_prefs_select" ON public.scheduling_preferences FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "scheduling_prefs_insert" ON public.scheduling_preferences FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "scheduling_prefs_update" ON public.scheduling_preferences FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "scheduling_prefs_delete" ON public.scheduling_preferences FOR DELETE USING (auth.uid() = user_id);

-- Visit duration stats: user-scoped
CREATE POLICY "visit_stats_select" ON public.visit_duration_stats FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "visit_stats_upsert" ON public.visit_duration_stats FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "visit_stats_update" ON public.visit_duration_stats FOR UPDATE USING (auth.uid() = user_id);

-- Vital readings: user-scoped
CREATE POLICY "vitals_select" ON public.vital_readings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "vitals_insert" ON public.vital_readings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "vitals_update" ON public.vital_readings FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "vitals_delete" ON public.vital_readings FOR DELETE USING (auth.uid() = user_id);

-- Intake forms: user-scoped
CREATE POLICY "intake_forms_select" ON public.intake_forms FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "intake_forms_insert" ON public.intake_forms FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "intake_forms_update" ON public.intake_forms FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "intake_forms_delete" ON public.intake_forms FOR DELETE USING (auth.uid() = user_id);

-- Intake responses: form owner or public submission
CREATE POLICY "intake_responses_select" ON public.intake_responses FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.intake_forms f WHERE f.id = form_id AND f.user_id = auth.uid())
);
CREATE POLICY "intake_responses_insert" ON public.intake_responses FOR INSERT TO authenticated WITH CHECK (true);

-- FHIR sync log: user-scoped
CREATE POLICY "fhir_sync_select" ON public.fhir_sync_log FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "fhir_sync_insert" ON public.fhir_sync_log FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Offline queue: user-scoped
CREATE POLICY "offline_queue_select" ON public.offline_queue FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "offline_queue_insert" ON public.offline_queue FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "offline_queue_update" ON public.offline_queue FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "offline_queue_delete" ON public.offline_queue FOR DELETE USING (auth.uid() = user_id);

-- ============================================================================
-- UPDATED_AT TRIGGERS FOR NEW TABLES
-- ============================================================================

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.note_cosigns
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.follow_ups
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.patient_education
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.intake_forms
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================================
-- SEED: SPECIALTY TEMPLATES (Feature 9)
-- ============================================================================

INSERT INTO public.note_templates (name, description, specialty, is_system, sections) VALUES
(
  'Cardiology Consultation',
  'Specialist cardiology assessment note',
  'cardiology',
  true,
  '[
    {"id": "presenting_complaint", "title": "Presenting Complaint", "prompt": "Chief cardiac complaint and symptom timeline.", "example": "62-year-old male presents with exertional chest pain...", "order": 1},
    {"id": "cardiac_history", "title": "Cardiac History", "prompt": "Previous cardiac events, interventions, and risk factors.", "example": "PMH: MI 2019, PCI to LAD. Risk factors: HTN, DM2, dyslipidemia...", "order": 2},
    {"id": "examination", "title": "Cardiovascular Examination", "prompt": "Heart sounds, JVP, peripheral pulses, edema, lung auscultation.", "example": "HR 78 regular, BP 142/88. S1 S2 normal, no murmurs...", "order": 3},
    {"id": "investigations", "title": "Investigations", "prompt": "ECG, Echo, stress test, bloods, angiography findings.", "example": "ECG: NSR, no acute changes. Echo: EF 50%, mild LVH...", "order": 4},
    {"id": "assessment_plan", "title": "Assessment & Plan", "prompt": "Diagnosis, risk stratification, and management plan.", "example": "Stable angina, CCS Class II. Optimize medical therapy...", "order": 5}
  ]'
),
(
  'Dermatology Assessment',
  'Skin condition evaluation note',
  'dermatology',
  true,
  '[
    {"id": "history", "title": "History", "prompt": "Onset, duration, distribution, symptoms, triggers, treatments tried.", "example": "6-month history of pruritic erythematous patches on bilateral elbows...", "order": 1},
    {"id": "lesion_description", "title": "Lesion Description", "prompt": "Morphology, distribution, color, borders, size using dermatological terminology.", "example": "Well-demarcated erythematous plaques with silvery scale...", "order": 2},
    {"id": "dermoscopy", "title": "Dermoscopy/Imaging", "prompt": "Dermoscopic findings and any imaging performed.", "example": "Dermoscopy: regular vascular pattern, white scales...", "order": 3},
    {"id": "assessment", "title": "Assessment", "prompt": "Diagnosis with ICD-10, differential diagnoses.", "example": "Psoriasis vulgaris (L40.0), moderate severity, BSA 8%...", "order": 4},
    {"id": "treatment", "title": "Treatment Plan", "prompt": "Topical/systemic therapies, phototherapy, follow-up plan.", "example": "Initiate betamethasone 0.05% cream BID to plaques...", "order": 5}
  ]'
),
(
  'Pediatric Visit',
  'Pediatric consultation note with growth tracking',
  'pediatrics',
  true,
  '[
    {"id": "presenting", "title": "Presenting Complaint", "prompt": "Chief complaint, duration, associated symptoms, impact on daily activities.", "example": "5-year-old brought in by mother with 3-day fever and cough...", "order": 1},
    {"id": "growth", "title": "Growth & Development", "prompt": "Weight, height, head circumference percentiles. Developmental milestones.", "example": "Weight: 18kg (50th percentile), Height: 110cm (60th percentile)...", "order": 2},
    {"id": "immunization", "title": "Immunization Status", "prompt": "Vaccination history and any due/overdue vaccines.", "example": "Immunizations up to date per national schedule. Due for annual flu vaccine...", "order": 3},
    {"id": "examination", "title": "Examination", "prompt": "General appearance, systems examination relevant to complaint.", "example": "Alert, interactive child. Temp 38.5°C. Throat: erythematous, no exudate...", "order": 4},
    {"id": "plan", "title": "Plan", "prompt": "Treatment, parent education, safety-netting advice, follow-up.", "example": "Viral URTI. Supportive care: antipyretics PRN, fluids. Safety-net: return if...", "order": 5}
  ]'
),
(
  'Psychiatry Assessment',
  'Mental health evaluation note with structured assessment',
  'psychiatry',
  true,
  '[
    {"id": "presenting", "title": "Presenting Complaint", "prompt": "Chief psychiatric complaint, onset, triggers, impact on functioning.", "example": "28-year-old female referred for persistent low mood and anxiety x 6 months...", "order": 1},
    {"id": "psychiatric_history", "title": "Psychiatric History", "prompt": "Previous diagnoses, treatments, hospitalizations, therapy history.", "example": "Previous episode of MDD in 2020, treated with sertraline 50mg...", "order": 2},
    {"id": "mental_state", "title": "Mental State Examination", "prompt": "Appearance, behavior, speech, mood, affect, thought content/form, perception, cognition, insight, judgment.", "example": "Appearance: Casually dressed, appropriate hygiene. Psychomotor retardation noted...", "order": 3},
    {"id": "risk_assessment", "title": "Risk Assessment", "prompt": "Suicidality, self-harm, harm to others, vulnerability. PHQ-9/GAD-7 scores.", "example": "PHQ-9: 18 (moderately severe). No current SI/HI. Passive death wish denied...", "order": 4},
    {"id": "formulation", "title": "Formulation & Plan", "prompt": "Biopsychosocial formulation, diagnosis, treatment plan.", "example": "Recurrent MDD (F33.1), moderate episode with anxious distress. Plan: Increase sertraline to 100mg...", "order": 5}
  ]'
),
(
  'Orthopedic Assessment',
  'Musculoskeletal evaluation note',
  'orthopedics',
  true,
  '[
    {"id": "complaint", "title": "Chief Complaint", "prompt": "Location, onset, mechanism of injury, pain characteristics, functional limitations.", "example": "45-year-old presents with right knee pain after twisting injury during sports...", "order": 1},
    {"id": "examination", "title": "Musculoskeletal Examination", "prompt": "Inspection, palpation, ROM, special tests, neurovascular status.", "example": "Right knee: Mild effusion. Tender over medial joint line. McMurray positive...", "order": 2},
    {"id": "imaging", "title": "Imaging Review", "prompt": "X-ray, MRI, CT findings.", "example": "XR knee AP/Lat: No fracture. MRI: Medial meniscus posterior horn tear...", "order": 3},
    {"id": "assessment", "title": "Assessment", "prompt": "Diagnosis with ICD-10, severity classification.", "example": "Medial meniscus tear, right knee (M23.21). Mechanical symptoms present...", "order": 4},
    {"id": "plan", "title": "Treatment Plan", "prompt": "Conservative vs surgical management, rehabilitation plan, follow-up.", "example": "Discussed conservative vs arthroscopic options. Proceed with arthroscopy given mechanical symptoms...", "order": 5}
  ]'
),
(
  'OB/GYN Visit',
  'Obstetric or gynecological consultation note',
  'obgyn',
  true,
  '[
    {"id": "history", "title": "History", "prompt": "Menstrual, obstetric, gynecological, and sexual history. Current complaint.", "example": "G2P1, 28 weeks gestation. LMP 2024-05-15. Presents for routine antenatal check...", "order": 1},
    {"id": "examination", "title": "Examination", "prompt": "Abdominal/pelvic examination, fundal height, fetal heart rate, speculum findings.", "example": "Fundal height 28cm appropriate. FHR 145bpm regular. Fetal movements active...", "order": 2},
    {"id": "investigations", "title": "Investigations", "prompt": "Ultrasound, bloods, GTT, swabs, screening results.", "example": "Growth scan: EFW 1150g (50th centile), AFI normal, placenta posterior...", "order": 3},
    {"id": "assessment", "title": "Assessment", "prompt": "Obstetric/gynecological assessment and risk factors.", "example": "Uncomplicated pregnancy at 28 weeks. GTT normal. Rh negative - Anti-D given...", "order": 4},
    {"id": "plan", "title": "Plan", "prompt": "Management plan, follow-up schedule, patient education.", "example": "Continue prenatal vitamins. Next visit 32 weeks. Discuss birth plan...", "order": 5}
  ]'
),
(
  'Emergency Medicine',
  'Emergency department consultation note',
  'emergency',
  true,
  '[
    {"id": "triage", "title": "Triage & Presentation", "prompt": "Mode of arrival, triage category, presenting complaint, vital signs.", "example": "Ambulance arrival. Triage Cat 2. 55M with acute onset chest pain at rest x 2 hours...", "order": 1},
    {"id": "history", "title": "Focused History", "prompt": "HPC, PMH, medications, allergies. AMPLE/SAMPLE format.", "example": "Sudden onset central crushing chest pain radiating to left arm. Associated diaphoresis, nausea...", "order": 2},
    {"id": "examination", "title": "Examination", "prompt": "Primary/secondary survey, focused examination findings.", "example": "A: Patent. B: RR 22, SpO2 96% RA. C: HR 110 regular, BP 160/95. Diaphoretic...", "order": 3},
    {"id": "investigations", "title": "Investigations & Results", "prompt": "Bloods, ECG, imaging, POC testing results.", "example": "ECG: ST elevation V2-V5. Trop I: 2.4 ng/mL (elevated). CXR: No acute changes...", "order": 4},
    {"id": "management", "title": "Management", "prompt": "Treatment given, consultations, disposition.", "example": "STEMI protocol activated. Aspirin 300mg, Ticagrelor 180mg, Heparin 5000U. Cardiology consult...", "order": 5},
    {"id": "disposition", "title": "Disposition", "prompt": "Admission/discharge decision, handover, follow-up.", "example": "Admitted to CCU for primary PCI. Cardiology team accepting care...", "order": 6}
  ]'
),
(
  'Oncology Consultation',
  'Cancer treatment and follow-up note',
  'oncology',
  true,
  '[
    {"id": "diagnosis", "title": "Cancer Diagnosis", "prompt": "Primary diagnosis, staging, histology, molecular markers.", "example": "Stage IIIA NSCLC (T3N2M0), adenocarcinoma, EGFR wild-type, PD-L1 TPS 60%...", "order": 1},
    {"id": "treatment_history", "title": "Treatment History", "prompt": "Previous and current treatments, cycles completed, response assessment.", "example": "Completed 4 cycles carboplatin/pemetrexed + pembrolizumab. CT restaging: partial response...", "order": 2},
    {"id": "current_status", "title": "Current Status", "prompt": "Performance status, symptoms, side effects, quality of life.", "example": "ECOG PS 1. Reports mild fatigue, Grade 1 nausea managed with ondansetron...", "order": 3},
    {"id": "investigations", "title": "Investigations", "prompt": "Labs, imaging, tumor markers review.", "example": "CBC: WBC 5.2, Hb 11.8, Plt 180. CT chest/abd: 30% reduction in primary tumor...", "order": 4},
    {"id": "plan", "title": "Treatment Plan", "prompt": "Next treatment cycle, supportive care, clinical trials, follow-up.", "example": "Continue pembrolizumab maintenance. Next CT in 3 cycles. Refer to palliative care for symptom management...", "order": 5}
  ]'
),
(
  'ENT Assessment',
  'Ear, nose, and throat evaluation note',
  'ent',
  true,
  '[
    {"id": "complaint", "title": "Presenting Complaint", "prompt": "ENT symptoms: hearing, balance, nasal, throat, voice complaints.", "example": "52-year-old with progressive left-sided hearing loss and tinnitus x 3 months...", "order": 1},
    {"id": "examination", "title": "ENT Examination", "prompt": "Otoscopy, rhinoscopy, oropharyngeal exam, neck palpation, tuning fork tests.", "example": "Left ear: TM intact, no effusion. Weber lateralizes right. Rinne: BC>AC left...", "order": 2},
    {"id": "audiology", "title": "Audiology/Investigations", "prompt": "Audiogram, tympanogram, imaging results.", "example": "PTA: Left sensorineural hearing loss, moderate (50dB), high-frequency sloping...", "order": 3},
    {"id": "assessment", "title": "Assessment", "prompt": "Diagnosis with ICD-10.", "example": "Left sensorineural hearing loss (H90.3), asymmetric. Rule out vestibular schwannoma...", "order": 4},
    {"id": "plan", "title": "Plan", "prompt": "Management, imaging, hearing aids, surgery, follow-up.", "example": "MRI IAM to exclude retrocochlear pathology. If normal, hearing aid fitting trial...", "order": 5}
  ]'
);

-- ============================================================================
-- SEED: PATIENT EDUCATION CONTENT
-- ============================================================================

INSERT INTO public.patient_education (title, content, category, condition_codes, language) VALUES
('Understanding Your Blood Pressure', 'High blood pressure (hypertension) is when the force of blood against your artery walls is consistently too high. Normal blood pressure is below 120/80 mmHg. Lifestyle changes include reducing salt intake, regular exercise (30 min most days), maintaining a healthy weight, limiting alcohol, and managing stress. Take prescribed medications as directed. Monitor your blood pressure at home and keep a log for your doctor.', 'cardiovascular', ARRAY['I10', 'I11'], 'en'),
('Managing Type 2 Diabetes', 'Type 2 diabetes means your body does not use insulin properly. Key management strategies: Monitor blood sugar regularly, follow a balanced diet low in refined sugars and processed foods, exercise at least 150 minutes per week, take medications as prescribed, attend regular check-ups including annual eye and foot exams, and maintain HbA1c below 7% (or as advised by your doctor).', 'endocrine', ARRAY['E11'], 'en'),
('After Your Surgery', 'General post-operative care instructions: Keep the surgical site clean and dry. Watch for signs of infection (increasing redness, swelling, warmth, pus, fever above 38.5C). Take pain medications as prescribed. Gradually increase activity as tolerated. Do not lift heavy objects for the recommended period. Attend all follow-up appointments. Contact your surgeon immediately if you experience severe pain, heavy bleeding, or signs of infection.', 'surgical', ARRAY[]::text[], 'en'),
('Understanding Anxiety', 'Anxiety is your body''s natural response to stress. When it becomes excessive and persistent, it can interfere with daily life. Treatment approaches include Cognitive Behavioral Therapy (CBT), mindfulness and relaxation techniques, regular physical exercise, good sleep hygiene, limiting caffeine and alcohol, and medication if recommended by your doctor. The PHQ-4 and GAD-7 scales help track your progress.', 'mental_health', ARRAY['F41.1', 'F41.9'], 'en'),
('Healthy Pregnancy Guide', 'Key pregnancy care tips: Attend all scheduled antenatal appointments. Take prescribed prenatal vitamins (especially folic acid). Eat a balanced diet, avoid raw/undercooked foods. Stay active with gentle exercise. Avoid alcohol, smoking, and recreational drugs. Know the warning signs: heavy bleeding, severe headaches, vision changes, reduced fetal movements, and severe abdominal pain - seek immediate medical attention for these.', 'obstetrics', ARRAY['Z34'], 'en');

-- ============================================================================
-- SEED: COMMON DRUG INTERACTIONS
-- ============================================================================

INSERT INTO public.drug_interactions (drug_a, drug_b, severity, description, mechanism, recommendation) VALUES
('warfarin', 'aspirin', 'major', 'Increased bleeding risk when combined', 'Both affect coagulation pathways', 'Monitor INR closely. Consider gastroprotection. Assess bleeding risk.'),
('metformin', 'contrast_dye', 'major', 'Risk of lactic acidosis with iodinated contrast', 'Contrast may cause acute kidney injury, impairing metformin clearance', 'Hold metformin 48h before and after contrast administration. Check renal function.'),
('ssri', 'maoi', 'critical', 'Risk of serotonin syndrome - potentially fatal', 'Excessive serotonergic activity', 'CONTRAINDICATED. Allow 14-day washout between medications.'),
('ace_inhibitor', 'potassium_supplement', 'major', 'Risk of hyperkalemia', 'ACE inhibitors reduce potassium excretion', 'Monitor serum potassium regularly. Avoid potassium supplements unless hypokalemic.'),
('statin', 'macrolide', 'moderate', 'Increased risk of myopathy/rhabdomyolysis', 'CYP3A4 inhibition increases statin levels', 'Consider temporary statin hold during macrolide course. Monitor for muscle symptoms.'),
('methotrexate', 'nsaid', 'major', 'Increased methotrexate toxicity', 'NSAIDs reduce renal clearance of methotrexate', 'Avoid combination if possible. If necessary, monitor methotrexate levels and renal function.'),
('lithium', 'nsaid', 'major', 'Increased lithium levels and toxicity risk', 'NSAIDs reduce renal lithium clearance', 'Monitor lithium levels if NSAID started. Consider acetaminophen as alternative.'),
('clopidogrel', 'omeprazole', 'moderate', 'Reduced antiplatelet effect of clopidogrel', 'CYP2C19 inhibition reduces clopidogrel activation', 'Use pantoprazole as alternative PPI if gastroprotection needed.'),
('digoxin', 'amiodarone', 'major', 'Increased digoxin levels by 70-100%', 'Amiodarone inhibits P-glycoprotein and renal clearance', 'Reduce digoxin dose by 50% when initiating amiodarone. Monitor digoxin levels.'),
('fluoroquinolone', 'antacid', 'moderate', 'Reduced antibiotic absorption', 'Chelation with metal cations in antacids', 'Separate administration by at least 2 hours.');
