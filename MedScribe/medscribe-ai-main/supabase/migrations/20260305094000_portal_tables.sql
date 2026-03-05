-- Patient Education resources table
CREATE TABLE IF NOT EXISTS public.patient_education (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text NOT NULL,
  category text NOT NULL,
  condition_codes text[] NOT NULL DEFAULT '{}',
  language text NOT NULL DEFAULT 'en',
  is_published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_patient_education_category ON public.patient_education(category);
CREATE INDEX IF NOT EXISTS idx_patient_education_language ON public.patient_education(language, is_published);

ALTER TABLE public.patient_education ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'patient_education' AND policyname = 'Authenticated users can read published education') THEN
    CREATE POLICY "Authenticated users can read published education"
      ON public.patient_education FOR SELECT
      USING (auth.role() = 'authenticated' AND is_published = true);
  END IF;
END $$;

-- Portal Messages table
CREATE TABLE IF NOT EXISTS public.portal_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  sender_type text NOT NULL CHECK (sender_type IN ('patient', 'provider')),
  sender_id uuid NOT NULL,
  subject text,
  body text NOT NULL,
  parent_id uuid REFERENCES public.portal_messages(id) ON DELETE SET NULL,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_portal_messages_patient ON public.portal_messages(patient_id, created_at);
CREATE INDEX IF NOT EXISTS idx_portal_messages_sender ON public.portal_messages(sender_id);

ALTER TABLE public.portal_messages ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'portal_messages' AND policyname = 'Providers can manage messages for their patients') THEN
    CREATE POLICY "Providers can manage messages for their patients"
      ON public.portal_messages FOR ALL
      USING (
        sender_id = auth.uid()
        OR patient_id IN (SELECT id FROM public.patients WHERE user_id = auth.uid())
      );
  END IF;
END $$;

-- Seed patient education content
INSERT INTO public.patient_education (title, content, category, condition_codes, language, is_published)
VALUES
  ('Understanding Depression',
   'Depression is a common mental health condition that affects how you feel, think, and act. It causes feelings of sadness and loss of interest in activities you once enjoyed. Depression is treatable — talk to your doctor about therapy, medication, and lifestyle changes that can help.',
   'Mental Health', ARRAY['F32', 'F33'], 'en', true),

  ('Managing Anxiety',
   'Anxiety disorders involve more than temporary worry or fear. For people with anxiety, the worry does not go away and can get worse over time. Techniques include deep breathing, progressive muscle relaxation, cognitive behavioral therapy, and medication when appropriate.',
   'Mental Health', ARRAY['F41', 'F40'], 'en', true),

  ('Medication Safety: Antidepressants',
   'Antidepressants typically take 2-4 weeks to start working. Do not stop taking them suddenly — always consult your doctor before making changes. Common side effects include nausea, headache, and sleep changes which usually improve over time.',
   'Medication', ARRAY['F32', 'F33'], 'en', true),

  ('Sleep Hygiene Tips',
   'Good sleep habits can improve your mental and physical health. Go to bed and wake up at the same time daily. Avoid screens 1 hour before bed. Keep your bedroom cool, dark, and quiet. Limit caffeine after noon. Exercise regularly but not too close to bedtime.',
   'Lifestyle', ARRAY['G47', 'F51'], 'en', true),

  ('Blood Pressure Monitoring at Home',
   'Check your blood pressure at the same time each day. Sit quietly for 5 minutes before measuring. Place the cuff on bare skin. Take 2-3 readings 1 minute apart and record the average. Bring your log to every appointment.',
   'Cardiovascular', ARRAY['I10', 'I15'], 'en', true),

  ('Understanding Your Lab Results',
   'Common blood tests include Complete Blood Count (CBC), metabolic panel, thyroid function, and lipid panel. Your doctor will explain what your specific results mean. Normal ranges can vary by lab, age, and sex.',
   'General', ARRAY[]::text[], 'en', true),

  ('Diabetes Self-Management',
   'Monitor your blood glucose regularly. Take medications as prescribed. Eat balanced meals with consistent carbohydrate intake. Exercise for at least 150 minutes per week. Check your feet daily for sores or changes.',
   'Endocrine', ARRAY['E11', 'E10'], 'en', true),

  ('Stress Management Techniques',
   'Chronic stress affects your health. Practice mindfulness meditation for 10-15 minutes daily. Regular physical activity reduces stress hormones. Maintain social connections. Set realistic goals and priorities. Consider professional counseling if stress becomes overwhelming.',
   'Mental Health', ARRAY['F43', 'Z73'], 'en', true),

  ('Înțelegerea Depresiei',
   'Depresia este o afecțiune frecventă de sănătate mintală care afectează modul în care vă simțiți, gândiți și acționați. Provoacă sentimente de tristețe și pierderea interesului pentru activitățile pe care le-ați bucurat odată. Depresia este tratabilă — discutați cu medicul dumneavoastră.',
   'Sănătate Mintală', ARRAY['F32', 'F33'], 'ro', true),

  ('Gestionarea Anxietății',
   'Tulburările de anxietate implică mai mult decât îngrijorare temporară. Tehnicile includ respirația profundă, relaxarea musculară progresivă, terapia cognitiv-comportamentală și medicația atunci când este necesar.',
   'Sănătate Mintală', ARRAY['F41', 'F40'], 'ro', true);
