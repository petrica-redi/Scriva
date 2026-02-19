-- ============================================
-- MindCare AI — Demo Seed Data (Mental Health)
-- Realistic psychiatric/psychological data
-- Romanian names, bilingual content
-- ============================================

-- Clean existing data
DELETE FROM public.audit_log;
DELETE FROM public.clinical_notes;
DELETE FROM public.transcripts;
DELETE FROM public.consultations;
DELETE FROM public.patients;
DELETE FROM public.note_templates;
DELETE FROM public.users;

-- ============================================
-- 1. CLINICIANS
-- ============================================

INSERT INTO public.users (id, full_name, specialty, license_number, role, settings) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Dr. Ana Petrescu', 'psychiatry', 'RO-PSY-2018-0412', 'clinician',
   '{"audio_quality":"high","silence_threshold":3,"default_visit_type":"Psychiatric Follow-up","theme":"light"}'::jsonb),
  ('00000000-0000-0000-0000-000000000002', 'Dr. Radu Marinescu', 'clinical_psychology', 'RO-PSI-2015-0287', 'clinician',
   '{"audio_quality":"high","silence_threshold":3,"default_visit_type":"Psychotherapy Session","theme":"light"}'::jsonb),
  ('00000000-0000-0000-0000-000000000003', 'Dr. Irina Vlad', 'psychotherapy', 'RO-PT-2012-0156', 'clinician',
   '{"audio_quality":"high","silence_threshold":3,"default_visit_type":"Psychotherapy Session","theme":"dark"}'::jsonb);

-- Keep the demo user ID for backward compatibility
INSERT INTO public.users (id, full_name, specialty, license_number, role, settings) VALUES
  ('00000000-0000-0000-0000-000000000000', 'Dr. Ana Petrescu', 'psychiatry', 'RO-PSY-2018-0412', 'clinician',
   '{"audio_quality":"high","silence_threshold":3,"default_visit_type":"Psychiatric Follow-up","theme":"light"}'::jsonb)
ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, specialty = EXCLUDED.specialty;

-- ============================================
-- 2. NOTE TEMPLATES
-- ============================================

INSERT INTO public.note_templates (id, user_id, name, description, specialty, is_system, is_published, sections) VALUES
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
   'Evaluare Psihiatrică Inițială', 'Evaluare completă pacient nou - psihiatrie', 'psychiatry', false, true,
   '[{"id":"motiv","title":"Motivul Prezentării","prompt":"De ce vine pacientul","order":1},
     {"id":"anamneza","title":"Anamneza Bolii Actuale","prompt":"Istoricul simptomelor","order":2},
     {"id":"antecedente","title":"Antecedente Personale și Heredocolaterale","prompt":"Istoric medical și familial","order":3},
     {"id":"esm","title":"Examenul Stării Mintale","prompt":"Aspect, comportament, vorbire, dispoziție, afect, gândire, percepție, cogniție, insight, judecată","order":4},
     {"id":"evaluare_risc","title":"Evaluarea Riscului","prompt":"Ideație suicidară, autoagresivitate, heteroagresivitate","order":5},
     {"id":"diagnostic","title":"Impresie Diagnostică","prompt":"ICD-10, DSM-5","order":6},
     {"id":"plan","title":"Plan Terapeutic","prompt":"Medicație, psihoterapie, recomandări","order":7}]'::jsonb),

  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002',
   'Ședință Psihoterapie CBT', 'Documentare ședință terapie cognitiv-comportamentală', 'clinical_psychology', false, true,
   '[{"id":"obiective","title":"Obiectivele Ședinței","prompt":"Ce s-a propus pentru această ședință","order":1},
     {"id":"continut","title":"Conținutul Ședinței","prompt":"Rezumatul discuției și intervențiilor","order":2},
     {"id":"interventii","title":"Intervenții Utilizate","prompt":"Tehnici CBT aplicate","order":3},
     {"id":"teme","title":"Teme pentru Acasă","prompt":"Exerciții și sarcini","order":4},
     {"id":"progres","title":"Evaluarea Progresului","prompt":"Scor PHQ-9, GAD-7, observații","order":5}]'::jsonb),

  ('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000003',
   'Ședință Psihoterapie Psihodinamică', 'Documentare ședință orientare psihodinamică', 'psychotherapy', false, true,
   '[{"id":"teme","title":"Teme Centrale","prompt":"Teme și conflicte explorate","order":1},
     {"id":"transfer","title":"Dinamica Transferului","prompt":"Manifestări transferențiale și contratransferențiale","order":2},
     {"id":"insight","title":"Insight-uri și Elaborări","prompt":"Ce a înțeles pacientul","order":3},
     {"id":"evolutie","title":"Evoluția Procesului Terapeutic","prompt":"Stadiul terapiei","order":4}]'::jsonb);

-- ============================================
-- 3. PATIENTS (14 patients)
-- ============================================

DO $$
DECLARE
  dr_ana uuid := '00000000-0000-0000-0000-000000000001';
  dr_radu uuid := '00000000-0000-0000-0000-000000000002';
  dr_irina uuid := '00000000-0000-0000-0000-000000000003';
  demo_uid uuid := '00000000-0000-0000-0000-000000000000';

  -- Patient IDs (fixed for referencing)
  p01 uuid := 'a0000000-0000-0000-0000-000000000001'; -- MDD + suicidal ideation
  p02 uuid := 'a0000000-0000-0000-0000-000000000002'; -- GAD
  p03 uuid := 'a0000000-0000-0000-0000-000000000003'; -- Bipolar I
  p04 uuid := 'a0000000-0000-0000-0000-000000000004'; -- PTSD
  p05 uuid := 'a0000000-0000-0000-0000-000000000005'; -- BPD
  p06 uuid := 'a0000000-0000-0000-0000-000000000006'; -- OCD
  p07 uuid := 'a0000000-0000-0000-0000-000000000007'; -- Schizophrenia
  p08 uuid := 'a0000000-0000-0000-0000-000000000008'; -- ADHD adult
  p09 uuid := 'a0000000-0000-0000-0000-000000000009'; -- Anorexia
  p10 uuid := 'a0000000-0000-0000-0000-000000000010'; -- Alcohol SUD
  p11 uuid := 'a0000000-0000-0000-0000-000000000011'; -- Panic + Agoraphobia
  p12 uuid := 'a0000000-0000-0000-0000-000000000012'; -- Adjustment Disorder
  p13 uuid := 'a0000000-0000-0000-0000-000000000013'; -- Bipolar II
  p14 uuid := 'a0000000-0000-0000-0000-000000000014'; -- MDD recurrent

  -- Consultation IDs
  c_id uuid;
BEGIN

-- Insert patients (all clinicians see them, assigned to demo_uid for compatibility + specific doctors)
INSERT INTO public.patients (id, user_id, full_name, mrn, date_of_birth, gender, contact_info) VALUES
  (p01, dr_ana, 'Andrei Gheorghiu', 'MC-2025-001', '1988-05-14', 'male',
   '{"phone":"+40 721 334 556","email":"andrei.gheorghiu@email.ro","address":"Str. Mihai Eminescu 42, București","emergency_contact":"Maria Gheorghiu (soție) - +40 733 112 445"}'::jsonb),
  (p02, dr_radu, 'Elena Stanciu', 'MC-2025-002', '1995-02-28', 'female',
   '{"phone":"+40 745 223 891","email":"elena.stanciu@email.ro","address":"Bd. Unirii 15, București","emergency_contact":"Ion Stanciu (tată) - +40 722 556 778"}'::jsonb),
  (p03, dr_ana, 'Bogdan Nicolescu', 'MC-2025-003', '1979-11-03', 'male',
   '{"phone":"+40 733 445 667","email":"bogdan.nicolescu@email.ro","address":"Str. Victoriei 78, Cluj-Napoca","emergency_contact":"Ana Nicolescu (mamă) - +40 744 889 012"}'::jsonb),
  (p04, dr_irina, 'Cristina Dumitrescu', 'MC-2025-004', '1986-08-19', 'female',
   '{"phone":"+40 756 112 334","email":"cristina.d@email.ro","address":"Str. Republicii 23, Timișoara","emergency_contact":"Mihai Dumitrescu (frate) - +40 721 667 889"}'::jsonb),
  (p05, dr_irina, 'Raluca Marin', 'MC-2025-005', '1997-01-07', 'female',
   '{"phone":"+40 722 998 112","email":"raluca.marin@email.ro","address":"Str. Zorilor 5, Cluj-Napoca","emergency_contact":"Dana Marin (mamă) - +40 745 334 556"}'::jsonb),
  (p06, dr_radu, 'Tudor Ionescu', 'MC-2025-006', '1991-06-22', 'male',
   '{"phone":"+40 744 556 778","email":"tudor.ionescu@email.ro","address":"Bd. Eroilor 31, Brașov","emergency_contact":"Ioana Ionescu (soție) - +40 733 778 990"}'::jsonb),
  (p07, dr_ana, 'Florin Popescu', 'MC-2025-007', '1983-03-30', 'male',
   '{"phone":"+40 733 112 445","email":"florin.popescu@email.ro","address":"Str. Fabricii 12, Iași","emergency_contact":"Gheorghe Popescu (tată) - +40 756 445 667"}'::jsonb),
  (p08, dr_radu, 'Diana Vasilescu', 'MC-2025-008', '1993-09-15', 'female',
   '{"phone":"+40 721 889 001","email":"diana.v@email.ro","address":"Str. Primăverii 8, București","emergency_contact":"Adrian Vasilescu (soț) - +40 744 112 334"}'::jsonb),
  (p09, dr_irina, 'Anca Moldovan', 'MC-2025-009', '2003-04-11', 'female',
   '{"phone":"+40 745 667 889","email":"anca.moldovan@email.ro","address":"Str. Libertății 19, Sibiu","emergency_contact":"Simona Moldovan (mamă) - +40 722 001 223"}'::jsonb),
  (p10, dr_ana, 'Marius Ciobanu', 'MC-2025-010', '1975-12-08', 'male',
   '{"phone":"+40 756 334 556","email":"marius.ciobanu@email.ro","address":"Str. Gării 45, Constanța","emergency_contact":"Liliana Ciobanu (soție) - +40 733 556 778"}'::jsonb),
  (p11, dr_radu, 'Gabriela Popa', 'MC-2025-011', '1990-07-25', 'female',
   '{"phone":"+40 722 445 667","email":"gabriela.popa@email.ro","address":"Bd. Mamaia 92, Constanța","emergency_contact":"Vasile Popa (soț) - +40 744 778 990"}'::jsonb),
  (p12, dr_irina, 'Mihai Dobre', 'MC-2025-012', '1999-10-02', 'male',
   '{"phone":"+40 744 001 223","email":"mihai.dobre@email.ro","address":"Str. Câmpului 7, Oradea","emergency_contact":"Carmen Dobre (mamă) - +40 756 223 445"}'::jsonb),
  (p13, dr_ana, 'Simona Radu', 'MC-2025-013', '1987-02-18', 'female',
   '{"phone":"+40 733 889 001","email":"simona.radu@email.ro","address":"Str. Moților 33, Alba Iulia","emergency_contact":"Dan Radu (soț) - +40 721 001 112"}'::jsonb),
  (p14, dr_radu, 'Vlad Alexandrescu', 'MC-2025-014', '1982-06-30', 'male',
   '{"phone":"+40 745 112 334","email":"vlad.alex@email.ro","address":"Str. Aviatorilor 56, București","emergency_contact":"Irina Alexandrescu (soție) - +40 722 334 556"}'::jsonb);

-- Also insert patients under demo user for backward compat
INSERT INTO public.patients (user_id, full_name, mrn, date_of_birth, gender, contact_info)
SELECT '00000000-0000-0000-0000-000000000000', full_name, 'D-' || mrn, date_of_birth, gender, contact_info
FROM public.patients WHERE user_id = dr_ana
ON CONFLICT DO NOTHING;

-- ============================================
-- 4. CONSULTATIONS WITH TRANSCRIPTS AND NOTES
-- ============================================

-- =============================================
-- PATIENT 01: Andrei Gheorghiu — MDD + Suicidal Ideation (Dr. Ana - Psychiatry)
-- =============================================

-- Consultation 1: Initial Evaluation (4 weeks ago)
INSERT INTO public.consultations (id, user_id, patient_id, visit_type, status, consent_given, consent_timestamp, recording_duration_seconds, metadata, created_at)
VALUES ('c0000000-0000-0000-0001-000000000001', dr_ana, p01, 'Initial Evaluation', 'finalized', true, now() - interval '28 days', 3420, jsonb_build_object(
  'patient_name', 'Andrei Gheorghiu', 'patient_code', 'MC-2025-001',
  'diagnosis', 'Episod depresiv major, sever', 'icd_code', 'F32.2',
  'risk_flags', jsonb_build_array(
    jsonb_build_object('type', 'suicidal_ideation', 'severity', 'high', 'description', 'Pacientul exprimă gânduri recurente despre moarte și inutilitatea vieții', 'detected_at', (now() - interval '28 days')::text)
  )
), now() - interval '28 days');

