-- ============================================
-- MindCare AI — Demo Seed Data
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. Create demo user profile
INSERT INTO public.users (id, full_name, email, specialty, license_number, role, settings)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  'Dr. Maria Ionescu',
  'demo@mindcare.local',
  'family_medicine',
  'RO-FM-2024-1234',
  'clinician',
  '{"audio_quality": "high", "silence_threshold": 3}'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  specialty = EXCLUDED.specialty,
  license_number = EXCLUDED.license_number;

-- 2. Create 8 patients
INSERT INTO public.patients (user_id, full_name, mrn, date_of_birth, gender, contact_info) VALUES
  ('00000000-0000-0000-0000-000000000000', 'Alexandru Popescu', 'MRN-2024-001', '1985-03-15', 'male', '{"phone": "+40 721 123 456", "email": "alex.popescu@email.ro"}'::jsonb),
  ('00000000-0000-0000-0000-000000000000', 'Elena Dumitrescu', 'MRN-2024-002', '1972-08-22', 'female', '{"phone": "+40 733 234 567", "email": "elena.d@email.ro"}'::jsonb),
  ('00000000-0000-0000-0000-000000000000', 'Mihai Constantinescu', 'MRN-2024-003', '1990-11-07', 'male', '{"phone": "+40 745 345 678", "email": "mihai.c@email.ro"}'::jsonb),
  ('00000000-0000-0000-0000-000000000000', 'Ana-Maria Radu', 'MRN-2024-004', '1968-01-30', 'female', '{"phone": "+40 722 456 789", "email": "ana.radu@email.ro"}'::jsonb),
  ('00000000-0000-0000-0000-000000000000', 'Cristian Munteanu', 'MRN-2024-005', '1995-06-12', 'male', '{"phone": "+40 756 567 890", "email": "cristian.m@email.ro"}'::jsonb),
  ('00000000-0000-0000-0000-000000000000', 'Sofia Marinescu', 'MRN-2024-006', '2001-09-25', 'female', '{"phone": "+40 734 678 901", "email": "sofia.marinescu@email.ro"}'::jsonb),
  ('00000000-0000-0000-0000-000000000000', 'Dragoș Popa', 'MRN-2024-007', '1958-04-18', 'male', '{"phone": "+40 721 789 012", "email": "dragos.popa@email.ro"}'::jsonb),
  ('00000000-0000-0000-0000-000000000000', 'Ioana Stoica', 'MRN-2024-008', '1983-12-03', 'female', '{"phone": "+40 744 890 123", "email": "ioana.stoica@email.ro"}'::jsonb);

-- 3. Create consultations (using patient IDs from above)
DO $$
DECLARE
  p_ids uuid[];
  c_ids uuid[];
  c_id uuid;
  p_names text[] := ARRAY['Alexandru Popescu','Elena Dumitrescu','Mihai Constantinescu','Ana-Maria Radu','Cristian Munteanu','Sofia Marinescu','Dragoș Popa','Ioana Stoica'];
