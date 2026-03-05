-- ============================================================================
-- Consultation Documents — stores all outputs linked to a consultation
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.consultation_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  consultation_id uuid NOT NULL REFERENCES public.consultations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  document_type text NOT NULL CHECK (
    document_type IN (
      'clinical_note', 'prescription', 'referral_letter',
      'discharge_summary', 'patient_handout', 'progress_note',
      'specialist_consultation', 'transcript', 'other'
    )
  ),
  title text NOT NULL,
  content_text text,
  content_html text,
  metadata jsonb NOT NULL DEFAULT '{}',
  source_record_id uuid,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived', 'deleted')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_consultation_documents_consultation
  ON public.consultation_documents(consultation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_consultation_documents_user
  ON public.consultation_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_consultation_documents_type
  ON public.consultation_documents(document_type);

ALTER TABLE public.consultation_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "documents_select_own" ON public.consultation_documents FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "documents_insert_own" ON public.consultation_documents FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "documents_update_own" ON public.consultation_documents FOR UPDATE
  USING (auth.uid() = user_id);
CREATE POLICY "documents_delete_own" ON public.consultation_documents FOR DELETE
  USING (auth.uid() = user_id);

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.consultation_documents
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