INSERT INTO public.transcripts (consultation_id, full_text, segments, language, provider)
VALUES ('c0000000-0000-0000-0001-000000000001',
'[Doctor]: Bună ziua, domnule Gheorghiu. Sunt Dr. Petrescu. Vă rog, luați loc. Ce v-a adus astăzi la cabinet?
[Pacient]: Bună ziua, doamnă doctor. Nu mai pot... de vreo trei luni mă simt din ce în ce mai rău. Nu mai am chef de nimic.
[Doctor]: Înțeleg. Povestiți-mi mai multe despre ce simțiți. Când a început totul?
[Pacient]: A început după ce am pierdut jobul. La început am crezut că trece, dar... parcă s-a înrăutățit pe zi ce trece. Nu mai dorm, nu mai mănânc. Soția e disperată.
[Doctor]: Cum vă simțiți dimineața când vă treziți?
[Pacient]: Mă trezesc pe la 4 dimineața și nu mai pot adormi. Stau în pat și mă gândesc la toate lucrurile care au mers prost. Mă simt ca un eșec total.
[Doctor]: Ați menționat că vă simțiți un eșec. Puteți să detaliați aceste gânduri?
[Pacient]: Simt că sunt o povară pentru familie. Soția muncește și ea, dar fără salariul meu... Copiii au nevoie de lucruri și eu nu pot oferi nimic. Uneori mă gândesc că ar fi mai bine fără mine.
[Doctor]: Vreau să vă întreb direct, și vă rog să fiți sincer cu mine — aveți gânduri de a vă face rău sau de a nu mai fi în viață?
[Pacient]: ...Da. Nu că aș face ceva concret, dar... uneori, noaptea, mă gândesc că dacă nu m-aș mai trezi, ar fi mai simplu. Pentru toată lumea.
[Doctor]: Apreciez enorm că ați fost sincer cu mine. Aceste gânduri sunt un simptom al depresiei, nu reflectă realitatea. Aveți un plan concret de a vă face rău?
[Pacient]: Nu, nu am un plan. Nu aș putea face asta copiilor mei. Dar gândurile vin și nu le pot opri.
[Doctor]: Înțeleg. Aveți acces la medicamente în cantitate mare sau alte mijloace?
[Pacient]: Nu, nu păstrez nimic de genul ăsta în casă.
[Doctor]: Bine. Vom face un plan de siguranță împreună. Vreau să înțelegeți că depresia este o boală tratabilă. O să vă prescriu un antidepresiv — Sertralină 50mg — și vreau să vă văd săptămânal. Este esențial să luați medicamentul zilnic.
[Pacient]: O să încerc, doamnă doctor. Mulțumesc că mă ascultați.
[Doctor]: Nu trebuie să încercați singur. Soția dumneavoastră ar putea veni la următoarea ședință? Și vă dau numărul de telefon pentru urgențe — TelVerde Sănătate Mintală: 0800 801 200. Oricând simțiți acele gânduri, sunați.
[Pacient]: Da, o să vorbesc cu soția. Mulțumesc.',
'[{"speaker":"doctor","text":"Bună ziua, domnule Gheorghiu. Sunt Dr. Petrescu. Vă rog, luați loc. Ce v-a adus astăzi la cabinet?","start_time":0,"end_time":5.2,"confidence":0.97},
{"speaker":"patient","text":"Bună ziua, doamnă doctor. Nu mai pot... de vreo trei luni mă simt din ce în ce mai rău. Nu mai am chef de nimic.","start_time":5.8,"end_time":12.5,"confidence":0.94},
{"speaker":"doctor","text":"Înțeleg. Povestiți-mi mai multe despre ce simțiți. Când a început totul?","start_time":13.0,"end_time":17.2,"confidence":0.96},
{"speaker":"patient","text":"A început după ce am pierdut jobul. La început am crezut că trece, dar... parcă s-a înrăutățit pe zi ce trece. Nu mai dorm, nu mai mănânc. Soția e disperată.","start_time":18.0,"end_time":28.5,"confidence":0.92},
{"speaker":"doctor","text":"Cum vă simțiți dimineața când vă treziți?","start_time":29.0,"end_time":31.8,"confidence":0.98},
{"speaker":"patient","text":"Mă trezesc pe la 4 dimineața și nu mai pot adormi. Stau în pat și mă gândesc la toate lucrurile care au mers prost. Mă simt ca un eșec total.","start_time":32.5,"end_time":42.0,"confidence":0.93},
{"speaker":"doctor","text":"Ați menționat că vă simțiți un eșec. Puteți să detaliați aceste gânduri?","start_time":43.0,"end_time":47.5,"confidence":0.97},
{"speaker":"patient","text":"Simt că sunt o povară pentru familie. Soția muncește și ea, dar fără salariul meu... Copiii au nevoie de lucruri și eu nu pot oferi nimic. Uneori mă gândesc că ar fi mai bine fără mine.","start_time":48.0,"end_time":62.0,"confidence":0.91},
{"speaker":"doctor","text":"Vreau să vă întreb direct, și vă rog să fiți sincer cu mine — aveți gânduri de a vă face rău sau de a nu mai fi în viață?","start_time":63.0,"end_time":70.5,"confidence":0.96},
{"speaker":"patient","text":"Da. Nu că aș face ceva concret, dar... uneori, noaptea, mă gândesc că dacă nu m-aș mai trezi, ar fi mai simplu. Pentru toată lumea.","start_time":72.0,"end_time":83.0,"confidence":0.89}]'::jsonb,
'ro', 'deepgram');

INSERT INTO public.clinical_notes (consultation_id, template_id, sections, billing_codes, status, ai_model, generation_metadata, finalized_at, finalized_by)
VALUES ('c0000000-0000-0000-0001-000000000001', '10000000-0000-0000-0000-000000000001',
'[{"title":"Motivul Prezentării","content":"Pacient în vârstă de 36 ani, sex masculin, se prezintă pentru evaluare psihiatrică inițială la recomandarea medicului de familie. Acuze principale: dispoziție depresivă severă, insomnie, anorexie, gânduri de moarte recurente, debut de aproximativ 3 luni, precipitat de pierderea locului de muncă.","order":0},
{"title":"Anamneza Bolii Actuale","content":"Debutul simptomatologiei acum aproximativ 3 luni, în contextul pierderii locului de muncă. Evoluție progresiv agravantă.\n\nSimptome prezente:\n- Dispoziție depresivă persistentă, predominant matinal\n- Trezire matinală precoce (ora 4:00), incapacitate de readormi\n- Scăderea apetitului cu pierdere ponderală ~5 kg în 3 luni\n- Anhedonie marcată — lipsa plăcerii în activități anterior plăcute\n- Fatigabilitate severă, dificultăți de concentrare\n- Sentimente de inutilitate și vinovăție excesivă\n- Ideație suicidară pasivă — \"ar fi mai simplu dacă nu m-aș mai trezi\" — fără plan concret sau intenție activă\n- Retragere socială progresivă\n\nAntecedente psihiatrice: Primul episod depresiv. Neagă episoade anterioare.\nConsum substanțe: Neagă consum de alcool excesiv sau droguri.\nAntecedente heredocolaterale: Tatăl — posibil episod depresiv netratat.","order":1},
{"title":"Examenul Stării Mintale","content":"Aspect: Bărbat de vârstă corespunzătoare, îmbrăcat adecvat dar neglijent, igiena personală ușor afectată. Facies trist, privire în jos.\n\nComportament: Cooperant, dar cu inițiativă verbală redusă. Răspunde la întrebări cu latență. Mișcări lente (bradikinezie psihomotorie).\n\nVorbire: Ritm lent, volum scăzut, ton monoton. Latență în răspunsuri.\n\nDispoziție: \"Nu mai pot\" — pacientul descrie dispoziție sever depresivă.\n\nAfect: Restrâns, congruent cu dispoziția declarată. Lăcrimează când vorbește despre familie.\n\nGândire — proces: Coerent, logic, dar cu bradipsihie. Fără dezorganizare.\n\nGândire — conținut: Ideație suicidară pasivă (\"ar fi mai simplu fără mine\"), fără plan sau intenție. Teme de inutilitate, vinovăție, eșec. Neagă ideație homicidă.\n\nPercepție: Fără halucinații auditive sau vizuale. Fără iluzii.\n\nCogniție: Alert, orientat temporal, spațial și auto/allopsihic. Atenție și concentrare scăzute — necesită repetarea întrebărilor. Memorie de lucru afectată subiectiv.\n\nInsight: Parțial — recunoaște că \"ceva nu e bine\" dar minimizează severitatea.\n\nJudecată: Parțial afectată — decizii impulsive raportate (a refuzat oferte de muncă din convingerea că \"nu merită\").","order":2},
{"title":"Evaluarea Riscului","content":"NIVEL DE RISC: RIDICAT\n\nFactori de risc prezenți:\n- Ideație suicidară pasivă (actuală)\n- Episod depresiv sever\n- Sex masculin, grupa de vârstă 30-50\n- Pierdere recentă a locului de muncă (factor precipitant)\n- Insomnie severă\n- Izolare socială\n- Istoric familial posibil de depresie\n\nFactori protectivi:\n- Neagă plan sau intenție suicidară\n- Relație stabilă cu soția\n- Copii — motivație puternică de a trăi\n- Fără acces la mijloace letale\n- A acceptat tratamentul\n- Fără tentative anterioare\n\nPlan de siguranță elaborat: Da\nContact de urgență stabilit: Da (soția + TelVerde 0800 801 200)\nContract de siguranță: Verbal, acceptat","order":3},
{"title":"Impresie Diagnostică","content":"Diagnostic principal: F32.2 — Episod depresiv major, sever, fără simptome psihotice\nDiagnostic secundar: F51.0 — Insomnie non-organică\n\nSeveritate: Severă\nScor PHQ-9: 23/27 (depresie severă)\nGAF: 35 (afectare majoră în mai multe domenii)","order":4},
{"title":"Plan Terapeutic","content":"Farmacoterapie:\n1. Sertralină 50mg/zi, dimineața — titrare la 100mg după 2 săptămâni dacă e tolerată\n2. Mirtazapină 15mg seara — pentru insomnie și stimularea apetitului\n3. Lorazepam 1mg PRN (maxim 2 săptămâni) — pentru anxietatea acută\n\nPsihoterapie:\n- Referire către Dr. Marinescu pentru CBT săptămânal\n- Psihoeduc ție privind depresia și managementul gândurilor suicidare\n\nMonitorizare:\n- Control psihiatric săptămânal în primele 4 săptămâni\n- Analize: hemogramă, TSH, glicemie, funcție hepatică\n- Monitorizare telefonică la 48h\n\nIndicații pacient:\n- Plan de siguranță în scris, înmânat pacientului și soției\n- TelVerde Sănătate Mintală: 0800 801 200\n- Prezentare la UPU dacă ideația suicidară se intensifică","order":5}]'::jsonb,
'[{"code":"F32.2","system":"ICD-10","description":"Episod depresiv major, sever, fără simptome psihotice","confidence":0.95,"rationale":"Criteriile ICD-10 îndeplinite: dispoziție depresivă, anhedonie, fatigabilitate + insomnie, scădere ponderală, ideație suicidară","accepted":true},
{"code":"F51.0","system":"ICD-10","description":"Insomnie non-organică","confidence":0.82,"rationale":"Trezire matinală precoce persistentă","accepted":true},
{"code":"90792","system":"CPT","description":"Evaluare diagnostică psihiatrică","confidence":0.97,"rationale":"Evaluare inițială completă, 57 minute","accepted":true}]'::jsonb,
'finalized', 'claude-sonnet-4-20250514', '{"template":"Evaluare Psihiatrică Inițială"}'::jsonb,
now() - interval '27 days', dr_ana);

-- Consultation 2: Psychiatric Follow-up 2 weeks ago (medication noncompliance)
INSERT INTO public.consultations (id, user_id, patient_id, visit_type, status, consent_given, consent_timestamp, recording_duration_seconds, metadata, created_at)
VALUES ('c0000000-0000-0000-0001-000000000002', dr_ana, p01, 'Psychiatric Follow-up', 'finalized', true, now() - interval '14 days', 1860, jsonb_build_object(
  'patient_name', 'Andrei Gheorghiu', 'patient_code', 'MC-2025-001',
  'diagnosis', 'Episod depresiv major, sever', 'icd_code', 'F32.2',
  'risk_flags', jsonb_build_array(
    jsonb_build_object('type', 'suicidal_ideation', 'severity', 'medium', 'description', 'Ideație suicidară pasivă persistentă, dar intensitate redusă', 'detected_at', (now() - interval '14 days')::text),
    jsonb_build_object('type', 'medication_noncompliance', 'severity', 'high', 'description', 'Pacientul a întrerupt Sertralina timp de 5 zile fără consult medical', 'detected_at', (now() - interval '14 days')::text)
  )
), now() - interval '14 days');

INSERT INTO public.transcripts (consultation_id, full_text, segments, language, provider)
VALUES ('c0000000-0000-0000-0001-000000000002',
'[Doctor]: Bună ziua, Andrei. Cum vă simțiți de la ultima vizită? Ați reușit să luați medicamentele regulat?
[Pacient]: Bună ziua, doamnă doctor. Sincer... am luat Sertralina vreo săptămână, dar după aia am oprit-o vreo 5 zile.
[Doctor]: Ce s-a întâmplat? De ce ați oprit-o?
[Pacient]: M-a deranjat greața. Și am citit pe internet că antidepresivele creează dependență. M-am speriat.
[Doctor]: Înțeleg îngrijorarea. Dar greața este un efect secundar temporar, trece de obicei în 7-10 zile. Și antidepresivele ISRS nu creează dependență — nu sunt tranchilizante. A fost o perioadă dificilă fără ele?
[Pacient]: Da... acele 5 zile au fost groaznice. Am simțit că m-am întors la punctul zero. Nu dormeam deloc, plângeam tot timpul.
[Doctor]: Este important să nu opriți brusc medicația. Dacă aveți efecte secundare, mă sunați și ajustăm doza, nu o opriți singur. Cum sunt gândurile acelea... cele despre care am vorbit data trecută?
[Pacient]: Mai vin... dar parcă mai rar. Când iau pastilele, sunt mai puțin intense. A fost o zi săptămâna trecută când m-am gândit serios... dar am sunat la numărul pe care mi l-ați dat.
[Doctor]: Ați sunat la TelVerde? Asta este un lucru extraordinar de bine. Ce s-a întâmplat?
[Pacient]: Am vorbit cu cineva vreo 20 de minute. M-a ajutat să mă liniștesc. A fost bine.
[Doctor]: Sunt mândră de dumneavoastră. Acum, hai să discutăm despre ajustarea tratamentului. Voi crește doza de Sertralină la 100mg. Luați-o după masă, cu un pahar de apă — reduce greața. Mirtazapina rămâne.
[Pacient]: O să încerc. De data asta nu mai opresc fără să vă sun.
[Doctor]: Asta e tot ce vă cer. Și ați fost la Dr. Marinescu pentru psihoterapie?
[Pacient]: Am o programare săptămâna viitoare.
[Doctor]: Foarte bine. Ne vedem peste o săptămână.',
'[{"speaker":"doctor","text":"Bună ziua, Andrei. Cum vă simțiți de la ultima vizită? Ați reușit să luați medicamentele regulat?","start_time":0,"end_time":6.5,"confidence":0.96}]'::jsonb,
'ro', 'deepgram');

