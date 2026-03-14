# Prompt 5: Add Row Level Security policies

## Context
Supabase tables have NO RLS policies. Any authenticated user can read/write all data. This is a critical security gap for a medical app.

## Task
Create new migration: `supabase/migrations/20260314200000_row_level_security.sql`

```sql
-- ============================================================
-- Row Level Security: users see only their own data.
-- Admins see everything.
-- ============================================================

-- Helper: check if current user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- PATIENTS
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_patients" ON public.patients FOR ALL
  USING (user_id = auth.uid() OR public.is_admin());

-- CONSULTATIONS
ALTER TABLE public.consultations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_consultations" ON public.consultations FOR ALL
  USING (user_id = auth.uid() OR public.is_admin());

-- TRANSCRIPTS (linked via consultation)
ALTER TABLE public.transcripts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_transcripts" ON public.transcripts FOR ALL
  USING (
    consultation_id IN (SELECT id FROM public.consultations WHERE user_id = auth.uid())
    OR public.is_admin()
  );

-- CLINICAL NOTES (linked via consultation)
ALTER TABLE public.clinical_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_notes" ON public.clinical_notes FOR ALL
  USING (
    consultation_id IN (SELECT id FROM public.consultations WHERE user_id = auth.uid())
    OR public.is_admin()
  );

-- AUDIT LOG (admin only)
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_audit" ON public.audit_log FOR SELECT
  USING (public.is_admin());
CREATE POLICY "insert_audit" ON public.audit_log FOR INSERT
  WITH CHECK (true);  -- any authenticated user can create audit entries

-- USERS table (own profile + admin)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_profile" ON public.users FOR SELECT
  USING (id = auth.uid() OR public.is_admin());
CREATE POLICY "update_own_profile" ON public.users FOR UPDATE
  USING (id = auth.uid());

-- CONSULTATION DOCUMENTS (linked via consultation)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'consultation_documents') THEN
    ALTER TABLE public.consultation_documents ENABLE ROW LEVEL SECURITY;
    EXECUTE 'CREATE POLICY "own_docs" ON public.consultation_documents FOR ALL
      USING (
        consultation_id IN (SELECT id FROM public.consultations WHERE user_id = auth.uid())
        OR public.is_admin()
      )';
  END IF;
END $$;

-- AUDIO STORAGE BUCKET
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('recordings', 'recordings', false, 26214400, ARRAY['audio/webm','audio/wav','audio/mp3','audio/ogg'])
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "upload_own_audio" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'recordings' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "read_own_audio" ON storage.objects FOR SELECT
  USING (bucket_id = 'recordings' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "admin_all_audio" ON storage.objects FOR ALL
  USING (bucket_id = 'recordings' AND public.is_admin());
```

## IMPORTANT
The `/api/admin/users` route already uses `supabaseAdmin` (service role key) which bypasses RLS. This is correct — do NOT change it. The admin API route's role check (`profile.role !== "admin"`) is the access control layer for admin endpoints.

## Files to create
- `supabase/migrations/20260314200000_row_level_security.sql`
