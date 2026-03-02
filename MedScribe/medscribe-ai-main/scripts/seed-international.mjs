import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://oltonmgkzmfcmdbmyyuq.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9sdG9ubWdrem1mY21kYm15eXVxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTkzODQyNSwiZXhwIjoyMDg3NTE0NDI1fQ.xJpkD8urz4TsnzeakS--G8yYI0o69km29VFjmrSVuaM',
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function seed() {
  console.log('🌍 Seeding international psychiatry patients...');

  const { data: users } = await supabase.auth.admin.listUsers();
  const diana = users?.users?.find(u => u.email === 'd.i.pirjol@gmail.com');
  if (!diana) { console.error('User not found'); return; }
  const userId = diana.id;

  const patients = [
    { user_id: userId, mrn: 'INT-001', full_name: 'James O\'Brien', date_of_birth: '1982-04-11', gender: 'male', contact_info: { phone: '+447911123456', email: 'james.obrien@email.co.uk', country: 'UK' } },
    { user_id: userId, mrn: 'INT-002', full_name: 'Sophie Lefèvre', date_of_birth: '1991-07-23', gender: 'female', contact_info: { phone: '+33612345678', email: 'sophie.lefevre@email.fr', country: 'France' } },
    { user_id: userId, mrn: 'INT-003', full_name: 'Hans Müller', date_of_birth: '1975-01-08', gender: 'male', contact_info: { phone: '+491701234567', email: 'hans.mueller@email.de', country: 'Germany' } },
    { user_id: userId, mrn: 'INT-004', full_name: 'Yuki Tanaka', date_of_birth: '1998-12-15', gender: 'female', contact_info: { phone: '+819012345678', email: 'yuki.tanaka@email.jp', country: 'Japan' } },
    { user_id: userId, mrn: 'INT-005', full_name: 'Carlos Rodriguez', date_of_birth: '1969-06-30', gender: 'male', contact_info: { phone: '+34612345678', email: 'carlos.rodriguez@email.es', country: 'Spain' } },
    { user_id: userId, mrn: 'INT-006', full_name: 'Aisha Patel', date_of_birth: '1987-09-02', gender: 'female', contact_info: { phone: '+919876543210', email: 'aisha.patel@email.in', country: 'India' } },
    { user_id: userId, mrn: 'INT-007', full_name: 'Erik Johansson', date_of_birth: '1993-03-18', gender: 'male', contact_info: { phone: '+46701234567', email: 'erik.johansson@email.se', country: 'Sweden' } },
    { user_id: userId, mrn: 'INT-008', full_name: 'Fatima Al-Hassan', date_of_birth: '1984-11-25', gender: 'female', contact_info: { phone: '+971501234567', email: 'fatima.alhassan@email.ae', country: 'UAE' } },
    { user_id: userId, mrn: 'INT-009', full_name: 'Michael Chen', date_of_birth: '1972-08-14', gender: 'male', contact_info: { phone: '+1415555012', email: 'michael.chen@email.com', country: 'USA' } },
    { user_id: userId, mrn: 'INT-010', full_name: 'Isabella Rossi', date_of_birth: '2000-02-07', gender: 'female', contact_info: { phone: '+393401234567', email: 'isabella.rossi@email.it', country: 'Italy' } },
    { user_id: userId, mrn: 'INT-011', full_name: 'Olga Petrova', date_of_birth: '1978-05-20', gender: 'female', contact_info: { phone: '+79161234567', email: 'olga.petrova@email.ru', country: 'Russia' } },
    { user_id: userId, mrn: 'INT-012', full_name: 'Kwame Asante', date_of_birth: '1996-10-03', gender: 'male', contact_info: { phone: '+233201234567', email: 'kwame.asante@email.gh', country: 'Ghana' } },
  ];

  const { data: insertedPatients, error: patErr } = await supabase
    .from('patients').upsert(patients, { onConflict: 'user_id,mrn' }).select();
  if (patErr) { console.error('Patient error:', patErr); return; }
  console.log(`✅ ${insertedPatients.length} international patients created`);

  const pm = {};
  insertedPatients.forEach(p => pm[p.full_name] = p.id);
  const now = new Date();
  const d = (days) => new Date(now.getTime() - days * 86400000).toISOString();

  const cases = [
    { patient: "James O'Brien", diagnosis: 'Major Depressive Disorder, recurrent, severe', icd: 'F33.2', visit: 'follow-up', status: 'finalized', days: 12, duration: 1980,
      transcript: "Patient presents for medication review. Currently on Venlafaxine 225mg daily. Reports persistent low mood, early morning wakening at 4am, significant anhedonia. Weight loss of 4kg over 6 weeks. Denies suicidal ideation but describes passive death wishes. PHQ-9 score: 19. Previous trials: Sertraline (ineffective), Fluoxetine (sexual side effects). Occupational functioning severely impaired — on sick leave for 3 months. Social withdrawal significant. Alcohol intake increased to 3-4 units nightly. Plan: Augmentation with Lithium 400mg, reduce alcohol, weekly follow-up, safety plan reviewed.",
      note: { s: "Recurrent severe depression, inadequate response to Venlafaxine 225mg. Persistent low mood, anhedonia, early wakening, weight loss 4kg. Passive death wishes without active suicidal ideation. Increased alcohol use. PHQ-9: 19.", o: "Appearance: unkempt, poor eye contact. Psychomotor retardation noted. Speech slow, low volume. Mood subjectively 'empty'. Affect constricted, congruent. No psychotic features. Insight present.", a: "F33.2 — Major Depressive Disorder, recurrent, severe without psychotic features. Partial response to current SSRI/SNRI regimen. Comorbid harmful alcohol use. Risk: moderate (passive death wishes).", p: "1. Augment with Lithium carbonate 400mg, check baseline renal/thyroid\n2. Alcohol reduction counselling\n3. Weekly safety check\n4. Refer to CBT — waiting list\n5. If no improvement in 4 weeks: consider ECT referral\n6. Sick note extended 4 weeks" } },
    { patient: 'Sophie Lefèvre', diagnosis: 'Panic Disorder with Agoraphobia', icd: 'F40.01', visit: 'general', status: 'finalized', days: 9, duration: 2100,
      transcript: "32-year-old French woman presenting with recurrent panic attacks over 8 months. Episodes include sudden onset palpitations, chest tightness, derealization, fear of dying. Frequency: 3-4 per week. Avoids public transport, crowded places, and being alone. Has not left apartment alone in 6 weeks. Cardiac workup by cardiologist: normal ECG, echo, Holter. No substance use. Family history: mother with generalized anxiety. PDSS score: 18. Plan: Start Paroxetine 10mg titrating to 20mg, introduce interoceptive exposure exercises, psychoeducation about panic cycle.",
      note: { s: "Recurrent panic attacks x8 months: palpitations, chest tightness, derealization, fear of dying. 3-4/week. Progressive agoraphobic avoidance — housebound 6 weeks. Cardiac workup negative. PDSS: 18.", o: "Anxious, fidgeting. Hyperventilation observed during history taking. HR 92bpm. Tremor bilateral hands. Oriented x3. No psychotic features. Good insight.", a: "F40.01 — Panic Disorder with Agoraphobia, severe. Significant functional impairment with near-complete social restriction. No cardiac pathology.", p: "1. Initiate Paroxetine 10mg, increase to 20mg at week 2\n2. Interoceptive exposure exercises (breathing retraining)\n3. Psychoeducation: fight-or-flight, panic cycle\n4. Graded exposure hierarchy for agoraphobia\n5. Review 2 weeks" } },
    { patient: 'Hans Müller', diagnosis: 'Alcohol Use Disorder, severe, with withdrawal', icd: 'F10.239', visit: 'general', status: 'finalized', days: 7, duration: 1750,
      transcript: "50-year-old German male referred from ER after alcohol withdrawal seizure. Drinking history: 15+ standard drinks daily for 8 years, escalating after divorce. Previous detox x2, relapsed within weeks. AUDIT score: 36. Liver enzymes elevated: GGT 340, AST 95. MCV elevated. Denies other substance use. Mild cognitive impairment on screening — thiamine deficiency suspected. Currently day 3 post-seizure on reducing Diazepam regimen. Tremor, diaphoresis, mild visual disturbances. CIWA-Ar: 14. Plan: Complete medically supervised detox, high-dose thiamine, initiate Naltrexone after detox, AA referral.",
      note: { s: "Severe alcohol use disorder, 15+ drinks/day x8 years. Admitted post-withdrawal seizure. Two previous failed detox attempts. AUDIT: 36. Escalation post-divorce.", o: "Day 3 detox. Tremulous, diaphoretic. CIWA-Ar: 14. Oriented but concentration impaired. GGT 340, AST 95, MCV 104. No hepatomegaly on exam. Mild peripheral neuropathy bilateral feet.", a: "F10.239 — Alcohol Use Disorder, severe, with withdrawal. Suspected Wernicke's encephalopathy — thiamine deficiency. Alcoholic liver disease. Peripheral neuropathy.", p: "1. Complete Diazepam reducing regimen\n2. IV Thiamine 500mg x3/day for 5 days then oral\n3. Initiate Naltrexone 50mg post-detox\n4. Neuropsych assessment when stable\n5. AA/mutual aid referral\n6. Relapse prevention planning\n7. Liver ultrasound" } },
    { patient: 'Yuki Tanaka', diagnosis: 'Anorexia Nervosa, restricting type', icd: 'F50.01', visit: 'follow-up', status: 'note_generated', days: 4, duration: 2300,
      transcript: "27-year-old Japanese woman, follow-up for anorexia nervosa. BMI currently 15.8 (was 14.9 at admission 3 months ago). Restricting subtype. Still calorie counting, body checking 10+ times daily. Amenorrhea for 14 months. Currently on meal plan 1800kcal with dietitian supervision. Purging denied — confirmed by electrolytes. Mood low, likely secondary to malnutrition. DEXA scan: osteopenia lumbar spine. ECG: sinus bradycardia 48bpm, QTc normal. EDE-Q global: 4.2. Engaging in therapy but strong ambivalence about weight gain. Plan: Increase meal plan to 2000kcal, monitor cardiac, calcium/vitamin D supplementation.",
      note: { s: "AN restricting type follow-up. BMI 15.8 (up from 14.9). Persistent calorie counting, body checking. Amenorrhea 14 months. Ambivalent about recovery. EDE-Q: 4.2.", o: "Cachectic appearance, lanugo on arms. BMI 15.8. HR 48bpm regular. BP 95/60 sitting, orthostatic drop. DEXA: osteopenia L-spine. Electrolytes normal. QTc: 410ms.", a: "F50.01 — Anorexia Nervosa, restricting type, moderate severity. Osteopenia. Sinus bradycardia. Some weight restoration but high cognitive symptoms persist.", p: "1. Increase meal plan to 2000kcal\n2. Calcium 1000mg + Vitamin D 2000IU daily\n3. Weekly weight, ECG fortnightly\n4. Continue CBT-E weekly\n5. Consider Olanzapine 2.5mg if weight stalls\n6. Gynecology referral for amenorrhea" } },
    { patient: 'Carlos Rodriguez', diagnosis: 'Generalized Anxiety Disorder with insomnia', icd: 'F41.1', visit: 'follow-up', status: 'reviewed', days: 3, duration: 1400,
      transcript: "56-year-old Spanish male, 3-month review. GAD with chronic insomnia. On Pregabalin 150mg BD and sleep hygiene program. Reports 60% improvement in worry. Sleep improved from 3-4 hours to 5-6 hours. Still wakes at 3am with racing thoughts about business finances. No panic attacks. GAD-7: 10 (was 18). ISI: 14 (was 22). Side effects: mild dizziness on standing, weight gain 2kg. Plans to travel for business — anxious about flying. Plan: Maintain Pregabalin, add CBT-I for residual insomnia, brief exposure plan for flight anxiety.",
      note: { s: "GAD + insomnia 3-month review. Pregabalin 150mg BD. 60% worry reduction. Sleep 5-6h (from 3-4h). Residual 3am waking. GAD-7: 10. ISI: 14. Flight anxiety upcoming.", o: "Well-groomed, less anxious than previous visit. Mild postural dizziness reported. Weight +2kg. No tremor. Relaxed posture. Good engagement.", a: "F41.1 — GAD, moderate, improving under Pregabalin. Residual insomnia. Mild side effects (dizziness, weight). Situational flight anxiety.", p: "1. Continue Pregabalin 150mg BD\n2. Refer CBT-I (4 sessions)\n3. Exposure hierarchy for flight anxiety\n4. Monitor weight\n5. Review 2 months" } },
    { patient: 'Aisha Patel', diagnosis: 'Postpartum Depression', icd: 'F53.0', visit: 'general', status: 'finalized', days: 6, duration: 2200,
      transcript: "38-year-old Indian woman, referred by health visitor 8 weeks postpartum. Persistent tearfulness, guilt about not bonding with baby, intrusive thoughts of harm to infant (ego-dystonic, no intent). Sleep severely disrupted beyond normal newborn demands. Poor appetite, lost pregnancy weight rapidly. Partner reports she has become withdrawn and irritable. Edinburgh Postnatal Depression Scale: 19. No personal psychiatric history. Breastfeeding — medication choice important. Denies psychotic symptoms. Plan: Sertraline 50mg (breastfeeding compatible), crisis plan, involve partner, health visitor weekly, reassess bonding.",
      note: { s: "8 weeks postpartum. Tearfulness, guilt, poor bonding, ego-dystonic intrusive harm thoughts (no intent). Sleep severely disrupted, poor appetite. EPDS: 19. Breastfeeding.", o: "Tearful throughout interview. Baby present — minimal interaction observed. Appropriate hygiene. No psychomotor changes. No psychotic features. Insight excellent — distressed by intrusive thoughts.", a: "F53.0 — Postpartum Depression, moderate-severe. Ego-dystonic intrusive thoughts (OCD-spectrum, not psychotic). Impaired mother-infant bonding. Risk to self: low. Risk to infant: low (ego-dystonic).", p: "1. Sertraline 50mg (safe in breastfeeding)\n2. Crisis plan with partner and health visitor\n3. Mother-baby bonding intervention referral\n4. Health visitor weekly home visits\n5. Review 2 weeks — if psychotic symptoms emerge, urgent reassessment\n6. Partner support/psychoeducation" } },
    { patient: 'Erik Johansson', diagnosis: 'Social Anxiety Disorder', icd: 'F40.10', visit: 'general', status: 'note_generated', days: 2, duration: 1900,
      transcript: "32-year-old Swedish software engineer referred by GP. Lifelong social anxiety, significantly worsened since company switched to hybrid working requiring in-person meetings. Avoids presentations, team lunches, phone calls. Uses chat exclusively. Performance review flagged lack of verbal participation. LSAS score: 87 (severe). Has tried beta-blockers PRN with minimal effect. No depression. Cannabis use 2-3x/week to manage anxiety socially. Has never had psychotherapy. Plan: SSRI (Sertraline 25mg, titrate to 100mg), refer group CBT for social anxiety, discuss cannabis reduction.",
      note: { s: "Lifelong social anxiety, worsened with return to office. Avoids presentations, calls, team meals. LSAS: 87. Beta-blockers insufficient. Cannabis 2-3x/week for social situations. No psychotherapy history.", o: "Minimal eye contact, soft-spoken. Long pauses before answering. No tremor at rest. Articulate when comfortable. No depressive features. BAC negative.", a: "F40.10 — Social Anxiety Disorder, severe. Comorbid cannabis use (likely self-medicating). Occupational functioning threatened.", p: "1. Sertraline 25mg, titrate to 100mg over 4 weeks\n2. Refer group CBT for social anxiety (12 weeks)\n3. Cannabis reduction counselling\n4. Workplace reasonable adjustments letter if needed\n5. Review 3 weeks" } },
    { patient: 'Fatima Al-Hassan', diagnosis: 'Complex PTSD', icd: 'F43.10', visit: 'follow-up', status: 'finalized', days: 1, duration: 2600,
      transcript: "41-year-old woman from UAE, in treatment for Complex PTSD related to prolonged domestic violence over 12 years. Currently in safe housing. Phase 2 of trauma therapy (EMDR). Session focused on processing earliest traumatic memory. Significant dissociative episode during processing — grounding techniques required. Reports ongoing hypervigilance, emotional dysregulation with anger outbursts, difficulty trusting. Nightmares 4-5x/week. Currently on Prazosin 3mg and Sertraline 150mg. DES-II: 28. PCL-5: 52. Functioning improving — started part-time work. Plan: Continue phase-oriented trauma therapy, adjust Prazosin to 4mg, introduce distress tolerance skills.",
      note: { s: "Complex PTSD from 12-year domestic violence. Phase 2 EMDR. Dissociative episode during processing today. Hypervigilance, emotional dysregulation, nightmares 4-5x/week. DES-II: 28. PCL-5: 52. Started part-time work.", o: "Guarded but cooperative. Dissociative episode 15min during session — resolved with grounding. Affect labile, tearful then angry. Hyperstartle to door noise. Oriented post-grounding. No suicidal ideation.", a: "F43.10 — Complex PTSD, active trauma processing phase. Significant dissociative symptoms. Emotional dysregulation. Functional improvement noted (employment). Medication partially effective for nightmares.", p: "1. Continue EMDR — slower pace, more stabilization\n2. Increase Prazosin to 4mg for nightmares\n3. Introduce DBT distress tolerance skills\n4. Dissociation management plan updated\n5. Continue Sertraline 150mg\n6. Weekly sessions, safety plan active" } },
    { patient: 'Michael Chen', diagnosis: 'Bipolar II Disorder, current depressive episode', icd: 'F31.81', visit: 'follow-up', status: 'finalized', days: 5, duration: 1650,
      transcript: "53-year-old Chinese-American businessman, follow-up for Bipolar II. Currently in depressive episode x6 weeks despite Lamotrigine 200mg. History of hypomanic episodes: decreased sleep need, increased productivity, overspending. Last hypomania 8 months ago. Current: depressed mood, hypersomnia 12h/day, difficulty with executive function, cancelled business meetings. PHQ-9: 16. MDQ positive. No rapid cycling. Thyroid function normal. Plan: Add Quetiapine XR 50mg at night for bipolar depression, maintain Lamotrigine, mood charting, review 2 weeks.",
      note: { s: "Bipolar II, current depressive episode x6 weeks. On Lamotrigine 200mg. Hypersomnia 12h, impaired executive function, social withdrawal. PHQ-9: 16. Last hypomania 8 months ago.", o: "Well-dressed but fatigued appearance. Psychomotor slowing. Speech normal rate, low volume. Mood 'heavy'. No psychotic features. Insight good. YMRS: 2 (euthymic on mania scale).", a: "F31.81 — Bipolar II Disorder, current episode depressed, moderate. Inadequate response to Lamotrigine monotherapy. No mixed features. No rapid cycling.", p: "1. Add Quetiapine XR 50mg nocte\n2. Continue Lamotrigine 200mg\n3. Mood charting daily\n4. Monitor for hypomanic switch\n5. Sleep hygiene\n6. Review 2 weeks\n7. Consider Lurasidone if no response" } },
    { patient: 'Isabella Rossi', diagnosis: 'Borderline Personality Disorder', icd: 'F60.3', visit: 'general', status: 'transcribed', days: 0, duration: 2400,
      transcript: "25-year-old Italian woman, assessment. Referred after 3rd ER presentation for self-harm (cutting) in 6 months. Pattern of unstable relationships, chronic emptiness, identity disturbance since adolescence. Abandonment fears — last episode triggered by partner threatening to leave. Impulsive spending, binge eating. Splitting observed in session — idealized previous therapist, devalued GP. Affective instability with rapid mood shifts within hours. No sustained elevated mood (rules out bipolar). ZAN-BPD: 18. Currently not on medication. Previous brief CBT — dropped out. Plan: Refer to DBT program (waitlist 3 months), crisis safety plan, consider low-dose Quetiapine for emotional dysregulation.",
      note: { s: "3 ER visits for self-harm in 6 months. Pattern since adolescence: unstable relationships, chronic emptiness, identity disturbance, abandonment fears, impulsivity. ZAN-BPD: 18.", o: "Dramatic presentation, rapidly shifting affect. Idealization/devaluation observed in session. Multiple healed scars forearms. Recent superficial cuts (healing). Cognitively intact. No psychotic features.", a: "F60.3 — Borderline Personality Disorder. Recurrent self-harm. No comorbid Axis I disorder identified currently. High service utilization.", p: "1. Referral to DBT program (12-month)\n2. Crisis safety plan — ER protocol\n3. Consider Quetiapine 25mg PRN for acute distress\n4. No benzodiazepines\n5. GP coordination letter\n6. Bridge sessions fortnightly until DBT starts" } },
    { patient: 'Olga Petrova', diagnosis: 'Treatment-Resistant Depression', icd: 'F32.2', visit: 'follow-up', status: 'note_generated', days: 6, duration: 1800,
      transcript: "47-year-old Russian woman, review for treatment-resistant depression. Failed adequate trials of: Sertraline, Venlafaxine, Mirtazapine, Duloxetine, and combination Venlafaxine+Mirtazapine. Currently on Lithium augmentation x8 weeks with minimal benefit. PHQ-9: 21. Functional impairment severe — not working, needs help with ADLs. Discussing next-step options: esketamine nasal spray, ECT, or TMS. Patient reluctant about ECT due to cognitive concerns. Interested in esketamine. No psychotic features. Plan: Refer for esketamine assessment, maintain current meds, increase social activation.",
      note: { s: "Treatment-resistant depression. Failed 5 adequate antidepressant trials + lithium augmentation. PHQ-9: 21. Severe functional impairment, needs ADL support. Interested in esketamine, reluctant re ECT.", o: "Neglected appearance. Severe psychomotor retardation. Speech sparse, latency 5-10 seconds. Mood 'nothing'. Flat affect. No psychotic features. Passive suicidal ideation — no plan. Cognition: impaired concentration.", a: "F32.2 — Severe depressive episode, treatment-resistant (Stage III Thase-Rush). Lithium augmentation insufficient at 8 weeks. Risk: moderate (passive SI, functional decline).", p: "1. Urgent referral esketamine nasal spray program\n2. Continue Venlafaxine 225mg + Lithium 800mg\n3. Check lithium level, thyroid\n4. Social activation program referral\n5. Weekly risk assessment\n6. If decline: reconsider ECT" } },
    { patient: 'Kwame Asante', diagnosis: 'First Episode Psychosis', icd: 'F23', visit: 'general', status: 'reviewed', days: 1, duration: 2800,
      transcript: "29-year-old Ghanaian male, brought by family. 3-week history of disorganized behavior, talking to himself, poor sleep, suspiciousness. Believes coworkers are monitoring him through his phone. Hearing voices commenting on his actions. Stopped going to work. Previously healthy, no psychiatric history. No substance use confirmed by urine screen. Family history: uncle with 'madness' (undiagnosed). DUP estimated 3 weeks. PANSS total: 78. MRI brain: normal. Bloods including thyroid, HIV, syphilis: pending. Plan: Initiate Risperidone 2mg, titrate to 4mg. Early intervention psychosis team referral. Psychoeducation with family.",
      note: { s: "First presentation. 3 weeks disorganized behavior, auditory hallucinations (commentary), persecutory delusions (coworker surveillance via phone). Sleep disrupted. Ceased working. No substance use. FH: uncle psychotic illness.", o: "Guarded, intermittent eye contact, distracted (responding to internal stimuli). Speech tangential. Persecutory ideation re coworkers. Auditory hallucinations confirmed. Oriented to person/place, uncertain date. PANSS: 78. Urine drug screen: negative. MRI: normal.", a: "F23 — Acute and transient psychotic disorder (First Episode Psychosis pending duration). DUP ~3 weeks. No substance aetiology. No organic cause identified. Positive family history.", p: "1. Risperidone 2mg, titrate to 4mg over 1 week\n2. Bloods: FBC, TFT, HIV, syphilis, fasting glucose/lipids\n3. Early Intervention in Psychosis team referral\n4. Family psychoeducation session\n5. Sick note — unfit for work\n6. Risk assessment: low to others, moderate self-neglect\n7. Review 1 week" } },
  ];

  const now2 = new Date();
  const d2 = (days) => new Date(now2.getTime() - days * 86400000).toISOString();

  for (const c of cases) {
    const patientId = pm[c.patient];
    if (!patientId) { console.error('Patient not found:', c.patient); continue; }

    // Create consultation
    const { data: consultation, error: conErr } = await supabase.from('consultations').insert({
      user_id: userId,
      patient_id: patientId,
      visit_type: c.visit,
      status: c.status,
      consent_given: true,
      consent_timestamp: d2(c.days),
      recording_duration_seconds: c.duration,
      metadata: { diagnosis_code: c.icd, primary_diagnosis: c.diagnosis, patient_name: c.patient, patient_code: patients.find(p => p.full_name === c.patient)?.mrn },
      created_at: d2(c.days),
    }).select().single();

    if (conErr) { console.error('Consultation error:', c.patient, conErr); continue; }

    // Create transcript
    if (c.status !== 'scheduled') {
      await supabase.from('transcripts').upsert({
        consultation_id: consultation.id,
        full_text: c.transcript,
        language: 'en',
        provider: 'deepgram',
        segments: [{ start: 0, end: c.duration, text: c.transcript, speaker: 'doctor' }]
      }, { onConflict: 'consultation_id' });
    }

    // Create clinical note
    if (['finalized', 'reviewed', 'note_generated'].includes(c.status) && c.note) {
      const noteStatus = c.status === 'finalized' ? 'finalized' : c.status === 'reviewed' ? 'reviewed' : 'draft';
      await supabase.from('clinical_notes').insert({
        consultation_id: consultation.id,
        sections: [
          { id: 'subjective', title: 'Subjective', content: c.note.s },
          { id: 'objective', title: 'Objective', content: c.note.o },
          { id: 'assessment', title: 'Assessment', content: c.note.a },
          { id: 'plan', title: 'Plan', content: c.note.p },
        ],
        billing_codes: [{ code: c.icd, description: c.diagnosis }],
        status: noteStatus,
        ai_model: 'claude-sonnet-4-5-20250514',
        finalized_at: noteStatus === 'finalized' ? new Date().toISOString() : null,
        finalized_by: noteStatus === 'finalized' ? userId : null,
      });
    }

    console.log(`✅ ${c.patient} — ${c.diagnosis} (${c.icd})`);
  }

  console.log('\n🎉 International patients seeded!');
}

seed().catch(console.error);