INSERT INTO public.clinical_notes (consultation_id, template_id, sections, billing_codes, status, ai_model, generation_metadata, finalized_at, finalized_by)
VALUES ('c0000000-0000-0000-0001-000000000002', '10000000-0000-0000-0000-000000000001',
'[{"title":"Motivul Prezentării","content":"Control psihiatric la 2 săptămâni. Pacient cu F32.2 — episod depresiv major sever, aflat sub tratament cu Sertralină și Mirtazapină.","order":0},
{"title":"Evoluție","content":"Pacientul raportează neaderență la tratament — a întrerupt Sertralina 50mg timp de 5 zile din cauza grețurilor și a anxietății legate de dependență (informații incorecte din surse online). Recrudescență simptomatică în perioada de întrerupere. A reluat medicația. Raportează apel la TelVerde Sănătate Mintală într-un moment de criză — utilizare adecvată a resurselor de siguranță. Ideație suicidară pasivă persistentă dar cu intensitate ușor redusă comparativ cu evaluarea inițială.","order":1},
{"title":"Examenul Stării Mintale","content":"Aspect: Ușor ameliorat față de vizita anterioară, îmbrăcat adecvat.\nComportament: Cooperant, contact vizual intermitent.\nVorbire: Ritm ușor lent, volum normal.\nDispoziție: \"Puțin mai bine când iau pastilele\"\nAfect: Restrâns, congruent. Lăcrimează la discuția despre întreruperea medicației.\nGândire: Coerentă, fără dezorganizare. Persistă ideație suicidară pasivă, fără plan.\nPercepție: Fără halucinații.\nCogniție: Alert, orientat. Concentrare ușor ameliorată.\nInsight: În ameliorare — recunoaște legătura între medicație și simptome.\nJudecată: Parțial ameliorată.","order":2},
{"title":"Plan Terapeutic","content":"1. Sertralină: creștere la 100mg/zi, administrare postprandial\n2. Mirtazapină 15mg seara — continuare\n3. Lorazepam — sistare (nu mai este necesar)\n4. Psihoeduc ție: dependența vs. adaptare fiziologică, importanța continuității\n5. Control: 1 săptămână\n6. Plan de siguranță: reconfirmat","order":3}]'::jsonb,
'[{"code":"F32.2","system":"ICD-10","description":"Episod depresiv major, sever","confidence":0.93,"rationale":"Persistă simptomatologia depresivă severă","accepted":true},
{"code":"99214","system":"CPT","description":"Consultație pacient cunoscut, complexitate moderată","confidence":0.92,"rationale":"Control 31 minute, complexitate moderată","accepted":true}]'::jsonb,
'finalized', 'claude-sonnet-4-20250514', '{}'::jsonb, now() - interval '13 days', dr_ana);

-- Consultation 3: Crisis intervention (3 days ago)
INSERT INTO public.consultations (id, user_id, patient_id, visit_type, status, consent_given, consent_timestamp, recording_duration_seconds, metadata, created_at)
VALUES ('c0000000-0000-0000-0001-000000000003', dr_ana, p01, 'Crisis Intervention', 'note_generated', true, now() - interval '3 days', 2640, jsonb_build_object(
  'patient_name', 'Andrei Gheorghiu', 'patient_code', 'MC-2025-001',
  'diagnosis', 'Episod depresiv major, sever', 'icd_code', 'F32.2',
  'risk_flags', jsonb_build_array(
    jsonb_build_object('type', 'suicidal_ideation', 'severity', 'critical', 'description', 'Ideație suicidară activă cu plan vag — necesită intervenție imediată', 'detected_at', (now() - interval '3 days')::text),
    jsonb_build_object('type', 'deterioration', 'severity', 'high', 'description', 'Agravare acută după conflict familial', 'detected_at', (now() - interval '3 days')::text)
  )
), now() - interval '3 days');

INSERT INTO public.transcripts (consultation_id, full_text, segments, language, provider)
VALUES ('c0000000-0000-0000-0001-000000000003',
'[Doctor]: Andrei, ați sunat de urgență. Ce s-a întâmplat?
[Pacient]: Doamnă doctor... am avut o ceartă cumplită cu soția aseară. A spus că nu mai poate. Că dacă nu mă fac bine, pleacă cu copiii.
[Doctor]: Asta trebuie să fi fost extrem de dureros. Cum vă simțiți acum?
[Pacient]: Simt că totul s-a prăbușit. M-am gândit toată noaptea... m-am gândit serios să termin cu totul. Am stat și m-am uitat la cutia cu medicamente.
[Doctor]: Andrei, ați luat mai multe pastile decât trebuia?
[Pacient]: Nu. Nu am luat nimic. Dar m-am gândit. M-am gândit serios. Și asta m-a speriat atât de tare încât v-am sunat.
[Doctor]: Ați făcut cel mai bun lucru posibil — ați cerut ajutor. Asta arată o parte din dumneavoastră care vrea să trăiască. Unde sunt acum medicamentele?
[Pacient]: Le-a luat soția. I-am spus ce am simțit și le-a luat ea.
[Doctor]: Foarte bine. Este soția acolo cu dumneavoastră?
[Pacient]: Da, e în camera cealaltă. Nu mai vorbim, dar e aici.
[Doctor]: Vreau să facem câteva lucruri concret acum. Mai întâi, trebuie să ne asigurăm că sunteți în siguranță. Apoi, trebuie să ajustăm tratamentul. Și vreau să stabilim un plan clar pentru următoarele 48 de ore.
[Pacient]: Da... da, vreau asta. Nu vreau să simt ce am simțit aseară niciodată.
[Doctor]: Voi adăuga Quetiapină 25mg seara — va ajuta cu somnul și cu aceste gânduri intruzive. Continuați Sertralina 100mg. Vreau să veniți mâine la cabinet. Și vreau să vorbesc cu soția dumneavoastră acum, dacă sunteți de acord.
[Pacient]: Da, o chem.',
'[{"speaker":"doctor","text":"Andrei, ați sunat de urgență. Ce s-a întâmplat?","start_time":0,"end_time":3.8,"confidence":0.97}]'::jsonb,
'ro', 'deepgram');

INSERT INTO public.clinical_notes (consultation_id, template_id, sections, billing_codes, status, ai_model, generation_metadata)
VALUES ('c0000000-0000-0000-0001-000000000003', '10000000-0000-0000-0000-000000000001',
'[{"title":"Motivul Prezentării","content":"URGENȚĂ PSIHIATRICĂ. Pacient cu F32.2 cunoscut, solicită consultație de urgență telefonic. Raportează agravare acută a ideației suicidare după conflict conjugal. A avut gânduri active de suicid prin supradoză medicamentoasă. Nu a acționat. Medicamentele au fost securizate de soție.","order":0},
{"title":"Evaluarea Riscului","content":"NIVEL DE RISC: CRITIC\n\nEveniment precipitant: Conflict conjugal sever cu amenințare de separare.\nIdeație suicidară: ACTIVĂ — plan vag (supradoză), mijloace securizate de soție.\nIntenție: Ambivalentă — \"m-am speriat de ce am simțit\"\nAcces la mijloace: Eliminat temporar (medicamente la soție)\n\nFactori de risc acuți:\n- Ideație suicidară cu plan vag\n- Criză interpersonală acută\n- Insomnie totală (noapte precedentă)\n- Sentimente de deznădejde\n\nFactori protectivi:\n- A cerut ajutor spontan\n- Soția prezentă\n- Medicamentele securizate\n- Exprimă teamă față de gândurile suicidare\n\nDecizie: Tratament ambulator intensiv cu monitorizare zilnică. Internare nu este necesară la acest moment dar rămâne opțiune dacă nu se stabilizează.","order":1},
{"title":"Plan Terapeutic","content":"1. Quetiapină 25mg seara — adăugat pentru sedare și efect antidepresiv adjuvant\n2. Sertralină 100mg — continuare\n3. Mirtazapină 15mg — continuare\n4. Prezentare la cabinet mâine\n5. Soția informată și instruită (cu acordul pacientului)\n6. Plan de siguranță actualizat\n7. Dacă simptomele se agravează: prezentare UPU / internare voluntară","order":2}]'::jsonb,
'[{"code":"F32.2","system":"ICD-10","description":"Episod depresiv major, sever","confidence":0.97,"rationale":"Criză suicidară în contextul episodului depresiv sever","accepted":true},
{"code":"90839","system":"CPT","description":"Psihoterapie de criză, primele 60 min","confidence":0.95,"rationale":"Intervenție de criză 44 minute","accepted":true}]'::jsonb,
'draft', 'claude-sonnet-4-20250514', '{}'::jsonb);


-- =============================================
-- PATIENT 02: Elena Stanciu — GAD (Dr. Radu - CBT)
-- =============================================

INSERT INTO public.consultations (id, user_id, patient_id, visit_type, status, consent_given, consent_timestamp, recording_duration_seconds, metadata, created_at)
VALUES ('c0000000-0000-0000-0002-000000000001', dr_radu, p02, 'Initial Evaluation', 'finalized', true, now() - interval '21 days', 2940, jsonb_build_object(
  'patient_name', 'Elena Stanciu', 'patient_code', 'MC-2025-002',
  'diagnosis', 'Tulburare de anxietate generalizată', 'icd_code', 'F41.1'
), now() - interval '21 days');

INSERT INTO public.transcripts (consultation_id, full_text, segments, language, provider)
VALUES ('c0000000-0000-0000-0002-000000000001',
'[Doctor]: Bună ziua, Elena. Sunt Dr. Marinescu, psiholog clinician. Am înțeles de la medicul de familie că vă confruntați cu anxietate. Povestiți-mi ce se întâmplă.
[Pacient]: Bună ziua. Da, este... e de mult timp, dar s-a agravat în ultimul an. Mă îngrijorez constant. Despre orice. Locul de muncă, sănătatea părinților, bani, viitorul...
[Doctor]: Când spuneți „constant", cam câte ore pe zi estimați că petreceți îngrijorându-vă?
[Pacient]: Sincer? Aproape tot timpul. Mă trezesc cu o greutate în piept și prima gândire e „ce o să meargă prost azi?"
[Doctor]: Și cum vă afectează asta fizic?
[Pacient]: Am tensiune musculară constantă, mai ales în gât și umeri. Dorm prost — adorm greu pentru că mintea nu se oprește. Am și probleme digestive.
[Doctor]: Vreau să facem împreună un exercițiu. Vă rog să vă gândiți la o îngrijorare recentă și să o formulați ca o propoziție.
[Pacient]: „O să fiu dată afară de la muncă pentru că am greșit un raport luna trecută."
[Doctor]: OK. Acum, pe o scală de la 0 la 100, cât de mult credeți că asta e adevărat?
[Pacient]: Cam 70%.
[Doctor]: Bun. Care sunt dovezile PENTRU această credință?
[Pacient]: Am greșit raportul. Șeful a fost nemulțumit. A spus „atenție data viitoare".
[Doctor]: Și care sunt dovezile ÎMPOTRIVA ei?
[Pacient]: Hmm... nu a menționat nimic de concediere. Am primit evaluare bună anul trecut. Colegii greșesc și ei...
[Doctor]: Dacă luați toate dovezile în considerare, cât de procentual e acum convingerea că veți fi dată afară?
[Pacient]: ...Poate 20%. Dar e greu să simt asta. Rațional înțeleg, dar emoțional...
[Doctor]: Exact — și asta e ceea ce vom lucra împreună. Se numește reestructurare cognitivă. Creierul dumneavoastră a dezvoltat un obicei de a supraestima amenințările. Vom antrena un alt mod de a procesa informația.
[Pacient]: Cât durează?
[Doctor]: De obicei 12-16 ședințe. Vom avea teme între ședințe — jurnale de gânduri, exerciții de relaxare. Sunteți dispusă?
[Pacient]: Da, vreau să scap de anxietatea asta.',
'[{"speaker":"doctor","text":"Bună ziua, Elena. Sunt Dr. Marinescu, psiholog clinician.","start_time":0,"end_time":4.5,"confidence":0.97}]'::jsonb,
'ro', 'deepgram');

INSERT INTO public.clinical_notes (consultation_id, template_id, sections, billing_codes, status, ai_model, generation_metadata, finalized_at, finalized_by)
VALUES ('c0000000-0000-0000-0002-000000000001', '10000000-0000-0000-0000-000000000002',
'[{"title":"Obiectivele Ședinței","content":"Evaluare clinică inițială. Stabilirea diagnosticului. Psihoeduc ție privind modelul CBT al anxietății. Introducere reestructurare cognitivă.","order":0},
{"title":"Conținutul Ședinței","content":"Pacienta prezintă îngrijorări excesive și incontrolabile, prezente aproape zilnic, de peste 12 luni. Îngrijorările acoperă multiple domenii (profesional, familial, financiar, sănătate). Simptome asociate: tensiune musculară cronică, insomnie de adormire, iritabilitate, dificultăți de concentrare, oboseală, tulburări digestive. Scor GAD-7: 18/21 (anxietate severă). Scor PHQ-9: 8/27 (depresie ușoară, probabil secundară anxietății). S-a realizat un exercițiu de reestructurare cognitivă live cu o îngrijorare actuală — pacienta a demonstrat capacitate bună de analiză rațională dar dificultate în integrarea emoțională.","order":1},
{"title":"Intervenții Utilizate","content":"1. Evaluare clinică structurată (GAD-7, PHQ-9)\n2. Psihoeduc ție: modelul cognitiv al anxietății (gând→emoție→comportament)\n3. Reestructurare cognitivă demonstrativă (tabelul cu dovezi pro/contra)\n4. Psihoeducație despre CBT și structura tratamentului","order":2},
{"title":"Teme pentru Acasă","content":"1. Jurnal de îngrijorări: notare zilnică a 3 îngrijorări principale, evaluare intensitate 0-100\n2. Exercițiu de respirație diafragmatică: 5 minute x 2/zi\n3. Lectură: materialul informativ despre anxietate (înmânat)","order":3},
{"title":"Evaluarea Progresului","content":"Diagnostic: F41.1 — Tulburare de anxietate generalizată, severă\nScor GAD-7: 18/21\nScor PHQ-9: 8/27\nPlan: 14 ședințe CBT, frecvență săptămânală\nPrognostic: Bun — motivație ridicată, capacitate de introspecție, bune abilități cognitive","order":4}]'::jsonb,
'[{"code":"F41.1","system":"ICD-10","description":"Tulburare de anxietate generalizată","confidence":0.96,"rationale":"Îndeplinește toate criteriile: îngrijorări excesive >6 luni, simptome somatice multiple","accepted":true},
{"code":"90837","system":"CPT","description":"Psihoterapie individuală, 60 min","confidence":0.94,"rationale":"Ședință CBT inițială, 49 minute","accepted":true}]'::jsonb,
'finalized', 'claude-sonnet-4-20250514', '{}'::jsonb, now() - interval '20 days', dr_radu);

-- Elena - Follow-up CBT session (7 days ago)
INSERT INTO public.consultations (id, user_id, patient_id, visit_type, status, consent_given, consent_timestamp, recording_duration_seconds, metadata, created_at)
VALUES ('c0000000-0000-0000-0002-000000000002', dr_radu, p02, 'Psychotherapy Session', 'finalized', true, now() - interval '7 days', 2700, jsonb_build_object(
  'patient_name', 'Elena Stanciu', 'patient_code', 'MC-2025-002',
  'diagnosis', 'Tulburare de anxietate generalizată', 'icd_code', 'F41.1'
), now() - interval '7 days');

