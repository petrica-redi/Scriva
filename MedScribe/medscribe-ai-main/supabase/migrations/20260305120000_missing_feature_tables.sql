-- ============================================================================
-- Create missing feature tables (originally in 002_new_features.sql but
-- never applied to remote database)
-- ============================================================================

-- 1. Clinical Decision Support
CREATE TABLE IF NOT EXISTS public.drug_interactions (
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

CREATE TABLE IF NOT EXISTS public.clinical_alerts (
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

CREATE INDEX IF NOT EXISTS idx_clinical_alerts_consultation ON public.clinical_alerts(consultation_id);
CREATE INDEX IF NOT EXISTS idx_clinical_alerts_user ON public.clinical_alerts(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_clinical_alerts_patient ON public.clinical_alerts(patient_id);
CREATE INDEX IF NOT EXISTS idx_drug_interactions_drugs ON public.drug_interactions(drug_a, drug_b);

-- 2. Team Collaboration & Co-signing
CREATE TABLE IF NOT EXISTS public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL DEFAULT 'clinic' CHECK (type IN ('clinic', 'hospital', 'practice', 'network')),
  settings jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'resident', 'nurse')),
  invited_by uuid REFERENCES public.users(id),
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(organization_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.note_cosigns (
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

CREATE TABLE IF NOT EXISTS public.patient_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL REFERENCES public.users(id),
  shared_with uuid NOT NULL REFERENCES public.users(id),
  permission text NOT NULL DEFAULT 'read' CHECK (permission IN ('read', 'write', 'admin')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(patient_id, shared_with)
);

CREATE INDEX IF NOT EXISTS idx_team_members_org ON public.team_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user ON public.team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_note_cosigns_note ON public.note_cosigns(clinical_note_id);
CREATE INDEX IF NOT EXISTS idx_note_cosigns_assigned ON public.note_cosigns(assigned_to, status);
CREATE INDEX IF NOT EXISTS idx_patient_shares_patient ON public.patient_shares(patient_id);

-- 3. Visit Summaries
CREATE TABLE IF NOT EXISTS public.visit_summaries (
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

CREATE INDEX IF NOT EXISTS idx_visit_summaries_patient ON public.visit_summaries(patient_id);
CREATE INDEX IF NOT EXISTS idx_visit_summaries_consultation ON public.visit_summaries(consultation_id);

-- 4. Smart Scheduling
CREATE TABLE IF NOT EXISTS public.scheduling_preferences (
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

CREATE TABLE IF NOT EXISTS public.visit_duration_stats (
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

-- 5. Vitals / Wearable Integration
CREATE TABLE IF NOT EXISTS public.vital_readings (
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

CREATE INDEX IF NOT EXISTS idx_vital_readings_patient ON public.vital_readings(patient_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_vital_readings_type ON public.vital_readings(reading_type, patient_id);
CREATE INDEX IF NOT EXISTS idx_vital_readings_abnormal ON public.vital_readings(patient_id, is_abnormal) WHERE is_abnormal = true;

-- 6. AI Receptionist / Intake
CREATE TABLE IF NOT EXISTS public.intake_forms (
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

CREATE TABLE IF NOT EXISTS public.intake_responses (
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

CREATE INDEX IF NOT EXISTS idx_intake_forms_user ON public.intake_forms(user_id);
CREATE INDEX IF NOT EXISTS idx_intake_responses_form ON public.intake_responses(form_id);
CREATE INDEX IF NOT EXISTS idx_intake_responses_patient ON public.intake_responses(patient_id);

-- 7. FHIR Integration Tracking
CREATE TABLE IF NOT EXISTS public.fhir_sync_log (
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

CREATE INDEX IF NOT EXISTS idx_fhir_sync_user ON public.fhir_sync_log(user_id, created_at DESC);

-- 8. Offline Sync Tracking
CREATE TABLE IF NOT EXISTS public.offline_queue (
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

CREATE INDEX IF NOT EXISTS idx_offline_queue_user ON public.offline_queue(user_id, status);

-- 9. Audit Log
CREATE TABLE IF NOT EXISTS public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  action text NOT NULL,
  resource_type text NOT NULL,
  resource_id uuid,
  details jsonb NOT NULL DEFAULT '{}',
  ip_address text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_user ON public.audit_log(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_resource ON public.audit_log(resource_type, resource_id);

-- ============================================================================
-- RLS Policies
-- ============================================================================

ALTER TABLE public.drug_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinical_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.note_cosigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visit_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheduling_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visit_duration_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vital_readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.intake_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.intake_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fhir_sync_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offline_queue ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'audit_log' AND schemaname = 'public') THEN
    ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='drug_interactions_read' AND tablename='drug_interactions') THEN
    CREATE POLICY "drug_interactions_read" ON public.drug_interactions FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='clinical_alerts_select' AND tablename='clinical_alerts') THEN
    CREATE POLICY "clinical_alerts_select" ON public.clinical_alerts FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='clinical_alerts_insert' AND tablename='clinical_alerts') THEN
    CREATE POLICY "clinical_alerts_insert" ON public.clinical_alerts FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='clinical_alerts_update' AND tablename='clinical_alerts') THEN
    CREATE POLICY "clinical_alerts_update" ON public.clinical_alerts FOR UPDATE USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='organizations_select' AND tablename='organizations') THEN
    CREATE POLICY "organizations_select" ON public.organizations FOR SELECT USING (
      EXISTS (SELECT 1 FROM public.team_members tm WHERE tm.organization_id = id AND tm.user_id = auth.uid())
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='team_members_select' AND tablename='team_members') THEN
    CREATE POLICY "team_members_select" ON public.team_members FOR SELECT USING (
      EXISTS (SELECT 1 FROM public.team_members tm WHERE tm.organization_id = organization_id AND tm.user_id = auth.uid())
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='team_members_insert' AND tablename='team_members') THEN
    CREATE POLICY "team_members_insert" ON public.team_members FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='cosigns_select' AND tablename='note_cosigns') THEN
    CREATE POLICY "cosigns_select" ON public.note_cosigns FOR SELECT USING (auth.uid() = requested_by OR auth.uid() = assigned_to);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='cosigns_insert' AND tablename='note_cosigns') THEN
    CREATE POLICY "cosigns_insert" ON public.note_cosigns FOR INSERT WITH CHECK (auth.uid() = requested_by);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='cosigns_update' AND tablename='note_cosigns') THEN
    CREATE POLICY "cosigns_update" ON public.note_cosigns FOR UPDATE USING (auth.uid() = assigned_to);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='patient_shares_select' AND tablename='patient_shares') THEN
    CREATE POLICY "patient_shares_select" ON public.patient_shares FOR SELECT USING (auth.uid() = owner_id OR auth.uid() = shared_with);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='patient_shares_insert' AND tablename='patient_shares') THEN
    CREATE POLICY "patient_shares_insert" ON public.patient_shares FOR INSERT WITH CHECK (auth.uid() = owner_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='patient_shares_delete' AND tablename='patient_shares') THEN
    CREATE POLICY "patient_shares_delete" ON public.patient_shares FOR DELETE USING (auth.uid() = owner_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='visit_summaries_select' AND tablename='visit_summaries') THEN
    CREATE POLICY "visit_summaries_select" ON public.visit_summaries FOR SELECT USING (
      EXISTS (SELECT 1 FROM public.patients p WHERE p.id = patient_id AND p.user_id = auth.uid())
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='visit_summaries_insert' AND tablename='visit_summaries') THEN
    CREATE POLICY "visit_summaries_insert" ON public.visit_summaries FOR INSERT WITH CHECK (
      EXISTS (SELECT 1 FROM public.patients p WHERE p.id = patient_id AND p.user_id = auth.uid())
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='scheduling_prefs_all' AND tablename='scheduling_preferences') THEN
    CREATE POLICY "scheduling_prefs_all" ON public.scheduling_preferences FOR ALL USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='visit_stats_all' AND tablename='visit_duration_stats') THEN
    CREATE POLICY "visit_stats_all" ON public.visit_duration_stats FOR ALL USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='vitals_all' AND tablename='vital_readings') THEN
    CREATE POLICY "vitals_all" ON public.vital_readings FOR ALL USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='intake_forms_all' AND tablename='intake_forms') THEN
    CREATE POLICY "intake_forms_all" ON public.intake_forms FOR ALL USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='intake_responses_select' AND tablename='intake_responses') THEN
    CREATE POLICY "intake_responses_select" ON public.intake_responses FOR SELECT USING (
      EXISTS (SELECT 1 FROM public.intake_forms f WHERE f.id = form_id AND f.user_id = auth.uid())
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='intake_responses_insert' AND tablename='intake_responses') THEN
    CREATE POLICY "intake_responses_insert" ON public.intake_responses FOR INSERT TO authenticated WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='fhir_sync_all' AND tablename='fhir_sync_log') THEN
    CREATE POLICY "fhir_sync_all" ON public.fhir_sync_log FOR ALL USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='offline_queue_all' AND tablename='offline_queue') THEN
    CREATE POLICY "offline_queue_all" ON public.offline_queue FOR ALL USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='audit_log_select' AND tablename='audit_log') THEN
    CREATE POLICY "audit_log_select" ON public.audit_log FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='audit_log_insert' AND tablename='audit_log') THEN
    CREATE POLICY "audit_log_insert" ON public.audit_log FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- ============================================================================
-- Add note_style_preferences to users (if missing)
-- ============================================================================
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS note_style_preferences jsonb NOT NULL DEFAULT '{}';

-- ============================================================================
-- Seed: Common drug interactions
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
('fluoroquinolone', 'antacid', 'moderate', 'Reduced antibiotic absorption', 'Chelation with metal cations in antacids', 'Separate administration by at least 2 hours.')
ON CONFLICT (drug_a, drug_b) DO NOTHING;
