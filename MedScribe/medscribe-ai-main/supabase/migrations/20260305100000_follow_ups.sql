-- Follow-ups table for tracking patient follow-up tasks
CREATE TABLE IF NOT EXISTS public.follow_ups (
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

CREATE INDEX IF NOT EXISTS idx_follow_ups_user_status ON public.follow_ups(user_id, status, due_date);
CREATE INDEX IF NOT EXISTS idx_follow_ups_patient ON public.follow_ups(patient_id);
CREATE INDEX IF NOT EXISTS idx_follow_ups_due ON public.follow_ups(due_date, status);

ALTER TABLE public.follow_ups ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'follow_ups' AND policyname = 'Users can manage own follow_ups') THEN
    CREATE POLICY "Users can manage own follow_ups" ON public.follow_ups FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

-- Seed data removed (references Diana's specific user/patient IDs)