INSERT INTO public.transcripts (consultation_id, full_text, segments, language, provider)
VALUES ('c0000000-0000-0000-0002-000000000002',
'[Doctor]: Elena, bine ați revenit. Cum a fost săptămâna? Ați reușit să completați jurnalul de gânduri?
[Pacient]: Da! Am completat în fiecare zi. A fost interesant... am observat un pattern.
[Doctor]: Excelent. Ce ați observat?
[Pacient]: Cele mai multe îngrijorări sunt legate de muncă și apar dimineața. Și am observat că intensitatea scade dacă le scriu — de la 70-80 ajung la 40-50 doar prin faptul că le pun pe hârtie.
[Doctor]: Asta se numește distanțare cognitivă — prin externalizarea gândului, creați un spațiu între dumneavoastră și îngrijorare. E un semn foarte bun. Cum a fost cu respirația diafragmatică?
[Pacient]: Am făcut-o dimineața. Ajută puțin cu tensiunea din piept. Seara uit.
[Doctor]: E normal. Hai să stabilim un reminder în telefon. Acum vreau să introduc o tehnică nouă — se numește „timp dedicat îngrijorării". Ați auzit de ea?
[Pacient]: Nu. Sună ciudat — de ce aș vrea să-mi dedic timp să mă îngrijorez?
[Doctor]: Paradoxal, funcționează. Alegeți 20 de minute pe zi, la aceeași oră, în care vă permiteți să vă faceți griji. În rest, când vine o îngrijorare, o notați și o amânați până la „ora de griji". Ce credeți?
[Pacient]: Hmm, interesant. O să încerc.
[Doctor]: Scorul GAD-7 de azi e 15, față de 18 acum două săptămâni. E un progres real.
[Pacient]: Chiar se vede un progres? Uneori mi se pare că sunt la fel...
[Doctor]: Percepția subiectivă întârzie față de schimbarea reală. Cifrele arată progres clar.',
'[{"speaker":"doctor","text":"Elena, bine ați revenit. Cum a fost săptămâna?","start_time":0,"end_time":4.0,"confidence":0.97}]'::jsonb,
'ro', 'deepgram');

INSERT INTO public.clinical_notes (consultation_id, template_id, sections, billing_codes, status, ai_model, generation_metadata, finalized_at, finalized_by)
VALUES ('c0000000-0000-0000-0002-000000000002', '10000000-0000-0000-0000-000000000002',
'[{"title":"Obiectivele Ședinței","content":"Revizie teme (jurnal gânduri, respirație). Introducere tehnică \"worry time\". Evaluare progres.","order":0},
{"title":"Conținutul Ședinței","content":"Pacienta a completat jurnalul zilnic și a identificat pattern-uri: îngrijorări predominant matinale, centrate pe muncă. Raportează efect benefic al scrierii — scăderea subiectivă a intensității. Respirația diafragmatică practicată parțial (doar dimineața).","order":1},
{"title":"Intervenții Utilizate","content":"1. Revizie jurnal de gânduri — identificare pattern\n2. Distanțare cognitivă (metacogniție)\n3. Tehnica \"worry time\" — 20 min/zi programat\n4. Restructurare cognitivă pe o îngrijorare curentă","order":2},
{"title":"Evaluarea Progresului","content":"Scor GAD-7: 15/21 (ameliorare de la 18)\nScor PHQ-9: 6/27 (ameliorare de la 8)\nAderență la teme: Bună\nȘedința: 3/14","order":3}]'::jsonb,
'[{"code":"F41.1","system":"ICD-10","description":"Tulburare de anxietate generalizată","confidence":0.96,"accepted":true},
{"code":"90834","system":"CPT","description":"Psihoterapie individuală, 45 min","confidence":0.95,"accepted":true}]'::jsonb,
'finalized', 'claude-sonnet-4-20250514', '{}'::jsonb, now() - interval '6 days', dr_radu);


-- =============================================
-- PATIENT 03: Bogdan Nicolescu — Bipolar I (Dr. Ana - Psychiatry)
-- =============================================

INSERT INTO public.consultations (id, user_id, patient_id, visit_type, status, consent_given, consent_timestamp, recording_duration_seconds, metadata, created_at)
VALUES ('c0000000-0000-0000-0003-000000000001', dr_ana, p03, 'Medication Review', 'finalized', true, now() - interval '10 days', 1980, jsonb_build_object(
  'patient_name', 'Bogdan Nicolescu', 'patient_code', 'MC-2025-003',
  'diagnosis', 'Tulburare afectivă bipolară tip I', 'icd_code', 'F31.1',
  'risk_flags', jsonb_build_array(
    jsonb_build_object('type', 'medication_noncompliance', 'severity', 'medium', 'description', 'Pacientul a redus singur doza de Litiu din cauza tremorului', 'detected_at', (now() - interval '10 days')::text),
    jsonb_build_object('type', 'drug_interaction', 'severity', 'high', 'description', 'Pacientul ia Ibuprofen concomitent cu Litiu — risc de toxicitate', 'detected_at', (now() - interval '10 days')::text)
  )
), now() - interval '10 days');

INSERT INTO public.transcripts (consultation_id, full_text, segments, language, provider)
VALUES ('c0000000-0000-0000-0003-000000000001',
'[Doctor]: Bună, Bogdan. Cum merge cu Litiul? Am primit rezultatele analizelor.
[Pacient]: Bună ziua. Sincer, am redus puțin doza de Litiu singur. Tremura mâna și nu puteam scrie la birou.
[Doctor]: Cu cât ați redus?
[Pacient]: În loc de 900mg iau 600mg de vreo două săptămâni.
[Doctor]: Înțeleg problema cu tremorul, dar reducerea neautorizată e riscantă — mai ales la dumneavoastră, cu istoricul de episoade maniacale. Rezultatele arată o litemie de 0.4 mEq/L — e sub pragul terapeutic.
[Pacient]: Dar mă simt bine! Chiar foarte bine. Am energie, dorm mai puțin dar sunt productiv...
[Doctor]: Bogdan, tocmai asta mă îngrijorează. Vă simțiți „prea bine"? Cum e somnul?
[Pacient]: Cam 4-5 ore pe noapte. Dar nu sunt obosit deloc.
[Doctor]: Cheltuieli neobișnuite? Proiecte noi?
[Pacient]: ...Am cumpărat un echipament de fotografie de 3000 de euro săptămâna trecută. Dar mereu am vrut să mă apuc de fotografie.
[Doctor]: Și mai luați și altceva? Medicamente, suplimente?
[Pacient]: Ibuprofen pentru o durere de spate. De vreo săptămână.
[Doctor]: Bogdan, Ibuprofenul interacționează cu Litiul — crește nivelul sanguin și poate cauza toxicitate. Trebuie să-l opriți imediat. Pentru durerea de spate puteți lua Paracetamol.
[Pacient]: Nu știam...
[Doctor]: De aceea e important să mă consultați înainte de orice medicament. Acum, trebuie să creștem Litiul înapoi la 900mg. Și vreau analize de sânge săptămâna viitoare.',
'[{"speaker":"doctor","text":"Bună, Bogdan. Cum merge cu Litiul?","start_time":0,"end_time":3.5,"confidence":0.96}]'::jsonb,
'ro', 'deepgram');

INSERT INTO public.clinical_notes (consultation_id, template_id, sections, billing_codes, status, ai_model, generation_metadata, finalized_at, finalized_by)
VALUES ('c0000000-0000-0000-0003-000000000001', '10000000-0000-0000-0000-000000000001',
'[{"title":"Motivul Prezentării","content":"Control medicație bipolară. Pacient cu F31.1 sub tratament cu Litiu.","order":0},
{"title":"Evoluție","content":"Pacientul a redus unilateral doza de Litiu de la 900mg la 600mg din cauza tremorului. Litemie actuală: 0.4 mEq/L (subterapeutică, țintă 0.6-0.8). Prezintă semne prodromale de episod hipomaniacal/maniacal: euforie, scăderea nevoii de somn (4-5h fără oboseală), cheltuieli impulsive (achiziție 3000€), grandiositate ușoară. Identificată interacțiune medicamentoasă: Ibuprofen + Litiu → risc toxicitate litiu.","order":1},
{"title":"Examenul Stării Mintale","content":"Aspect: Îmbrăcat îngrijit, energic. Contact vizual intens.\nComportament: Logoreic, greu de întrerupt, agitat psihomotor ușor.\nVorbire: Ritm crescut, volum ridicat. Tangențialitate ușoară.\nDispoziție: \"Mă simt extraordinar!\"\nAfect: Expansiv, incongruent cu situația clinică.\nGândire: Fugă de idei ușoară. Conținut cu teme grandiose.\nPercepție: Fără halucinații.\nInsight: Scăzut — nu recunoaște simptomele hipomaniacale.\nJudecată: Afectată — decizii financiare impulsive.","order":2},
{"title":"Plan Terapeutic","content":"1. Litiu: revenire la 900mg/zi IMEDIAT\n2. STOP Ibuprofen — înlocuire cu Paracetamol\n3. Litemie de control peste 5 zile\n4. Funcție renală, tiroidiană — control\n5. Monitorizare semne de manie\n6. Psihoeduc ție: interacțiuni medicamentoase\n7. Control: 1 săptămână","order":3}]'::jsonb,
'[{"code":"F31.1","system":"ICD-10","description":"Tulburare afectivă bipolară, episod maniacal actual fără simptome psihotice","confidence":0.88,"accepted":true},
{"code":"99215","system":"CPT","description":"Consultație pacient cunoscut, complexitate ridicată","confidence":0.91,"accepted":true}]'::jsonb,
'finalized', 'claude-sonnet-4-20250514', '{}'::jsonb, now() - interval '9 days', dr_ana);


-- =============================================
-- PATIENT 04: Cristina Dumitrescu — PTSD (Dr. Irina - Psychodynamic)
-- =============================================

INSERT INTO public.consultations (id, user_id, patient_id, visit_type, status, consent_given, consent_timestamp, recording_duration_seconds, metadata, created_at)
VALUES ('c0000000-0000-0000-0004-000000000001', dr_irina, p04, 'Psychotherapy Session', 'finalized', true, now() - interval '18 days', 3300, jsonb_build_object(
  'patient_name', 'Cristina Dumitrescu', 'patient_code', 'MC-2025-004',
  'diagnosis', 'Tulburare de stres post-traumatic', 'icd_code', 'F43.1',
  'risk_flags', jsonb_build_array(
    jsonb_build_object('type', 'self_harm', 'severity', 'medium', 'description', 'Istoric de automutilare prin tăiere, ultima dată acum 2 luni', 'detected_at', (now() - interval '18 days')::text)
  )
), now() - interval '18 days');

INSERT INTO public.transcripts (consultation_id, full_text, segments, language, provider)
VALUES ('c0000000-0000-0000-0004-000000000001',
'[Doctor]: Cristina, cum vă simțiți astăzi? Am observat că ați ezitat înainte să intrați.
[Pacient]: Da... am stat pe scaun afară vreo 10 minute. Nu știu de ce. Parcă mă temeam de ce o să iasă la suprafață azi.
[Doctor]: E un lucru important ce spuneți — corpul dumneavoastră știe că aici explorăm lucruri dificile. Ce credeți că vă temeți să descoperiți?
[Pacient]: Cred că... legătura între ce mi s-a întâmplat în copilărie și cum reacționez acum în relații.
[Doctor]: Ați menționat data trecută că relația cu mama era... complicată. Puteți să continuați de acolo?
[Pacient]: Mama... mama nu era rea. Dar era imprevizibilă. Într-o zi era caldă și iubitoare, a doua zi țipa la mine pentru orice. Nu știam niciodată care mamă o să fie acasă.
[Doctor]: Cum vă simțiți când povestiți asta acum?
[Pacient]: Simt o strângere în piept. Și mâinile... simt acea nevoie pe care o aveam înainte. Să... știți.
[Doctor]: Să vă tăiați?
[Pacient]: Da. Nu am făcut-o de 2 luni, dar impulsul vine când vorbim despre asta.
[Doctor]: Apreciez că puteți vorbi deschis despre asta. Impulsul de automutilare a fost un mod prin care copilul din dumneavoastră gestiona durerea emoțională insuportabilă. Ce simte acel copil acum?
[Pacient]: ...Singurătate. O singurătate imensă. Ca și cum nimeni nu mă vede cu adevărat.
[Doctor]: Și totuși, aici, în camera asta, sunteți văzută. Cum este asta?
[Pacient]: ...E scary. Și bine. Amândouă.',
'[{"speaker":"doctor","text":"Cristina, cum vă simțiți astăzi?","start_time":0,"end_time":3.2,"confidence":0.97}]'::jsonb,
'ro', 'deepgram');

INSERT INTO public.clinical_notes (consultation_id, template_id, sections, billing_codes, status, ai_model, generation_metadata, finalized_at, finalized_by)
VALUES ('c0000000-0000-0000-0004-000000000001', '10000000-0000-0000-0000-000000000003',
'[{"title":"Teme Centrale","content":"Explorarea relației cu figura maternă — pattern de atașament ambivalent/dezorganizat. Legătura dintre imprevizibilitatea emoțională a mamei și hipervigilența actuală. Impuls de automutilare ca mecanism de coping al copilului interior pentru durerea emoțională. Tema singurătății profunde și a nevoii de a fi \"văzută\".","order":0},
{"title":"Dinamica Transferului","content":"Transfer: Pacienta manifestă ambivalență față de terapeut — dorește apropierea dar se teme de vulnerabilitate (ezitare la intrare). Testare a predictibilității terapeutului (va fi \"aceeași\" ca data trecută?). Contratransfer: Dorința de a proteja, de a fi \"mama bună\" — necesită monitorizare pentru a nu gratifica nevoia fără elaborare.","order":1},
{"title":"Insight-uri și Elaborări","content":"Pacienta face prima conexiune explicită între dinamica din copilărie (mama imprevizibilă) și patternul relațional actual. Recunoaște automutilarea ca mecanism de coping al copilului, nu al adultului — diferențiere importantă. Capacitate crescută de a tolera afectul negativ în ședință.","order":2},
{"title":"Evoluția Procesului Terapeutic","content":"Ședința 8/40 estimat. Faza de explorare a pattern-urilor de atașament. Alianța terapeutică solidă. Risc de automutilare: prezent dar gestionabil — impuls fără acțiune. Plan de siguranță activ.","order":3}]'::jsonb,
'[{"code":"F43.1","system":"ICD-10","description":"Tulburare de stres post-traumatic","confidence":0.92,"accepted":true},
{"code":"90837","system":"CPT","description":"Psihoterapie individuală, 60 min","confidence":0.95,"accepted":true}]'::jsonb,
'finalized', 'claude-sonnet-4-20250514', '{}'::jsonb, now() - interval '17 days', dr_irina);

-- Cristina - Second session (4 days ago)
INSERT INTO public.consultations (id, user_id, patient_id, visit_type, status, consent_given, consent_timestamp, recording_duration_seconds, metadata, created_at)
VALUES ('c0000000-0000-0000-0004-000000000002', dr_irina, p04, 'Psychotherapy Session', 'reviewed', true, now() - interval '4 days', 3120, jsonb_build_object(
  'patient_name', 'Cristina Dumitrescu', 'patient_code', 'MC-2025-004',
  'diagnosis', 'Tulburare de stres post-traumatic', 'icd_code', 'F43.1'
), now() - interval '4 days');