BEGIN
  -- Get patient IDs in order
  SELECT array_agg(id ORDER BY mrn) INTO p_ids
  FROM public.patients
  WHERE user_id = '00000000-0000-0000-0000-000000000000';

  c_ids := ARRAY[]::uuid[];

  -- Today: Alexandru - Follow-up (note_generated)
  INSERT INTO public.consultations (user_id, patient_id, visit_type, status, consent_given, consent_timestamp, recording_duration_seconds, created_at, metadata)
  VALUES ('00000000-0000-0000-0000-000000000000', p_ids[1], 'Follow-up Visit', 'note_generated', true, now() - interval '3 hours', 847, now() - interval '3 hours',
    jsonb_build_object('patient_name', 'Alexandru Popescu', 'diagnosis', 'Hypertension', 'risk_status', 'watch', 'patient_code', 'MRN-2024-001'))
  RETURNING id INTO c_id;
  c_ids := c_ids || c_id;

  -- Today: Elena - New Patient (transcribed)
  INSERT INTO public.consultations (user_id, patient_id, visit_type, status, consent_given, consent_timestamp, recording_duration_seconds, created_at, metadata)
  VALUES ('00000000-0000-0000-0000-000000000000', p_ids[2], 'New Patient Visit', 'transcribed', true, now() - interval '2 hours', 1234, now() - interval '2 hours',
    jsonb_build_object('patient_name', 'Elena Dumitrescu', 'diagnosis', 'Type 2 Diabetes', 'risk_status', 'at_risk', 'patient_code', 'MRN-2024-002'))
  RETURNING id INTO c_id;
  c_ids := c_ids || c_id;

  -- Today: Mihai - Check-up (finalized)
  INSERT INTO public.consultations (user_id, patient_id, visit_type, status, consent_given, consent_timestamp, recording_duration_seconds, created_at, metadata)
  VALUES ('00000000-0000-0000-0000-000000000000', p_ids[3], 'Routine Check-up', 'finalized', true, now() - interval '5 hours', 623, now() - interval '5 hours',
    jsonb_build_object('patient_name', 'Mihai Constantinescu', 'diagnosis', 'Seasonal allergies', 'risk_status', 'normal', 'patient_code', 'MRN-2024-003'))
  RETURNING id INTO c_id;
  c_ids := c_ids || c_id;

  -- Today: Cristian - Urgent (scheduled)
  INSERT INTO public.consultations (user_id, patient_id, visit_type, status, consent_given, consent_timestamp, recording_duration_seconds, created_at, metadata)
  VALUES ('00000000-0000-0000-0000-000000000000', p_ids[5], 'Urgent Care', 'scheduled', true, now() - interval '30 minutes', null, now() - interval '30 minutes',
    jsonb_build_object('patient_name', 'Cristian Munteanu', 'diagnosis', '—', 'risk_status', 'normal', 'patient_code', 'MRN-2024-005'))
  RETURNING id INTO c_id;
  c_ids := c_ids || c_id;

  -- Yesterday: Ana-Maria (finalized)
  INSERT INTO public.consultations (user_id, patient_id, visit_type, status, consent_given, consent_timestamp, recording_duration_seconds, created_at, metadata)
  VALUES ('00000000-0000-0000-0000-000000000000', p_ids[4], 'Follow-up Visit', 'finalized', true, now() - interval '26 hours', 956, now() - interval '26 hours',
    jsonb_build_object('patient_name', 'Ana-Maria Radu', 'diagnosis', 'Chronic back pain', 'risk_status', 'watch', 'patient_code', 'MRN-2024-004'))
  RETURNING id INTO c_id;
  c_ids := c_ids || c_id;

  -- Yesterday: Sofia (finalized)
  INSERT INTO public.consultations (user_id, patient_id, visit_type, status, consent_given, consent_timestamp, recording_duration_seconds, created_at, metadata)
  VALUES ('00000000-0000-0000-0000-000000000000', p_ids[6], 'New Patient Visit', 'finalized', true, now() - interval '28 hours', 1102, now() - interval '28 hours',
    jsonb_build_object('patient_name', 'Sofia Marinescu', 'diagnosis', 'Anxiety disorder', 'risk_status', 'normal', 'patient_code', 'MRN-2024-006'))
  RETURNING id INTO c_id;
  c_ids := c_ids || c_id;

  -- 3 days ago: Dragoș (finalized)
  INSERT INTO public.consultations (user_id, patient_id, visit_type, status, consent_given, consent_timestamp, recording_duration_seconds, created_at, metadata)
  VALUES ('00000000-0000-0000-0000-000000000000', p_ids[7], 'Specialist Consultation', 'finalized', true, now() - interval '72 hours', 1567, now() - interval '72 hours',
    jsonb_build_object('patient_name', 'Dragoș Popa', 'diagnosis', 'Atrial fibrillation', 'risk_status', 'at_risk', 'patient_code', 'MRN-2024-007'))
  RETURNING id INTO c_id;
  c_ids := c_ids || c_id;

  -- 3 days ago: Ioana (note_generated)
  INSERT INTO public.consultations (user_id, patient_id, visit_type, status, consent_given, consent_timestamp, recording_duration_seconds, created_at, metadata)
  VALUES ('00000000-0000-0000-0000-000000000000', p_ids[8], 'Telehealth', 'note_generated', true, now() - interval '74 hours', 445, now() - interval '74 hours',
    jsonb_build_object('patient_name', 'Ioana Stoica', 'diagnosis', 'Migraine', 'risk_status', 'normal', 'patient_code', 'MRN-2024-008'))
  RETURNING id INTO c_id;
  c_ids := c_ids || c_id;

  -- Last week: Alexandru follow-up (finalized)
  INSERT INTO public.consultations (user_id, patient_id, visit_type, status, consent_given, consent_timestamp, recording_duration_seconds, created_at, metadata)
  VALUES ('00000000-0000-0000-0000-000000000000', p_ids[1], 'Follow-up Visit', 'finalized', true, now() - interval '7 days', 734, now() - interval '7 days',
    jsonb_build_object('patient_name', 'Alexandru Popescu', 'diagnosis', 'Hypertension follow-up', 'risk_status', 'normal', 'patient_code', 'MRN-2024-001'))
  RETURNING id INTO c_id;
  c_ids := c_ids || c_id;

  -- Last week: Ana-Maria mental health (finalized)
  INSERT INTO public.consultations (user_id, patient_id, visit_type, status, consent_given, consent_timestamp, recording_duration_seconds, created_at, metadata)
  VALUES ('00000000-0000-0000-0000-000000000000', p_ids[4], 'Mental Health Session', 'finalized', true, now() - interval '170 hours', 2845, now() - interval '170 hours',
    jsonb_build_object('patient_name', 'Ana-Maria Radu', 'diagnosis', 'Depression screening', 'risk_status', 'watch', 'patient_code', 'MRN-2024-004'))
  RETURNING id INTO c_id;
  c_ids := c_ids || c_id;

  -- 4. Create transcripts for all consultations except scheduled
  FOR i IN 1..array_length(c_ids, 1) LOOP
    IF i != 4 THEN  -- Skip scheduled consultation
      INSERT INTO public.transcripts (consultation_id, full_text, segments, language, provider)
      VALUES (c_ids[i],
        '[Doctor]: Bună ziua, cum vă simțiți astăzi?
[Patient]: Nu prea bine, doctore. Am probleme de vreo două săptămâni.
[Doctor]: Povestiți-mi mai multe despre simptome.
[Patient]: A început treptat și s-a agravat progresiv.
[Doctor]: Ați observat și alte schimbări? Oboseală?
[Patient]: Da, oboseală și dureri de cap ocazionale.
[Doctor]: Să vă examinez. Voi comanda și câteva analize.',
        '[{"speaker":"doctor","text":"Bună ziua, cum vă simțiți astăzi?","start_time":0,"end_time":2.8,"confidence":0.96},{"speaker":"patient","text":"Nu prea bine, doctore. Am probleme de vreo două săptămâni.","start_time":3.2,"end_time":7.5,"confidence":0.93},{"speaker":"doctor","text":"Povestiți-mi mai multe despre simptome.","start_time":8.0,"end_time":10.2,"confidence":0.97},{"speaker":"patient","text":"A început treptat și s-a agravat progresiv.","start_time":10.8,"end_time":14.0,"confidence":0.94},{"speaker":"doctor","text":"Ați observat și alte schimbări? Oboseală?","start_time":14.5,"end_time":17.3,"confidence":0.98},{"speaker":"patient","text":"Da, oboseală și dureri de cap ocazionale.","start_time":17.8,"end_time":21.0,"confidence":0.91}]'::jsonb,
        'ro', 'deepgram');
    END IF;
  END LOOP;

  -- 5. Create clinical notes for finalized + note_generated consultations
  -- Indices: 1(note_gen), 3(fin), 5(fin), 6(fin), 7(fin), 8(note_gen), 9(fin), 10(fin)
  FOR i IN ARRAY[1,3,5,6,7,8,9,10] LOOP
    IF i <= array_length(c_ids, 1) THEN
      INSERT INTO public.clinical_notes (consultation_id, sections, billing_codes, status, ai_model, generation_metadata, finalized_at, finalized_by)
      VALUES (c_ids[i],
        '[{"title":"Subiectiv","content":"Pacientul/a se prezintă cu simptome progresive de aproximativ 2 săptămâni. Raportează oboseală, dureri de cap ocazionale. Neagă febră, frisoane sau scădere ponderală involuntară. Apetit relativ normal, somn perturbat.","order":0},{"title":"Obiectiv","content":"Semne vitale: TA 130/85 mmHg, AV 78 bpm, Temp 36.8°C, SpO2 98%, FR 16.\nStare generală: Alert/ă, orientat/ă temporo-spațial, fără suferință acută.\nCardiovascular: Ritm regulat, fără sufluri.\nPulmonar: Murmur vezicular bilateral, fără raluri.\nAbdomen: Suplu, nedureros, neîncordat.","order":1},{"title":"Evaluare","content":"Diagnostic principal bazat pe examinare clinică și anamneză. Stare stabilă pe tratamentul actual. Se recomandă monitorizare continuă.","order":2},{"title":"Plan","content":"1. Continuare medicație curentă conform prescripției\n2. Analize de laborator: hemogramă completă, biochimie, HbA1c\n3. Control la 4 săptămâni\n4. Consiliere privind modificările stilului de viață\n5. Semne de alarmă discutate cu pacientul/a","order":3}]'::jsonb,
        '[{"code":"I10","system":"ICD-10","description":"Hipertensiune arterială esențială","confidence":0.85,"rationale":"Consistent cu prezentarea clinică","accepted":true},{"code":"E11.9","system":"ICD-10","description":"Diabet zaharat tip 2, fără complicații","confidence":0.72,"rationale":"Diagnostic diferențial","accepted":false},{"code":"99214","system":"CPT","description":"Consultație pacient cunoscut, complexitate moderată","confidence":0.9,"rationale":"Consultație 25 min, decizie moderată","accepted":true}]'::jsonb,
        CASE WHEN i IN (1,8) THEN 'draft' ELSE 'finalized' END,
        'claude-sonnet-4-20250514',
        '{}'::jsonb,
        CASE WHEN i NOT IN (1,8) THEN now() ELSE null END,
        CASE WHEN i NOT IN (1,8) THEN '00000000-0000-0000-0000-000000000000' ELSE null END
      );
    END IF;
  END LOOP;

  RAISE NOTICE 'Seed complete! Patients: 8, Consultations: %, Notes: 8, Transcripts: 9', array_length(c_ids, 1);
END $$;
