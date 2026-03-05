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

-- Seed follow-ups for Dr. Diana Pirjol (user c270c2da-1ea8-4166-bc6f-28471928a672)
INSERT INTO public.follow_ups (user_id, patient_id, type, title, description, due_date, priority, status, auto_generated) VALUES
  ('c270c2da-1ea8-4166-bc6f-28471928a672', '8fe04e04-c4a1-4752-9de7-a11cbf6b1526', 'lab_review',
   'Thyroid function recheck — Alexandru Marin',
   'TSH was elevated at 6.8. Started levothyroxine 25mcg. Recheck TSH after 6 weeks.',
   '2026-03-25', 'medium', 'pending', true),

  ('c270c2da-1ea8-4166-bc6f-28471928a672', 'aa3c8273-d524-4750-94cc-498313befdc7', 'symptom_check',
   'Anxiety treatment progress — Ioana Gheorghe',
   'Started sertraline 50mg 4 weeks ago. Assess mood improvement, side effects, and sleep quality.',
   '2026-03-09', 'medium', 'pending', false),

  ('c270c2da-1ea8-4166-bc6f-28471928a672', 'b7e4a911-e3a4-4898-ac35-af74b69987aa', 'medication_check',
   'Mood stabiliser review — Cristian Bălan',
   'Follow up on lithium levels after dose adjustment. Check for tremor, polyuria.',
   '2026-03-05', 'urgent', 'pending', false),

  ('c270c2da-1ea8-4166-bc6f-28471928a672', '0a7c35c9-2288-457d-a4a8-eb9120f6f477', 'appointment',
   'PTSD therapy follow-up — Andreea Niță',
   'Review EMDR progress after 6 sessions. Assess sleep disturbance and avoidance behaviours.',
   '2026-03-10', 'high', 'pending', true),

  ('c270c2da-1ea8-4166-bc6f-28471928a672', '6f58b829-5127-4734-abe3-9d0353859097', 'screening',
   'Cognitive screening — Mihai Constantinescu',
   'Schedule MMSE / MoCA re-test. Previous score 22/30 (mild impairment). Family concerned about progression.',
   '2026-03-15', 'high', 'pending', true),

  ('c270c2da-1ea8-4166-bc6f-28471928a672', 'ce7e75be-385c-4d1a-9a69-f1b2f3c93e36', 'medication_check',
   'OCD medication optimisation — Gabriela Tudor',
   'Fluvoxamine increased to 200mg 3 weeks ago. Check response, side effects (nausea, sedation).',
   '2026-03-08', 'high', 'pending', true),

  ('c270c2da-1ea8-4166-bc6f-28471928a672', 'a2415d1a-f43c-421f-bb9a-5087526bdccd', 'referral_outcome',
   'Neuropsychological testing results — Florin Diaconu',
   'Awaiting full neuropsych battery report from Dr. Popescu. Rule out organic psychosis vs treatment-resistant schizophrenia.',
   '2026-03-12', 'high', 'pending', true),

  ('c270c2da-1ea8-4166-bc6f-28471928a672', '78d3283b-edc2-4128-a625-49da7b1c532e', 'symptom_check',
   'Depression treatment response — James O''Brien',
   'Re-evaluate PHQ-9 after 4 weeks on Sertraline 100mg. Patient reported initial improvement.',
   '2026-03-07', 'urgent', 'pending', false),

  ('c270c2da-1ea8-4166-bc6f-28471928a672', 'a295cc43-ce6a-44b0-b376-59fcee66ff21', 'appointment',
   'Panic disorder review — Sophie Lefèvre',
   'Follow-up after starting Pregabalin 75mg bid. Assess panic attack frequency and agoraphobia.',
   '2026-03-11', 'medium', 'pending', true),

  ('c270c2da-1ea8-4166-bc6f-28471928a672', '2f132546-9604-4a6c-8929-821b3a4d4e4d', 'lab_review',
   'Metabolic panel — Hans Müller',
   'Check liver function and metabolic syndrome markers. Patient on Olanzapine — weight gain monitoring.',
   '2026-03-20', 'medium', 'pending', true),

  ('c270c2da-1ea8-4166-bc6f-28471928a672', '65de73ab-a7ab-471d-842a-bbd871f3ce5a', 'medication_check',
   'Eating disorder medication review — Yuki Tanaka',
   'Re-evaluate nutritional status and fluoxetine response. BMI last visit: 16.2. Target BMI ≥ 18.5.',
   '2026-03-06', 'urgent', 'pending', false),

  -- Overdue items
  ('c270c2da-1ea8-4166-bc6f-28471928a672', 'b1fba7a3-4362-41db-87c0-151d4c023d57', 'screening',
   'Overdue: PHQ-9 rescreen — Carlos Rodriguez',
   'Quarterly depression screening overdue. Last PHQ-9 was 11 (moderate) on January 15.',
   '2026-02-28', 'high', 'overdue', true),

  ('c270c2da-1ea8-4166-bc6f-28471928a672', '599a7600-ac54-42a7-868c-314268d5eb37', 'appointment',
   'Overdue: Postpartum follow-up — Maria Ene',
   'Postpartum depression check at 6 weeks. Patient cancelled last appointment.',
   '2026-03-01', 'high', 'overdue', false),

  -- Completed items
  ('c270c2da-1ea8-4166-bc6f-28471928a672', '64e8d590-3d9d-4b8b-bb90-bd3995846ec3', 'lab_review',
   'Lithium level reviewed — Victor Sava',
   'Lithium level 0.78 mmol/L (therapeutic range). Renal function stable. Continue current dose.',
   '2026-03-02', 'medium', 'completed', true),

  ('c270c2da-1ea8-4166-bc6f-28471928a672', 'a0fd0c71-642e-44ed-959e-8558660da5d5', 'medication_check',
   'Benzodiazepine taper completed — Daniela Oprea',
   'Successfully tapered off lorazepam over 8 weeks. No withdrawal symptoms. Continue monitoring.',
   '2026-03-03', 'low', 'completed', false);