INSERT INTO public.transcripts (consultation_id, full_text, segments, language, provider)
VALUES ('c0000000-0000-0000-0004-000000000002',
'[Doctor]: Cristina, ați menționat prin telefon că ați avut un coșmar recurent săptămâna asta. Vreți să vorbim despre el?
[Pacient]: Da. Este mereu același vis. Sunt în casa copilăriei, într-o cameră întunecată, și aud pași pe coridor. Nu știu dacă vine mama sau altcineva. Și nu pot fugi. Picioarele nu mă ascultă.
[Doctor]: Ce simțiți în vis?
[Pacient]: Teroare pură. Și neputință. Ca și cum orice s-ar întâmpla, nu pot controla.
[Doctor]: Neputința — e un sentiment pe care l-am mai întâlnit în poveștile dumneavoastră. Cum era să fii copil într-o casă unde nu puteai prezice ce urmează?
[Pacient]: Era ca și cum mergeam pe sticlă spartă. Mereu atentă. Mereu pregătită să reacționez. Nu am fost niciodată copil cu adevărat.
[Doctor]: Și acum, ca adult, ce se întâmplă când simțiți că nu aveți control?
[Pacient]: Intru în panică. Sau mă disociez — parcă nu mai sunt în corp. Sau... sau mă lovesc. Ca să simt ceva real.
[Doctor]: Observați cum corpul dumneavoastră a învățat mai multe modalități de a gestiona o situație intolerabilă? Fuga, disocierea, automutilarea — toate au fost soluții creative ale unui copil care nu avea altceva la dispoziție. Acum putem găsi altceva.',
'[{"speaker":"doctor","text":"Cristina, ați menționat prin telefon că ați avut un coșmar recurent.","start_time":0,"end_time":5.0,"confidence":0.96}]'::jsonb,
'ro', 'deepgram');

INSERT INTO public.clinical_notes (consultation_id, template_id, sections, billing_codes, status, ai_model, generation_metadata)
VALUES ('c0000000-0000-0000-0004-000000000002', '10000000-0000-0000-0000-000000000003',
'[{"title":"Teme Centrale","content":"Coșmar recurent — reamintire traumatică legată de mediul familial din copilărie. Tema neputinței și lipsei de control. Mecanisme de coping disociative și autoagresive ca adaptare la mediu imprevizibil.","order":0},
{"title":"Dinamica Transferului","content":"Transfer: Pacienta testează disponibilitatea emoțională a terapeutului prin dezvăluirea vulnerabilă. Capacitate crescută de a rămâne în contact emoțional fără disociere în ședință. Contratransfer: Urgență de a \"repara\" — menținut cadrul explorativ.","order":1},
{"title":"Insight-uri și Elaborări","content":"Conectarea coșmarului cu experiența corporeizată a copilăriei. Reframing-ul mecanismelor de coping ca \"soluții creative ale copilului\" — primit cu ușurare de pacientă.","order":2},
{"title":"Evoluția Procesului Terapeutic","content":"Ședința 12/40. Progres bun. Fără automutilare de 3 luni. Capacitate crescută de mentalizare.","order":3}]'::jsonb,
'[{"code":"F43.1","system":"ICD-10","description":"Tulburare de stres post-traumatic","confidence":0.94,"accepted":true},
{"code":"90837","system":"CPT","description":"Psihoterapie individuală, 60 min","confidence":0.95,"accepted":true}]'::jsonb,
'reviewed', 'claude-sonnet-4-20250514', '{}'::jsonb);


-- =============================================
-- PATIENT 05: Raluca Marin — BPD (Dr. Irina)
-- =============================================

INSERT INTO public.consultations (id, user_id, patient_id, visit_type, status, consent_given, consent_timestamp, recording_duration_seconds, metadata, created_at)
VALUES ('c0000000-0000-0000-0005-000000000001', dr_irina, p05, 'Psychotherapy Session', 'finalized', true, now() - interval '5 days', 3000, jsonb_build_object(
  'patient_name', 'Raluca Marin', 'patient_code', 'MC-2025-005',
  'diagnosis', 'Tulburare de personalitate borderline', 'icd_code', 'F60.3',
  'risk_flags', jsonb_build_array(
    jsonb_build_object('type', 'self_harm', 'severity', 'high', 'description', 'Automutilare recentă (tăiere pe antebrațe) acum 10 zile', 'detected_at', (now() - interval '5 days')::text),
    jsonb_build_object('type', 'suicidal_ideation', 'severity', 'medium', 'description', 'Ideație suicidară pasivă intermitentă', 'detected_at', (now() - interval '5 days')::text)
  )
), now() - interval '5 days');

INSERT INTO public.transcripts (consultation_id, full_text, segments, language, provider)
VALUES ('c0000000-0000-0000-0005-000000000001',
'[Doctor]: Raluca, cum a fost săptămâna asta?
[Pacient]: Nasol. M-am certat cu iubitul și am rupt-o.
[Doctor]: Ce s-a întâmplat?
[Pacient]: Nu m-a sunat o zi întreagă. O singură zi. Și eu am simțit că e gata, că m-a abandonat. L-am sunat de 20 de ori, i-am trimis mesaje furioase, apoi i-am spus că se termină. Acum regret teribil.
[Doctor]: Ce ați simțit în momentul în care nu v-a sunat?
[Pacient]: Gol. Un gol teribil, ca și cum aș dispărea dacă el nu e acolo. Și apoi furie — o furie pe care nu o puteam controla.
[Doctor]: Și după ce ați rupt relația?
[Pacient]: M-am tăiat. Pe brațe. Nu adânc, dar... a fost prima dată de 3 luni. Mă simt un eșec.
[Doctor]: Recăderea nu e eșec — e parte din proces. Ce ați simțit după ce v-ați tăiat?
[Pacient]: Calm. Un calm ciudat. Apoi rușine imensă.
[Doctor]: Observați ciclul: abandon perceput → gol → furie → acțiune impulsivă → calm temporar → rușine. L-am mai discutat. Ce e diferit de data asta?
[Pacient]: ...Că pot să-l văd. Înainte doar simțeam. Acum pot numi ce s-a întâmplat. Dar tot nu am putut opri.',
'[{"speaker":"doctor","text":"Raluca, cum a fost săptămâna asta?","start_time":0,"end_time":2.5,"confidence":0.97}]'::jsonb,
'ro', 'deepgram');

INSERT INTO public.clinical_notes (consultation_id, template_id, sections, billing_codes, status, ai_model, generation_metadata, finalized_at, finalized_by)
VALUES ('c0000000-0000-0000-0005-000000000001', '10000000-0000-0000-0000-000000000003',
'[{"title":"Teme Centrale","content":"Frica de abandon activată de lipsa contactului de o zi cu partenerul. Ciclul BPD: abandon perceput → vid emoțional → furie → impulsivitate (ruperea relației, automutilare) → calmare temporară → rușine. Capacitate în dezvoltare de mentalizare post-hoc dar nu încă în timp real.","order":0},
{"title":"Dinamica Transferului","content":"Transfer: Risc de idealizare a terapeutului ca \"singura persoană care mă înțelege\" — monitorizare activă. Pacienta a testat limitele (apel telefonic în afara programului). Contratransfer: Anxietate legată de automutilare — menținut cadrul.","order":1},
{"title":"Evaluarea Riscului","content":"Automutilare recentă (tăiere superficială antebrațe, acum 10 zile). Ideație suicidară pasivă intermitentă. Fără plan sau intenție activă. Plan de siguranță revizuit și actualizat.","order":2},
{"title":"Evoluția Procesului Terapeutic","content":"Ședința 20/indeterminat. Progres: capacitate crescută de reflecție asupra pattern-urilor, deși nu și control comportamental în criză. Mentalizare post-hoc funcțională. Obiectiv: dezvoltarea capacității de mentalizare în timp real.","order":3}]'::jsonb,
'[{"code":"F60.3","system":"ICD-10","description":"Tulburare de personalitate emoțional instabilă, tip borderline","confidence":0.95,"accepted":true},
{"code":"90837","system":"CPT","description":"Psihoterapie individuală, 60 min","confidence":0.94,"accepted":true}]'::jsonb,
'finalized', 'claude-sonnet-4-20250514', '{}'::jsonb, now() - interval '4 days', dr_irina);


-- =============================================
-- PATIENT 06: Tudor Ionescu — OCD (Dr. Radu - CBT with ERP)
-- =============================================

INSERT INTO public.consultations (id, user_id, patient_id, visit_type, status, consent_given, consent_timestamp, recording_duration_seconds, metadata, created_at)
VALUES ('c0000000-0000-0000-0006-000000000001', dr_radu, p06, 'Psychotherapy Session', 'finalized', true, now() - interval '6 days', 2820, jsonb_build_object(
  'patient_name', 'Tudor Ionescu', 'patient_code', 'MC-2025-006',
  'diagnosis', 'Tulburare obsesiv-compulsivă', 'icd_code', 'F42'
), now() - interval '6 days');

INSERT INTO public.transcripts (consultation_id, full_text, segments, language, provider)
VALUES ('c0000000-0000-0000-0006-000000000001',
'[Doctor]: Tudor, cum a mers cu exercițiul de expunere de săptămâna trecută? Am stabilit să atingeți clanța ușii de la birou fără să vă spălați imediat pe mâini.
[Pacient]: Am reușit! De 3 ori din 5 tentative. Primele 2 ori am cedat — m-am spălat după 2 minute. Dar apoi am reușit să aștept 15 minute, apoi 30, și ultima dată am rezistat o oră.
[Doctor]: Și ce s-a întâmplat cu anxietatea în cele 3 cazuri reușite?
[Pacient]: Exact cum ați spus — a crescut la maximum cam la 10-15 minute, apoi a început să scadă singură. La ultima tentativă, după o oră aproape că uitasem.
[Doctor]: Excelent! Acesta este principiul habituării. Anxietatea are un vârf natural și apoi scade DACĂ nu facem ritualul. Ați notat nivelurile în tabelul SUDS?
[Pacient]: Da, le am aici. Vârful a fost 85/100, iar după o oră era la 20.
[Doctor]: Perfect. Acum vreau să urcăm pe ierarhia de expunere. Următorul pas ar fi atingerea unei suprafețe și apoi atingerea feței fără spălare. Cum vi se pare?
[Pacient]: Mi se face rău doar când mă gândesc. Dar am văzut că funcționează cu clanța... deci probabil funcționează și cu asta.
[Doctor]: Exact. Încrederea vine din experiență, nu din reasigurare. Când faceți exercițiul, amintiți-vă: disconfortul e temporar, dar progresul e permanent.',
'[{"speaker":"doctor","text":"Tudor, cum a mers cu exercițiul de expunere?","start_time":0,"end_time":4.0,"confidence":0.97}]'::jsonb,
'ro', 'deepgram');

INSERT INTO public.clinical_notes (consultation_id, template_id, sections, billing_codes, status, ai_model, generation_metadata, finalized_at, finalized_by)
VALUES ('c0000000-0000-0000-0006-000000000001', '10000000-0000-0000-0000-000000000002',
'[{"title":"Obiectivele Ședinței","content":"Revizie ERP (expunere cu prevenirea răspunsului). Evaluare progres pe ierarhia de expunere. Planificarea următorului pas.","order":0},
{"title":"Conținutul Ședinței","content":"Pacientul a realizat exercițiul de expunere (atingere clanță fără spălare) cu succes parțial (3/5 tentative). Demonstrează habituare naturală — SUDS de la 85 la 20 în 60 minute. Y-BOCS: 22/40 (anterior 28/40 la evaluarea inițială) — ameliorare semnificativă.","order":1},
{"title":"Intervenții Utilizate","content":"1. Revizie ERP cu analiză detaliată a curbei de anxietate\n2. Reestructurare cognitivă: \"contaminarea e un gând, nu un fapt\"\n3. Planificarea următorului nivel pe ierarhia de expunere\n4. Motivational interviewing pentru aderență la exerciții","order":2},
{"title":"Evaluarea Progresului","content":"Y-BOCS: 22/40 (ameliorare de la 28)\nAderență ERP: 60% (în creștere)\nȘedința: 6/16\nPrognostic: Bun — răspunde la ERP","order":3}]'::jsonb,
'[{"code":"F42","system":"ICD-10","description":"Tulburare obsesiv-compulsivă","confidence":0.97,"accepted":true},
{"code":"90834","system":"CPT","description":"Psihoterapie individuală, 45 min","confidence":0.94,"accepted":true}]'::jsonb,
'finalized', 'claude-sonnet-4-20250514', '{}'::jsonb, now() - interval '5 days', dr_radu);


-- =============================================
-- PATIENT 07: Florin Popescu — Schizophrenia (Dr. Ana - Psychiatry)
-- =============================================

INSERT INTO public.consultations (id, user_id, patient_id, visit_type, status, consent_given, consent_timestamp, recording_duration_seconds, metadata, created_at)
VALUES ('c0000000-0000-0000-0007-000000000001', dr_ana, p07, 'Psychiatric Follow-up', 'finalized', true, now() - interval '8 days', 2400, jsonb_build_object(
  'patient_name', 'Florin Popescu', 'patient_code', 'MC-2025-007',
  'diagnosis', 'Schizofrenie paranoidă', 'icd_code', 'F20.0',
  'risk_flags', jsonb_build_array(
    jsonb_build_object('type', 'psychotic_symptoms', 'severity', 'high', 'description', 'Halucinații auditive persistente și ideație paranoidă, complianță parțială la antipsihotice', 'detected_at', (now() - interval '8 days')::text),
    jsonb_build_object('type', 'medication_noncompliance', 'severity', 'medium', 'description', 'Ia Olanzapina intermitent — sare doze 2-3/săptămână', 'detected_at', (now() - interval '8 days')::text)
  )
), now() - interval '8 days');

INSERT INTO public.transcripts (consultation_id, full_text, segments, language, provider)
VALUES ('c0000000-0000-0000-0007-000000000001',
'[Doctor]: Bună ziua, Florin. Cum vă simțiți? Luați Olanzapina regulat?
[Pacient]: Bună ziua, doamnă doctor. O iau... cam la două zile, recunosc. Mă îngrașă și mă face somnoros.
[Doctor]: Înțeleg că efectele secundare sunt neplăcute. Dar când nu o luați, cum sunt vocile?
[Pacient]: ...Vocile... mai sunt acolo. Dar nu le mai ascult. Am învățat să le ignor, cum ați spus.
[Doctor]: Bine, dar dacă luați medicamentul regulat, vocile devin mai slabe. Când le auziți cel mai tare?
[Pacient]: Seara, când e liniște. Îmi spun lucruri... uneori spun că vecinul mă spionează. Dar știu că nu e adevărat. Sau cel puțin, cred că știu.
[Doctor]: Faptul că vă puteți îndoi de aceste gânduri e un lucru foarte bun. Arată că tratamentul funcționează. Dar trebuie să luați Olanzapina zilnic. Ce ziceți de forma injectabilă lunar — nu mai trebuie să vă amintiți zilnic?
[Pacient]: Injecție? Nu știu... mi-e frică de ace.
[Doctor]: E doar o dată pe lună. Și nu aveți grija uitării. Gândiți-vă și discutăm data viitoare. Între timp, să ne asigurăm că luați pastila zilnic.',
'[{"speaker":"doctor","text":"Bună ziua, Florin. Cum vă simțiți?","start_time":0,"end_time":3.0,"confidence":0.96}]'::jsonb,
'ro', 'deepgram');

