-- ============================================================================
-- Comprehensive RLS enforcement
-- Idempotent: safe to run on a database that already has some policies.
--
-- What this migration does:
--  1. Re-enables RLS on every table (no-op if already enabled).
--  2. Adds a stable helper function is_admin() to avoid repeated subqueries.
--  3. Fixes the dangerous "Allow service role all" policies on physicians/clinics
--     (those policies grant ANY authenticated user full write access — wrong).
--  4. Adds missing DELETE policies (transcripts, clinical_notes, clinical_alerts,
--     visit_summaries).
--  5. Adds patient-sharing companion policies so that a user who has been granted
--     access via patient_shares can read the shared patient's clinical data.
--  6. Adds missing organisation/team management write policies.
--  7. Adds admin SELECT bypass on public.users (so the admin panel can list all
--     users with a standard client; all other cross-user queries still require
--     the service-role key).
--
-- NOTE: The Supabase service-role key (supabaseAdmin) bypasses RLS entirely.
-- Admin API routes that already use supabaseAdmin need no additional DB policies.
-- ============================================================================

-- ============================================================================
-- Helper: is_admin()
-- Returns true when the calling user has role = 'admin' in public.users.
-- SECURITY DEFINER + SET search_path prevents privilege escalation.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.is_admin()
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'admin'
  )
$$;

-- ============================================================================
-- 1. Ensure RLS is enabled on every table (idempotent)
-- ============================================================================
ALTER TABLE public.users                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patients               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consultations          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transcripts            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinical_notes         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.note_templates         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drug_interactions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinical_alerts        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.note_cosigns           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_shares         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portal_messages        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_education      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visit_summaries        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follow_ups             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheduling_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visit_duration_stats   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vital_readings         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.intake_forms           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.intake_responses       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fhir_sync_log          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offline_queue          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consultation_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medications            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medication_protocols   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dose_equivalences      ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'physicians') THEN
    ALTER TABLE public.physicians ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'clinics') THEN
    ALTER TABLE public.clinics ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- ============================================================================
-- 2. Fix dangerous broad-access policies on physicians and clinics
--
-- These were created as "Allow service role all" with USING (true), which
-- grants ANY authenticated user (not just the service role) full write access.
-- The service role bypasses RLS automatically; no DB policy is needed for it.
-- ============================================================================
DROP POLICY IF EXISTS "Allow service role all"          ON public.physicians;
DROP POLICY IF EXISTS "Allow service role full access"  ON public.clinics;

-- Admins can manage physicians and clinics; everyone else is read-only.
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'physicians' AND policyname = 'physicians_admin_all'
  ) THEN
    CREATE POLICY "physicians_admin_all" ON public.physicians
      FOR ALL
      USING  (public.is_admin())
      WITH CHECK (public.is_admin());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'clinics' AND policyname = 'clinics_admin_all'
  ) THEN
    CREATE POLICY "clinics_admin_all" ON public.clinics
      FOR ALL
      USING  (public.is_admin())
      WITH CHECK (public.is_admin());
  END IF;
END $$;

-- ============================================================================
-- 3. Admin SELECT bypass on users table
-- Allows admin users to list all profiles through the standard client.
-- All other cross-user queries still require the service-role key (supabaseAdmin).
-- ============================================================================
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'users' AND policyname = 'users_select_admin'
  ) THEN
    CREATE POLICY "users_select_admin" ON public.users
      FOR SELECT
      USING (public.is_admin());
  END IF;
END $$;

-- ============================================================================
-- 4. Missing DELETE policies
-- ============================================================================
DO $$ BEGIN

  -- transcripts: delete when user owns the parent consultation
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'transcripts' AND policyname = 'transcripts_delete_own'
  ) THEN
    CREATE POLICY "transcripts_delete_own" ON public.transcripts
      FOR DELETE
      USING (EXISTS (
        SELECT 1 FROM public.consultations c
        WHERE c.id = consultation_id AND c.user_id = auth.uid()
      ));
  END IF;

  -- clinical_notes: delete when user owns the parent consultation
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'clinical_notes' AND policyname = 'clinical_notes_delete_own'
  ) THEN
    CREATE POLICY "clinical_notes_delete_own" ON public.clinical_notes
      FOR DELETE
      USING (EXISTS (
        SELECT 1 FROM public.consultations c
        WHERE c.id = consultation_id AND c.user_id = auth.uid()
      ));
  END IF;

  -- clinical_alerts: delete own
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'clinical_alerts' AND policyname = 'clinical_alerts_delete'
  ) THEN
    CREATE POLICY "clinical_alerts_delete" ON public.clinical_alerts
      FOR DELETE
      USING (auth.uid() = user_id);
  END IF;

  -- visit_summaries: update via patient ownership
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'visit_summaries' AND policyname = 'visit_summaries_update'
  ) THEN
    CREATE POLICY "visit_summaries_update" ON public.visit_summaries
      FOR UPDATE
      USING (EXISTS (
        SELECT 1 FROM public.patients p
        WHERE p.id = patient_id AND p.user_id = auth.uid()
      ));
  END IF;

  -- visit_summaries: delete via patient ownership
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'visit_summaries' AND policyname = 'visit_summaries_delete'
  ) THEN
    CREATE POLICY "visit_summaries_delete" ON public.visit_summaries
      FOR DELETE
      USING (EXISTS (
        SELECT 1 FROM public.patients p
        WHERE p.id = patient_id AND p.user_id = auth.uid()
      ));
  END IF;