INSERT INTO public.clinical_notes (consultation_id, template_id, sections, billing_codes, status, ai_model, generation_metadata, finalized_at, finalized_by)
VALUES ('c0000000-0000-0000-0007-000000000001', '10000000-0000-0000-0000-000000000001',
'[{"title":"Motivul Prezentării","content":"Control psihiatric de rutină. Pacient cu F20.0 — schizofrenie paranoidă, diagnostic stabilit în 2018.","order":0},
{"title":"Examenul Stării Mintale","content":"Aspect: Îmbrăcat adecvat, igienă acceptabilă, ușor supraponderal (BMI 31 — efect secundar Olanzapină).\nComportament: Cooperant, ușor suspicios la intrare, se relaxează pe parcursul consultației.\nVorbire: Ritm normal, volum adecvat, ușor tangențial.\nDispoziție: \"Sunt bine\"\nAfect: Aplatizat, restrâns, fără reactivitate emoțională semnificativă.\nGândire — proces: Predominant coerent, tangențialitate ușoară. Fără dezorganizare marcată.\nGândire — conținut: Ideație paranoidă reziduală (\"vecinul mă spionează\") — cu testarea parțială a realității. Neagă ideație suicidară/homicidă.\nPercepție: Halucinații auditive persistente — voci comentatoare, intensitate moderată, predominant seara. Fără halucinații vizuale.\nCogniție: Alert, orientat. Atenție și concentrare ușor afectate.\nInsight: Parțial — recunoaște boala dar minimizează necesitatea medicației zilnice.\nJudecată: Funcțional.","order":1},
{"title":"Plan Terapeutic","content":"1. Olanzapină 10mg/zi — reafirmare necesitate administrare ZILNICĂ\n2. Discuție privind Olanzapină LAI (injectabil lunar) — pacientul va reflecta\n3. Monitorizare metabolică: glicemie, lipide, greutate\n4. Control: 2 săptămâni\n5. Referire asistent social pentru suport comunitar","order":2}]'::jsonb,
'[{"code":"F20.0","system":"ICD-10","description":"Schizofrenie paranoidă","confidence":0.96,"accepted":true},
{"code":"99214","system":"CPT","description":"Consultație pacient cunoscut, complexitate moderată","confidence":0.93,"accepted":true}]'::jsonb,
'finalized', 'claude-sonnet-4-20250514', '{}'::jsonb, now() - interval '7 days', dr_ana);


-- =============================================
-- PATIENT 08: Diana Vasilescu — ADHD adult (Dr. Radu)
-- =============================================

INSERT INTO public.consultations (id, user_id, patient_id, visit_type, status, consent_given, consent_timestamp, recording_duration_seconds, metadata, created_at)
VALUES ('c0000000-0000-0000-0008-000000000001', dr_radu, p08, 'Initial Evaluation', 'finalized', true, now() - interval '15 days', 3600, jsonb_build_object(
  'patient_name', 'Diana Vasilescu', 'patient_code', 'MC-2025-008',
  'diagnosis', 'ADHD adult, tip combinat', 'icd_code', 'F90.0'
), now() - interval '15 days');

INSERT INTO public.transcripts (consultation_id, full_text, segments, language, provider)
VALUES ('c0000000-0000-0000-0008-000000000001',
'[Doctor]: Diana, din chestionarul pe care l-ați completat online reiese un scor ridicat pe scala ASRS. Povestiți-mi cum vă afectează viața de zi cu zi.
[Pacient]: Doamne, de unde să încep? Pierd lucruri constant — chei, telefon, portofel. La muncă încep 5 proiecte și nu termin niciunul. Iar conversațiile... soțul meu zice că nu ascult niciodată.
[Doctor]: Cum era la școală?
[Pacient]: Eram „copilul deștept dar care nu-și atinge potențialul". Note bune la ce mă interesa, dezastru la restul. Visam cu ochii deschiși tot timpul. Profesorii scriau pe carnet „elevă inteligentă dar neatentă".
[Doctor]: Și acum, ca adult, ce vă deranjează cel mai mult?
[Pacient]: Haosul. Simt că viața mea e un haos pe care nu-l pot controla. Am un job bun, sunt competentă, dar parcă funcționez la 50%. Și sunt epuizată constant.
[Doctor]: Ce strategii ați încercat?
[Pacient]: Liste. Am sute de liste pe care le pierd. Și aplicații — am 7 aplicații de organizare pe telefon și nu folosesc niciuna constant.
[Doctor]: Vreau să facem câteva teste neuropsihologice standardizate. Și apoi vom discuta opțiunile de tratament — care includ atât strategii comportamentale cât și, potențial, medicație.',
'[{"speaker":"doctor","text":"Diana, din chestionarul online reiese un scor ridicat pe ASRS.","start_time":0,"end_time":5.0,"confidence":0.96}]'::jsonb,
'ro', 'deepgram');

INSERT INTO public.clinical_notes (consultation_id, template_id, sections, billing_codes, status, ai_model, generation_metadata, finalized_at, finalized_by)
VALUES ('c0000000-0000-0000-0008-000000000001', '10000000-0000-0000-0000-000000000002',
'[{"title":"Obiectivele Ședinței","content":"Evaluare clinică inițială pentru suspiciune ADHD adult. Anamneză detaliată. Planificare testare neuropsihologică.","order":0},
{"title":"Conținutul Ședinței","content":"Pacientă 31 ani, prezintă simptome compatibile cu ADHD tip combinat: inatenție marcată (pierderea obiectelor, dificultăți de concentrare, nefinalizarea sarcinilor), hiperactivitate internalizată (neliniște interioară, epuizare), impulsivitate (decizii rapide, întreruperea conversațiilor). Simptome prezente din copilărie. ASRS v1.1: 16/18 pozitiv. Funcționare profesională și socială afectată semnificativ.","order":1},
{"title":"Intervenții Utilizate","content":"1. Interviu clinic structurat (DIVA-5)\n2. ASRS v1.1 screening\n3. Psihoeduc ție: ADHD la adulți — nu e \"lene\" ci neurobiologie\n4. Planificare baterie neuropsihologică: CPT-3, WAIS-IV (subteste)","order":2},
{"title":"Evaluarea Progresului","content":"Diagnostic provizoriu: F90.0 — ADHD, tip combinat\nASRS: 16/18 pozitiv\nPlan: Testare neuropsihologică, apoi decizie tratament\nPrognostic: Bun — motivație ridicată, funcționare de bază intactă","order":3}]'::jsonb,
'[{"code":"F90.0","system":"ICD-10","description":"Tulburare hiperchinetică — deficit de atenție cu hiperactivitate","confidence":0.88,"rationale":"Diagnostic provizoriu, în așteptarea testării neuropsihologice","accepted":true},
{"code":"96136","system":"CPT","description":"Testare neuropsihologică, primele 30 min","confidence":0.85,"accepted":false}]'::jsonb,
'finalized', 'claude-sonnet-4-20250514', '{}'::jsonb, now() - interval '14 days', dr_radu);


-- =============================================
-- PATIENT 09: Anca Moldovan — Anorexia (Dr. Irina)
-- =============================================

INSERT INTO public.consultations (id, user_id, patient_id, visit_type, status, consent_given, consent_timestamp, recording_duration_seconds, metadata, created_at)
VALUES ('c0000000-0000-0000-0009-000000000001', dr_irina, p09, 'Psychotherapy Session', 'note_generated', true, now() - interval '2 days', 3000, jsonb_build_object(
  'patient_name', 'Anca Moldovan', 'patient_code', 'MC-2025-009',
  'diagnosis', 'Anorexie nervoasă', 'icd_code', 'F50.0',
  'risk_flags', jsonb_build_array(
    jsonb_build_object('type', 'deterioration', 'severity', 'high', 'description', 'IMC 16.2 — subponderal sever. Pierdere ponderală continuă. Risc somatic.', 'detected_at', (now() - interval '2 days')::text)
  )
), now() - interval '2 days');

INSERT INTO public.transcripts (consultation_id, full_text, segments, language, provider)
VALUES ('c0000000-0000-0000-0009-000000000001',
'[Doctor]: Anca, cum te simți astăzi? Ai reușit să mănânci ceva înainte de ședință?
[Pacient]: Am mâncat un iaurt de dimineață. Cred că e suficient.
[Doctor]: Un iaurt de câte grame?
[Pacient]: 125g. Fără zahăr, fără grăsimi.
[Doctor]: Și alaltăieri? Ce ai mâncat?
[Pacient]: ...O salată la prânz. Și un măr seara.
[Doctor]: Anca, știi că asta e mult prea puțin. Corpul tău are nevoie de energie să funcționeze.
[Pacient]: Știu ce spuneți, dar... nu pot. Când mănânc mai mult, simt că pierd controlul. Și corpul... mă uit în oglindă și tot mă văd grasă. Știu rațional că nu sunt, dar asta simt.
[Doctor]: Hai să explorăm puțin. Când a început relația asta cu controlul mâncării?
[Pacient]: Cred că... prin clasa a 10-a. Mama mereu comenta cum arăt. „Ai grijă să nu te îngrași ca mătușa ta." Nu era rea, dar... am internalizat mesajul.
[Doctor]: Ce mesaj ai internalizat?
[Pacient]: Că valoarea mea depinde de cum arăt. Că dacă nu sunt slabă, nu sunt suficientă.
[Doctor]: Și acum, la 21 de ani, cu un IMC de 16, cum te simți... suficientă?
[Pacient]: ...Nu. Nu mă simt niciodată suficientă. Asta e problema, nu?
[Doctor]: Asta e un insight foarte important. Foamea nu e despre mâncare — e despre a simți că ai control și că ești suficientă. Dar foamea nu poate umple acea nevoie.',
'[{"speaker":"doctor","text":"Anca, cum te simți astăzi?","start_time":0,"end_time":2.5,"confidence":0.97}]'::jsonb,
'ro', 'deepgram');

INSERT INTO public.clinical_notes (consultation_id, template_id, sections, billing_codes, status, ai_model, generation_metadata)
VALUES ('c0000000-0000-0000-0009-000000000001', '10000000-0000-0000-0000-000000000003',
'[{"title":"Teme Centrale","content":"Restricția alimentară ca mecanism de control. Distorsiune a imaginii corporale. Legătura între mesajele materne despre corp și valoarea de sine. Insight emergent: \"foamea nu e despre mâncare\".","order":0},
{"title":"Dinamica Transferului","content":"Transfer: Pacienta oscilează între a vedea terapeutul ca figură maternă bună (care acceptă) și amenințare (care vrea să o facă să mănânce / să piardă controlul). Contratransfer: Anxietate somatică — IMC periculos, urgență de a interveni medical versus menținerea procesului terapeutic.","order":1},
{"title":"Evaluarea Riscului","content":"IMC: 16.2 (subponderal sever). Restricție alimentară severă (<600 kcal/zi estimat). Risc somatic crescut — necesită monitorizare medicală concomitentă. Fără ideație suicidară activă.","order":2},
{"title":"Evoluția Procesului Terapeutic","content":"Ședința 14. Insight-uri importante privind funcția simptomului. Complianță terapeutică bună dar rezistență la schimbarea comportamentului alimentar. Recomandare: consultație nutrițională și monitorizare internistică.","order":3}]'::jsonb,
'[{"code":"F50.0","system":"ICD-10","description":"Anorexie nervoasă","confidence":0.97,"accepted":true},
{"code":"90837","system":"CPT","description":"Psihoterapie individuală, 60 min","confidence":0.95,"accepted":true}]'::jsonb,
'draft', 'claude-sonnet-4-20250514', '{}'::jsonb);


-- =============================================
-- PATIENT 10: Marius Ciobanu — Alcohol SUD (Dr. Ana - Psychiatry)
-- =============================================

INSERT INTO public.consultations (id, user_id, patient_id, visit_type, status, consent_given, consent_timestamp, recording_duration_seconds, metadata, created_at)
VALUES ('c0000000-0000-0000-0010-000000000001', dr_ana, p10, 'Psychiatric Follow-up', 'finalized', true, now() - interval '12 days', 2280, jsonb_build_object(
  'patient_name', 'Marius Ciobanu', 'patient_code', 'MC-2025-010',
  'diagnosis', 'Tulburare legată de consumul de alcool', 'icd_code', 'F10.2',
  'risk_flags', jsonb_build_array(
    jsonb_build_object('type', 'substance_abuse', 'severity', 'high', 'description', 'Recidivă — consum de alcool 4-5 beri/zi în ultimele 2 săptămâni după 3 luni de abstinență', 'detected_at', (now() - interval '12 days')::text),
    jsonb_build_object('type', 'deterioration', 'severity', 'medium', 'description', 'GGT crescut, funcție hepatică afectată', 'detected_at', (now() - interval '12 days')::text)
  )
), now() - interval '12 days');

INSERT INTO public.transcripts (consultation_id, full_text, segments, language, provider)
VALUES ('c0000000-0000-0000-0010-000000000001',
'[Doctor]: Marius, am primit analizele. GGT-ul e crescut din nou — 95 U/L. Ați băut?
[Pacient]: ...Da, doamnă doctor. Am recidivat. De vreo două săptămâni beau iar.
[Doctor]: Ce s-a întâmplat? Aveați 3 luni de abstinență.
[Pacient]: Am fost la un botez. Am zis „una singură". Și de acolo... nu am mai putut opri.
[Doctor]: Câte beri pe zi acum?
[Pacient]: 4-5. Uneori mai mult. Soția e iar furioasă. Zice că dacă nu mă opresc, pleacă cu copiii.
[Doctor]: Marius, recidiva face parte din boală, nu e un eșec moral. Dar trebuie să acționăm acum. Cum vă simțiți fizic?
[Pacient]: Dorm prost. Am tremurături dimineața. Și transpir noaptea.
[Doctor]: Semnele de dependență fizică sunt prezente. O să vă prescriu Naltrexonă — reduce pofta de alcool. Și Diazepam pe termen scurt pentru tremurături. Dar cel mai important: aveți nevoie de suport — AA sau un program ambulatoriu.
[Pacient]: Nu mă văd la AA... dar programul ambulatoriu, poate.
[Doctor]: Vă fac trimitere. Și vreau analize de control în 2 săptămâni.',
'[{"speaker":"doctor","text":"Marius, am primit analizele. GGT-ul e crescut din nou.","start_time":0,"end_time":4.5,"confidence":0.96}]'::jsonb,
'ro', 'deepgram');