END $$;

-- ============================================================================
-- 5. Patient-sharing companion policies
--
-- When a clinician shares a patient via public.patient_shares, the recipient
-- ("shared_with") should be able to read the patient's clinical data.
-- Write access is limited to users with 'write' or 'admin' permission.
-- ============================================================================
DO $$ BEGIN

  -- patients: shared users can SELECT
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'patients' AND policyname = 'patients_select_shared'
  ) THEN
    CREATE POLICY "patients_select_shared" ON public.patients
      FOR SELECT
      USING (EXISTS (
        SELECT 1 FROM public.patient_shares ps
        WHERE ps.patient_id = id AND ps.shared_with = auth.uid()
      ));
  END IF;

  -- patients: shared users with write/admin permission can UPDATE
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'patients' AND policyname = 'patients_update_shared'
  ) THEN
    CREATE POLICY "patients_update_shared" ON public.patients
      FOR UPDATE
      USING (EXISTS (
        SELECT 1 FROM public.patient_shares ps
        WHERE ps.patient_id = id
          AND ps.shared_with = auth.uid()
          AND ps.permission IN ('write', 'admin')
      ));
  END IF;

  -- consultations: shared users can SELECT
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'consultations' AND policyname = 'consultations_select_shared'
  ) THEN
    CREATE POLICY "consultations_select_shared" ON public.consultations
      FOR SELECT
      USING (EXISTS (
        SELECT 1 FROM public.patient_shares ps
        WHERE ps.patient_id = patient_id AND ps.shared_with = auth.uid()
      ));
  END IF;

  -- transcripts: shared users can SELECT (via consultation → patient)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'transcripts' AND policyname = 'transcripts_select_shared'
  ) THEN
    CREATE POLICY "transcripts_select_shared" ON public.transcripts
      FOR SELECT
      USING (EXISTS (
        SELECT 1 FROM public.consultations c
        JOIN public.patient_shares ps ON ps.patient_id = c.patient_id
        WHERE c.id = consultation_id AND ps.shared_with = auth.uid()
      ));
  END IF;

  -- clinical_notes: shared users can SELECT
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'clinical_notes' AND policyname = 'clinical_notes_select_shared'
  ) THEN
    CREATE POLICY "clinical_notes_select_shared" ON public.clinical_notes
      FOR SELECT
      USING (EXISTS (
        SELECT 1 FROM public.consultations c
        JOIN public.patient_shares ps ON ps.patient_id = c.patient_id
        WHERE c.id = consultation_id AND ps.shared_with = auth.uid()
      ));
  END IF;

  -- consultation_documents: shared users can SELECT
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'consultation_documents' AND policyname = 'documents_select_shared'
  ) THEN
    CREATE POLICY "documents_select_shared" ON public.consultation_documents
      FOR SELECT
      USING (EXISTS (
        SELECT 1 FROM public.consultations c
        JOIN public.patient_shares ps ON ps.patient_id = c.patient_id
        WHERE c.id = consultation_id AND ps.shared_with = auth.uid()
      ));
  END IF;

  -- follow_ups: shared users can SELECT
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'follow_ups' AND policyname = 'follow_ups_select_shared'
  ) THEN
    CREATE POLICY "follow_ups_select_shared" ON public.follow_ups
      FOR SELECT
      USING (EXISTS (
        SELECT 1 FROM public.patient_shares ps
        WHERE ps.patient_id = patient_id AND ps.shared_with = auth.uid()
      ));
  END IF;

  -- vital_readings: shared users can SELECT
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'vital_readings' AND policyname = 'vital_readings_select_shared'
  ) THEN
    CREATE POLICY "vital_readings_select_shared" ON public.vital_readings
      FOR SELECT
      USING (EXISTS (
        SELECT 1 FROM public.patient_shares ps
        WHERE ps.patient_id = patient_id AND ps.shared_with = auth.uid()
      ));
  END IF;

END $$;

-- ============================================================================
-- 6. Organisation & team management — missing write policies
-- ============================================================================
DO $$ BEGIN

  -- Any authenticated user can create an organisation (they become its owner)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'organizations' AND policyname = 'organizations_insert'
  ) THEN
    CREATE POLICY "organizations_insert" ON public.organizations
      FOR INSERT
      WITH CHECK (auth.uid() IS NOT NULL);
  END IF;

  -- Org owners/admins can update the organisation record
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'organizations' AND policyname = 'organizations_update'
  ) THEN
    CREATE POLICY "organizations_update" ON public.organizations
      FOR UPDATE
      USING (EXISTS (
        SELECT 1 FROM public.team_members tm
        WHERE tm.organization_id = id
          AND tm.user_id = auth.uid()
          AND tm.role IN ('owner', 'admin')
      ));
  END IF;

  -- Org owners can delete the organisation
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'organizations' AND policyname = 'organizations_delete'
  ) THEN
    CREATE POLICY "organizations_delete" ON public.organizations
      FOR DELETE
      USING (EXISTS (
        SELECT 1 FROM public.team_members tm
        WHERE tm.organization_id = id
          AND tm.user_id = auth.uid()
          AND tm.role = 'owner'
      ));
  END IF;

  -- Org admins/owners can update team member roles
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'team_members' AND policyname = 'team_members_update'
  ) THEN
    CREATE POLICY "team_members_update" ON public.team_members
      FOR UPDATE
      USING (EXISTS (
        SELECT 1 FROM public.team_members tm
        WHERE tm.organization_id = organization_id
          AND tm.user_id = auth.uid()
          AND tm.role IN ('owner', 'admin')
      ));
  END IF;

  -- Users can leave (DELETE own row) or org admins can remove members
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'team_members' AND policyname = 'team_members_delete'
  ) THEN
    CREATE POLICY "team_members_delete" ON public.team_members
      FOR DELETE
      USING (
        auth.uid() = user_id
        OR EXISTS (
          SELECT 1 FROM public.team_members tm
          WHERE tm.organization_id = organization_id
            AND tm.user_id = auth.uid()
            AND tm.role IN ('owner', 'admin')
        )
      );
  END IF;

END $$;

-- ============================================================================
-- 7. Ensure consultation_documents policies exist (belt-and-suspenders)
-- ============================================================================
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'consultation_documents' AND policyname = 'documents_select_own'
  ) THEN
    CREATE POLICY "documents_select_own" ON public.consultation_documents
      FOR SELECT USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'consultation_documents' AND policyname = 'documents_insert_own'
  ) THEN
    CREATE POLICY "documents_insert_own" ON public.consultation_documents
      FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'consultation_documents' AND policyname = 'documents_update_own'
  ) THEN
    CREATE POLICY "documents_update_own" ON public.consultation_documents
      FOR UPDATE USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'consultation_documents' AND policyname = 'documents_delete_own'
  ) THEN
    CREATE POLICY "documents_delete_own" ON public.consultation_documents
      FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

-- ============================================================================
-- Summary of policies by table after this migration
-- ============================================================================
--
-- Table                  | Policies
-- -----------------------|---------------------------------------------------------
-- users                  | select own, update own, select (admin)
-- patients               | CRUD own, select/update (shared)
-- consultations          | CRUD own, select (shared)
-- transcripts            | select/insert/update/delete own, select (shared)
-- clinical_notes         | select/insert/update/delete own, select (shared)
-- note_templates         | select all published/system, CRUD own private
-- audit_log              | insert + select own (no update/delete — immutable)
-- clinical_alerts        | select/insert/update/delete own
-- drug_interactions      | public read (authenticated)
-- organizations          | select (member), insert (any authed), update/delete (owner)
-- team_members           | select (member), insert self, update/delete (admin/owner)
-- note_cosigns           | select (parties), insert (requester), update (assignee)
-- patient_shares         | select (owner or recipient), insert + delete (owner)
-- portal_messages        | select/insert (patient owner or sender)
-- patient_education      | public read (authenticated, published only)
-- visit_summaries        | CRUD own (via patient ownership)
-- follow_ups             | CRUD own, select (shared patient)
-- scheduling_preferences | CRUD own
-- visit_duration_stats   | CRUD own
-- vital_readings         | CRUD own, select (shared patient)
-- intake_forms           | CRUD own
-- intake_responses       | select (form owner), insert (any authenticated)
-- fhir_sync_log          | CRUD own
-- offline_queue          | CRUD own
-- physicians             | public read, all (admin)
-- clinics                | public read, all (admin)
-- consultation_documents | CRUD own, select (shared patient)
-- medications            | public read (authenticated)
-- medication_protocols   | public read (authenticated)
-- dose_equivalences      | public read (authenticated)
-- ============================================================================