INSERT INTO public.clinical_notes (consultation_id, template_id, sections, billing_codes, status, ai_model, generation_metadata, finalized_at, finalized_by)
VALUES ('c0000000-0000-0000-0010-000000000001', '10000000-0000-0000-0000-000000000001',
'[{"title":"Motivul Prezentării","content":"Control psihiatric. Pacient cu F10.2 — sindrom de dependență alcoolică. Recidivă după 3 luni de abstinență.","order":0},
{"title":"Evoluție","content":"Recidivă precipitată de expunere socială (botez). Consum actual: 4-5 beri/zi x 2 săptămâni. Semne de dependență fizică: tremurături matinale, transpirații nocturne, insomnie. GGT: 95 U/L (crescut). Funcție hepatică: ALAT 45, ASAT 52 (ușor crescute). Soția amenință cu separarea.","order":1},
{"title":"Examenul Stării Mintale","content":"Aspect: Ușor neglijent, facies congestionat. Tremor fin al mâinilor.\nComportament: Cooperant, rușinat, evită contactul vizual.\nVorbire: Normală.\nDispoziție: \"Dezamăgit de mine\"\nAfect: Congruent, trist.\nGândire: Coerentă, fără dezorganizare. Rumin pe eșec.\nPercepție: Fără halucinații. Fără fenomene de sevraj sever.\nCogniție: Alertă, orientată. Posibil ușor afectată de consumul cronic.\nInsight: Bun — recunoaște dependența.\nJudecată: Parțial afectată — impulsivitate legată de alcool.","order":2},
{"title":"Plan Terapeutic","content":"1. Naltrexonă 50mg/zi — inițiere\n2. Diazepam 5mg x3/zi — schema descrescătoare 7 zile (prevenire sevraj)\n3. Tiamină (B1) 100mg/zi — protecție neurologică\n4. Trimitere program ambulatoriu de adicții\n5. Analize control: hemogramă, GGT, funcție hepatică — 2 săptămâni\n6. Control psihiatric: 2 săptămâni","order":3}]'::jsonb,
'[{"code":"F10.2","system":"ICD-10","description":"Sindrom de dependență alcoolică","confidence":0.97,"accepted":true},
{"code":"99215","system":"CPT","description":"Consultație pacient cunoscut, complexitate ridicată","confidence":0.92,"accepted":true}]'::jsonb,
'finalized', 'claude-sonnet-4-20250514', '{}'::jsonb, now() - interval '11 days', dr_ana);


-- =============================================
-- PATIENT 11: Gabriela Popa — Panic Disorder + Agoraphobia (Dr. Radu)
-- =============================================

INSERT INTO public.consultations (id, user_id, patient_id, visit_type, status, consent_given, consent_timestamp, recording_duration_seconds, metadata, created_at)
VALUES ('c0000000-0000-0000-0011-000000000001', dr_radu, p11, 'Initial Evaluation', 'finalized', true, now() - interval '20 days', 3120, jsonb_build_object(
  'patient_name', 'Gabriela Popa', 'patient_code', 'MC-2025-011',
  'diagnosis', 'Tulburare de panică cu agorafobie', 'icd_code', 'F41.0'
), now() - interval '20 days');

INSERT INTO public.transcripts (consultation_id, full_text, segments, language, provider)
VALUES ('c0000000-0000-0000-0011-000000000001',
'[Doctor]: Gabriela, povestiți-mi ce se întâmplă când aveți un atac de panică.
[Pacient]: E teribil. Vine din senin — inima bate nebunește, parcă am un elefant pe piept, mâinile se amorțesc, simt că leșin sau că mor. Prima dată am chemat ambulanța — am crezut că fac infarct.
[Doctor]: Câte atacuri pe săptămână?
[Pacient]: 3-4. Dar trăiesc mereu cu frica următorului.
[Doctor]: Și cum v-a schimbat asta viața?
[Pacient]: Nu mai ies din casă decât dacă e absolut necesar. Nu merg la magazin, nu iau autobuzul, nu merg la restaurant. Comand totul online. Soțul face cumpărăturile.
[Doctor]: Deci evitați locurile de unde nu puteți pleca ușor dacă aveți un atac?
[Pacient]: Exact. Doar acasă mă simt safe. Și uneori nici acasă.
[Doctor]: Vreau să vă explic ce se întâmplă: corpul dumneavoastră are un sistem de alarmă — fight or flight — care se activează incorect. Nu e pericol real, dar corpul reacționează ca și cum ar fi. Vestea bună: putem reseta acest sistem. Dar trebuie să facem opusul a ceea ce instinctul vă spune.
[Pacient]: Adică să merg în locuri care îmi provoacă panică?
[Doctor]: Treptat, da. Se numește expunere gradată. Nu săriți direct la metroul aglomerat. Începem cu pași mici.',
'[{"speaker":"doctor","text":"Gabriela, povestiți-mi ce se întâmplă când aveți un atac de panică.","start_time":0,"end_time":4.5,"confidence":0.97}]'::jsonb,
'ro', 'deepgram');

INSERT INTO public.clinical_notes (consultation_id, template_id, sections, billing_codes, status, ai_model, generation_metadata, finalized_at, finalized_by)
VALUES ('c0000000-0000-0000-0011-000000000001', '10000000-0000-0000-0000-000000000002',
'[{"title":"Obiectivele Ședinței","content":"Evaluare inițială. Diagnostic. Psihoeduc ție panică + agorafobie. Plan tratament CBT.","order":0},
{"title":"Conținutul Ședinței","content":"Pacientă 34 ani cu atacuri de panică recurente (3-4/săptămână) de 8 luni și evitare agorafobică progresivă. Primul atac: spontan, acasă. Consultații cardiologice anterioare fără patologie organică. Evitare completă: transport public, magazine, restaurante, cinema. Funcționare socială sever limitată. PDSS: 18/28 (severă). Agoraphobic Cognitions Questionnaire: scor ridicat pe dimensiunea \"teamă de pierdere a controlului\".","order":1},
{"title":"Intervenții Utilizate","content":"1. Evaluare clinică structurată\n2. Psihoeduc ție: modelul cognitiv al panicii (interpretare catastrofală a senzațiilor corporale)\n3. Demonstrație respirație diafragmatică\n4. Construcția ierarhiei de expunere (primul draft)","order":2},
{"title":"Evaluarea Progresului","content":"Diagnostic: F41.0 — Tulburare de panică cu agorafobie\nPDSS: 18/28\nPlan: CBT cu expunere interoceptivă + in vivo, 16 ședințe\nRecomandare: consultație psihiatrică pentru anxiolitic pe termen scurt","order":3}]'::jsonb,
'[{"code":"F41.0","system":"ICD-10","description":"Tulburare de panică (anxietate paroxistică episodică)","confidence":0.95,"accepted":true},
{"code":"F40.0","system":"ICD-10","description":"Agorafobie","confidence":0.88,"accepted":true},
{"code":"90837","system":"CPT","description":"Psihoterapie individuală, 60 min","confidence":0.94,"accepted":true}]'::jsonb,
'finalized', 'claude-sonnet-4-20250514', '{}'::jsonb, now() - interval '19 days', dr_radu);


-- =============================================
-- PATIENT 12: Mihai Dobre — Adjustment Disorder (Dr. Irina)
-- =============================================

INSERT INTO public.consultations (id, user_id, patient_id, visit_type, status, consent_given, consent_timestamp, recording_duration_seconds, metadata, created_at)
VALUES ('c0000000-0000-0000-0012-000000000001', dr_irina, p12, 'Initial Evaluation', 'transcribed', true, now() - interval '1 day', 2700, jsonb_build_object(
  'patient_name', 'Mihai Dobre', 'patient_code', 'MC-2025-012',
  'diagnosis', 'Tulburare de adaptare', 'icd_code', 'F43.2'
), now() - interval '1 day');

INSERT INTO public.transcripts (consultation_id, full_text, segments, language, provider)
VALUES ('c0000000-0000-0000-0012-000000000001',
'[Doctor]: Mihai, bun venit. Ce te aduce la terapie?
[Pacient]: Am trecut prin despărțire acum 3 luni. Iubita mea de 4 ani m-a părăsit. Nu pot trece peste.
[Doctor]: Spune-mi mai multe despre cum te simți.
[Pacient]: Plâng aproape în fiecare zi. Nu mă pot concentra la facultate. Am picat 2 examene. Stau în pat și mă uit pe rețelele ei de socializare ore întregi.
[Doctor]: Ce simți când te uiți la profilul ei?
[Pacient]: Durere. Ca un cuțit în piept. Și furie. Și speranță că poate se întoarce. Toate deodată.
[Doctor]: Cum era relația înainte de despărțire?
[Pacient]: Credea că era perfectă. Acum, că mă gândesc mai bine... ea a spus că sunt „prea dependent emoțional". Că o sufoc.
[Doctor]: Cum te simți când auzi cuvintele „prea dependent emoțional"?
[Pacient]: ...Ca și cum ceva e fundamental greșit la mine. Ca și cum iubesc „prea mult" și asta e un defect.
[Doctor]: Sau poate nu e vorba despre „prea mult" ci despre felul în care ai învățat să iubești. Hai să explorăm — cum era relația cu părinții tăi?
[Pacient]: Tata a plecat când aveam 7 ani. Mama... mama era mereu acolo, dar mereu tristă. Simțeam că trebuie să am grijă de ea.',
'[{"speaker":"doctor","text":"Mihai, bun venit. Ce te aduce la terapie?","start_time":0,"end_time":3.0,"confidence":0.97}]'::jsonb,
'ro', 'deepgram');


-- =============================================
-- PATIENT 13: Simona Radu — Bipolar II (Dr. Ana)
-- =============================================

INSERT INTO public.consultations (id, user_id, patient_id, visit_type, status, consent_given, consent_timestamp, recording_duration_seconds, metadata, created_at)
VALUES ('c0000000-0000-0000-0013-000000000001', dr_ana, p13, 'Medication Review', 'finalized', true, now() - interval '9 days', 1800, jsonb_build_object(
  'patient_name', 'Simona Radu', 'patient_code', 'MC-2025-013',
  'diagnosis', 'Tulburare afectivă bipolară tip II', 'icd_code', 'F31.8',
  'risk_flags', jsonb_build_array(
    jsonb_build_object('type', 'medication_noncompliance', 'severity', 'low', 'description', 'Sare ocazional doza de Lamotrigină, aderență ~80%', 'detected_at', (now() - interval '9 days')::text)
  )
), now() - interval '9 days');

INSERT INTO public.transcripts (consultation_id, full_text, segments, language, provider)
VALUES ('c0000000-0000-0000-0013-000000000001',
'[Doctor]: Simona, cum merge cu Lamotrigina? Ați ajuns la 200mg?
[Pacient]: Da, am titrat cum ați spus. Sunt la 200mg de 3 săptămâni.
[Doctor]: Și cum vă simțiți?
[Pacient]: Mult mai stabilă. Nu mai am acele coborâșuri abisale. Și nici perioadele alea de energie excesivă în care fac prostii.
[Doctor]: Asta e exact efectul pe care îl urmărim. Aveți efecte secundare?
[Pacient]: Uneori am dureri de cap. Și am observat că uit cuvinte — caut un cuvânt și nu-l găsesc. E de la medicament?
[Doctor]: Poate fi, la unii pacienți. De obicei se ameliorează. Important: dacă observați orice erupție cutanată, trebuie să mă sunați IMEDIAT. E un efect secundar rar dar serios.
[Pacient]: Am înțeles. Doamnă doctor, sincer, uneori îmi lipsesc acele perioade de energie. Eram creativă, productivă...
[Doctor]: Înțeleg. Hipomaniile pot părea plăcute, dar vin cu un preț — decizii impulsive, relații afectate, și inevitabil sunt urmate de depresie. Stabilitatea e mai valoroasă pe termen lung.
[Pacient]: Aveți dreptate. Soțul zice că sunt „din nou eu" de când iau medicamentul.',
'[{"speaker":"doctor","text":"Simona, cum merge cu Lamotrigina?","start_time":0,"end_time":3.0,"confidence":0.97}]'::jsonb,
'ro', 'deepgram');

INSERT INTO public.clinical_notes (consultation_id, template_id, sections, billing_codes, status, ai_model, generation_metadata, finalized_at, finalized_by)
VALUES ('c0000000-0000-0000-0013-000000000001', '10000000-0000-0000-0000-000000000001',
'[{"title":"Motivul Prezentării","content":"Control medicație — Lamotrigină 200mg/zi, titrare completă. Pacientă cu F31.8 — tulburare bipolară tip II.","order":0},
{"title":"Evoluție","content":"Stabilizare timică semnificativă sub Lamotrigină 200mg. Fără episoade depresive sau hipomaniacale în ultimele 3 săptămâni. Efecte secundare: cefalee ocazională, dificultăți ușoare de evocare verbală. Aderență bună (~80%). Pacientă exprimă nostalgie pentru perioadele hipomaniacale — psihoeduc ție privind costul complet al hipomaniei.","order":1},
{"title":"Examenul Stării Mintale","content":"Aspect: Îngrijit, adecvat.\nComportament: Cooperant, deschis, bun contact vizual.\nVorbire: Normală.\nDispoziție: \"Stabilă, bine\"\nAfect: Eutim, congruent, gamă completă.\nGândire: Coerentă, fără tangențialitate.\nPercepție: Fără halucinații.\nInsight: Bun.\nJudecată: Intactă.","order":2},
{"title":"Plan Terapeutic","content":"1. Lamotrigină 200mg/zi — continuare\n2. Monitorizare hemograma, funcție hepatică la 3 luni\n3. Atenție la erupții cutanate (sindrom Stevens-Johnson)\n4. Control: 1 lună\n5. Psihoterapie: aderentă la ședințele cu Dr. Marinescu","order":3}]'::jsonb,
'[{"code":"F31.8","system":"ICD-10","description":"Alte tulburări afective bipolare — tip II","confidence":0.94,"accepted":true},
{"code":"99213","system":"CPT","description":"Consultație pacient cunoscut, complexitate scăzută-moderată","confidence":0.93,"accepted":true}]'::jsonb,
'finalized', 'claude-sonnet-4-20250514', '{}'::jsonb, now() - interval '8 days', dr_ana);


-- =============================================
-- PATIENT 14: Vlad Alexandrescu — MDD Recurrent (Dr. Radu - CBT)
-- =============================================

INSERT INTO public.consultations (id, user_id, patient_id, visit_type, status, consent_given, consent_timestamp, recording_duration_seconds, metadata, created_at)
VALUES ('c0000000-0000-0000-0014-000000000001', dr_radu, p14, 'Psychotherapy Session', 'scheduled', true, now() + interval '2 hours', null, jsonb_build_object(
  'patient_name', 'Vlad Alexandrescu', 'patient_code', 'MC-2025-014',
  'diagnosis', 'Episod depresiv recurent, moderat', 'icd_code', 'F33.1'
), now() - interval '1 day');


-- =============================================
-- ADDITIONAL CONSULTATIONS for history depth
-- =============================================

-- Andrei (p01) - initial scheduled visit (today, upcoming)
INSERT INTO public.consultations (id, user_id, patient_id, visit_type, status, consent_given, consent_timestamp, recording_duration_seconds, metadata, created_at)
VALUES ('c0000000-0000-0000-0001-000000000004', dr_ana, p01, 'Psychiatric Follow-up', 'scheduled', false, null, null, jsonb_build_object(
  'patient_name', 'Andrei Gheorghiu', 'patient_code', 'MC-2025-001',
  'diagnosis', 'Episod depresiv major, sever', 'icd_code', 'F32.2'
), now() + interval '3 hours');

-- Bogdan (p03) - earlier consultation
INSERT INTO public.consultations (id, user_id, patient_id, visit_type, status, consent_given, consent_timestamp, recording_duration_seconds, metadata, created_at)
VALUES ('c0000000-0000-0000-0003-000000000002', dr_ana, p03, 'Initial Evaluation', 'finalized', true, now() - interval '60 days', 3600, jsonb_build_object(
  'patient_name', 'Bogdan Nicolescu', 'patient_code', 'MC-2025-003',
  'diagnosis', 'Tulburare afectivă bipolară tip I', 'icd_code', 'F31.1'
), now() - interval '60 days');

INSERT INTO public.transcripts (consultation_id, full_text, segments, language, provider)
VALUES ('c0000000-0000-0000-0003-000000000002',
'[Doctor]: Bună ziua, domnule Nicolescu. Sunt Dr. Petrescu. Am primit scrisoarea de la colegul dumneavoastră din Cluj. Povestiți-mi ce s-a întâmplat.
[Pacient]: Bună ziua. Am avut un episod... soția zice că am fost „nebun" două săptămâni. Am dormit 2-3 ore pe noapte, am cheltuit 15.000 de lei pe lucruri inutile, am început 3 afaceri.
[Doctor]: Și cum vă simțeați în acea perioadă?
[Pacient]: Extraordinar! Ca și cum aș fi putut face orice. Ideile curgeau, vorbeam rapid, simțeam o energie infinită. Dar apoi... s-a prăbușit totul și am intrat într-o depresie groaznică.
[Doctor]: Câte episoade de acest tip ați avut?
[Pacient]: Soția zice că 3-4 în ultimii 5 ani. Dar le vedeam ca perioade „productive". Nu am realizat că e o problemă.
[Doctor]: Ceea ce descrieți — episoade de energie extremă urmate de depresie — este consistent cu tulburarea bipolară tip I. Este o afecțiune neurologică, nu un defect de caracter. Și există tratament eficient.',
'[{"speaker":"doctor","text":"Bună ziua, domnule Nicolescu.","start_time":0,"end_time":3.0,"confidence":0.97}]'::jsonb,
'ro', 'deepgram');

INSERT INTO public.clinical_notes (consultation_id, template_id, sections, billing_codes, status, ai_model, generation_metadata, finalized_at, finalized_by)
VALUES ('c0000000-0000-0000-0003-000000000002', '10000000-0000-0000-0000-000000000001',
'[{"title":"Motivul Prezentării","content":"Evaluare psihiatrică inițială. Pacient trimis de coleg din Cluj-Napoca după episod maniacal sever.","order":0},
{"title":"Anamneza","content":"Bărbat 45 ani cu istoric de 3-4 episoade maniacale în ultimii 5 ani, nediagnosticat anterior. Ultimul episod: 2 săptămâni de somn redus (2-3h), cheltuieli impulsive (15.000 lei), hipersocialitate, proiecte grandiose. Urmat de episod depresiv sever. Antecedente heredocolaterale: unchiu patern cu \"perioade de nebunie\" (posibil bipolar, netratat).","order":1},
{"title":"Plan Terapeutic","content":"1. Litiu carbonat 900mg/zi — inițiere cu titrare\n2. Litemie de bază + analize (funcție renală, tiroidiană)\n3. Psihoeduc ție bipolară\n4. Control: 1 săptămână","order":2}]'::jsonb,
'[{"code":"F31.1","system":"ICD-10","description":"Tulburare afectivă bipolară, episod maniacal fără simptome psihotice","confidence":0.93,"accepted":true},
{"code":"90792","system":"CPT","description":"Evaluare diagnostică psihiatrică","confidence":0.96,"accepted":true}]'::jsonb,
'finalized', 'claude-sonnet-4-20250514', '{}'::jsonb, now() - interval '59 days', dr_ana);

-- Marius (p10) - earlier consultation showing substance use disclosure
INSERT INTO public.consultations (id, user_id, patient_id, visit_type, status, consent_given, consent_timestamp, recording_duration_seconds, metadata, created_at)
VALUES ('c0000000-0000-0000-0010-000000000002', dr_ana, p10, 'Initial Evaluation', 'finalized', true, now() - interval '90 days', 3300, jsonb_build_object(
  'patient_name', 'Marius Ciobanu', 'patient_code', 'MC-2025-010',
  'diagnosis', 'Tulburare legată de consumul de alcool', 'icd_code', 'F10.2'
), now() - interval '90 days');

INSERT INTO public.transcripts (consultation_id, full_text, segments, language, provider)
VALUES ('c0000000-0000-0000-0010-000000000002',
'[Doctor]: Domnule Ciobanu, medicul de familie v-a trimis la mine. Ce se întâmplă?
[Pacient]: Soția a insistat... zice că beau prea mult. Dar eu cred că exagerează.
[Doctor]: Cât beți într-o zi obișnuită?
[Pacient]: Păi... 2-3 beri seara. Uneori câte un vin. Dar nu sunt alcoolic!
[Doctor]: 2-3 beri și vin... asta ar fi cam 5-6 unități de alcool pe zi. Limita recomandată e 2 unități. De cât timp consumați în acest ritm?
[Pacient]: ...De vreo 10 ani, cred.
[Doctor]: Ați încercat să opriți vreodată?
[Pacient]: Da, de Paște am încercat. Am rezistat 3 zile. Tremuram, transpirăm, nu puteam dormi. Am reluat.
[Doctor]: Ceea ce descrieți — tremurături, transpirație, insomnie la oprire — sunt simptome de sevraj alcoolic. Asta înseamnă că corpul dumneavoastră a dezvoltat dependență fizică.
[Pacient]: ...Dependență? Doamnă doctor, eu nu sunt ca cei de pe stradă...
[Doctor]: Dependența de alcool nu arată cum credem din filme. Mulți oameni funcționali au această problemă. Nu e o chestiune de voință, e o boală cronică. Și se poate trata.
[Pacient]: ...Ce trebuie să fac?',
'[{"speaker":"doctor","text":"Domnule Ciobanu, medicul de familie v-a trimis la mine.","start_time":0,"end_time":3.5,"confidence":0.96}]'::jsonb,
'ro', 'deepgram');

INSERT INTO public.clinical_notes (consultation_id, template_id, sections, billing_codes, status, ai_model, generation_metadata, finalized_at, finalized_by)
VALUES ('c0000000-0000-0000-0010-000000000002', '10000000-0000-0000-0000-000000000001',
'[{"title":"Motivul Prezentării","content":"Evaluare psihiatrică inițială. Trimis de medicul de familie la insistența soției. Consum cronic de alcool.","order":0},
{"title":"Anamneza","content":"Bărbat 49 ani, consum de alcool: 5-6 unități/zi de ~10 ani. Tentativă de oprire eșuată — simptome de sevraj la 3 zile (tremurături, transpirații, insomnie). Funcționare profesională menținută dar cu dificultăți. GGT: 120 U/L. AUDIT: 28/40 (dependență probabilă). Motivație pre-contemplativă la început de ședință, trece în contemplativă pe parcurs.","order":1},
{"title":"Plan Terapeutic","content":"1. Program de detoxifiere ambulatorie supravizată\n2. Disulfiram vs. Naltrexonă — discuție la control\n3. Analize complete de bază\n4. Control: 1 săptămână","order":2}]'::jsonb,
'[{"code":"F10.2","system":"ICD-10","description":"Sindrom de dependență alcoolică","confidence":0.95,"accepted":true},
{"code":"90792","system":"CPT","description":"Evaluare diagnostică psihiatrică","confidence":0.95,"accepted":true}]'::jsonb,
'finalized', 'claude-sonnet-4-20250514', '{}'::jsonb, now() - interval '89 days', dr_ana);

-- Florin (p07) - earlier evaluation for schizophrenia
INSERT INTO public.consultations (id, user_id, patient_id, visit_type, status, consent_given, consent_timestamp, recording_duration_seconds, metadata, created_at)
VALUES ('c0000000-0000-0000-0007-000000000002', dr_ana, p07, 'Medication Review', 'finalized', true, now() - interval '35 days', 1500, jsonb_build_object(
  'patient_name', 'Florin Popescu', 'patient_code', 'MC-2025-007',
  'diagnosis', 'Schizofrenie paranoidă', 'icd_code', 'F20.0',
  'risk_flags', jsonb_build_array(
    jsonb_build_object('type', 'psychotic_symptoms', 'severity', 'medium', 'description', 'Halucinații auditive reziduale sub Olanzapină', 'detected_at', (now() - interval '35 days')::text)
  )
), now() - interval '35 days');

INSERT INTO public.transcripts (consultation_id, full_text, segments, language, provider)
VALUES ('c0000000-0000-0000-0007-000000000002',
'[Doctor]: Florin, la ultimul control am crescut Olanzapina la 15mg. Cum merge?
[Pacient]: Vocile sunt mai slabe. Nu le mai aud ziua. Doar seara, uneori.
[Doctor]: Asta e un progres. Și gândurile despre vecin?
[Pacient]: Mai am impresia câteodată... dar reușesc să-mi spun: „asta e boala, nu realitatea." Cum m-ați învățat.
[Doctor]: Excelent, Florin. Asta se numește testarea realității și e foarte important.',
'[{"speaker":"doctor","text":"Florin, la ultimul control am crescut Olanzapina.","start_time":0,"end_time":3.5,"confidence":0.96}]'::jsonb,
'ro', 'deepgram');

INSERT INTO public.clinical_notes (consultation_id, template_id, sections, billing_codes, status, ai_model, generation_metadata, finalized_at, finalized_by)
VALUES ('c0000000-0000-0000-0007-000000000002', '10000000-0000-0000-0000-000000000001',
'[{"title":"Evoluție","content":"Ameliorare sub Olanzapină 15mg. Halucinații auditive: reziduale, doar seara, intensitate redusă. Ideație paranoidă: cu testarea realității funcțională — pacientul reușește să conteste gândurile paranoide. Complianță: parțială (ia ~5/7 zile).","order":0},
{"title":"Plan Terapeutic","content":"1. Olanzapină 15mg/zi — continuare, reafirmare zilnică\n2. Monitorizare metabolică la 3 luni\n3. Control: 1 lună","order":1}]'::jsonb,
'[{"code":"F20.0","system":"ICD-10","description":"Schizofrenie paranoidă","confidence":0.96,"accepted":true},
{"code":"99214","system":"CPT","description":"Consultație complexitate moderată","confidence":0.91,"accepted":true}]'::jsonb,
'finalized', 'claude-sonnet-4-20250514', '{}'::jsonb, now() - interval '34 days', dr_ana);


-- =============================================
-- 5. AUDIT LOG entries
-- =============================================

INSERT INTO public.audit_log (user_id, action, resource_type, resource_id, metadata, created_at) VALUES
  (dr_ana, 'start_recording', 'consultation', 'c0000000-0000-0000-0001-000000000001', '{}'::jsonb, now() - interval '28 days'),
  (dr_ana, 'stop_recording', 'consultation', 'c0000000-0000-0000-0001-000000000001', '{"duration_seconds":3420}'::jsonb, now() - interval '28 days' + interval '57 minutes'),
  (dr_ana, 'generate_note', 'clinical_note', 'c0000000-0000-0000-0001-000000000001', '{"model":"claude-sonnet-4-20250514"}'::jsonb, now() - interval '28 days' + interval '60 minutes'),
  (dr_ana, 'finalize_note', 'clinical_note', 'c0000000-0000-0000-0001-000000000001', '{}'::jsonb, now() - interval '27 days'),
  (dr_radu, 'start_recording', 'consultation', 'c0000000-0000-0000-0002-000000000001', '{}'::jsonb, now() - interval '21 days'),
  (dr_radu, 'stop_recording', 'consultation', 'c0000000-0000-0000-0002-000000000001', '{"duration_seconds":2940}'::jsonb, now() - interval '21 days' + interval '49 minutes'),
  (dr_radu, 'generate_note', 'clinical_note', 'c0000000-0000-0000-0002-000000000001', '{"model":"claude-sonnet-4-20250514"}'::jsonb, now() - interval '21 days' + interval '52 minutes'),
  (dr_radu, 'finalize_note', 'clinical_note', 'c0000000-0000-0000-0002-000000000001', '{}'::jsonb, now() - interval '20 days'),
  (dr_ana, 'start_recording', 'consultation', 'c0000000-0000-0000-0001-000000000003', '{}'::jsonb, now() - interval '3 days'),
  (dr_ana, 'stop_recording', 'consultation', 'c0000000-0000-0000-0001-000000000003', '{"duration_seconds":2640}'::jsonb, now() - interval '3 days' + interval '44 minutes'),
  (dr_ana, 'generate_note', 'clinical_note', 'c0000000-0000-0000-0001-000000000003', '{"model":"claude-sonnet-4-20250514"}'::jsonb, now() - interval '3 days' + interval '46 minutes'),
  (dr_irina, 'start_recording', 'consultation', 'c0000000-0000-0000-0004-000000000001', '{}'::jsonb, now() - interval '18 days'),
  (dr_irina, 'finalize_note', 'clinical_note', 'c0000000-0000-0000-0004-000000000001', '{}'::jsonb, now() - interval '17 days'),
  (dr_ana, 'finalize_note', 'clinical_note', 'c0000000-0000-0000-0010-000000000001', '{}'::jsonb, now() - interval '11 days'),
  (dr_ana, 'finalize_note', 'clinical_note', 'c0000000-0000-0000-0003-000000000001', '{}'::jsonb, now() - interval '9 days');

RAISE NOTICE 'MindCare AI seed complete! 3 clinicians, 14 patients, ~25 consultations with transcripts, notes, and risk flags.';

END $$;