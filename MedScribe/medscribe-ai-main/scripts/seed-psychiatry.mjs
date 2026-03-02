import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://oltonmgkzmfcmdbmyyuq.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9sdG9ubWdrem1mY21kYm15eXVxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTkzODQyNSwiZXhwIjoyMDg3NTE0NDI1fQ.xJpkD8urz4TsnzeakS--G8yYI0o69km29VFjmrSVuaM';

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function seed() {
  console.log('🧠 Seeding psychiatry data for d.i.pirjol@gmail.com...');

  // Find Diana's user ID
  const { data: existingUsers } = await supabase.auth.admin.listUsers();
  const diana = existingUsers?.users?.find(u => u.email === 'd.i.pirjol@gmail.com');
  if (!diana) { console.error('❌ User d.i.pirjol@gmail.com not found!'); return; }
  const userId = diana.id;
  console.log('✅ Found user:', userId);

  // Update specialty to Psychiatry
  await supabase.from('users').update({ specialty: 'Psihiatrie', license_number: 'RO-PSY-4821' }).eq('id', userId);
  console.log('✅ Specialty updated to Psihiatrie');

  // Psychiatry patients
  const patients = [
    { user_id: userId, mrn: 'PSY-001', full_name: 'Alexandru Marin', date_of_birth: '1988-05-12', gender: 'male', contact_info: { phone: '+40722100001', email: 'alex.marin@email.com', emergency_contact: 'Maria Marin (soție) - +40722100010' } },
    { user_id: userId, mrn: 'PSY-002', full_name: 'Ioana Gheorghe', date_of_birth: '1995-09-03', gender: 'female', contact_info: { phone: '+40722100002', email: 'ioana.g@email.com', emergency_contact: 'Petru Gheorghe (tată) - +40722100020' } },
    { user_id: userId, mrn: 'PSY-003', full_name: 'Cristian Bălan', date_of_birth: '1976-12-28', gender: 'male', contact_info: { phone: '+40722100003', email: 'cristian.b@email.com', emergency_contact: 'Elena Bălan (soție) - +40722100030' } },
    { user_id: userId, mrn: 'PSY-004', full_name: 'Andreea Niță', date_of_birth: '2001-03-17', gender: 'female', contact_info: { phone: '+40722100004', email: 'andreea.n@email.com', emergency_contact: 'Silvia Niță (mamă) - +40722100040' } },
    { user_id: userId, mrn: 'PSY-005', full_name: 'Mihai Constantinescu', date_of_birth: '1965-07-22', gender: 'male', contact_info: { phone: '+40722100005', email: 'mihai.c@email.com', emergency_contact: 'Radu Constantinescu (fiu) - +40722100050' } },
    { user_id: userId, mrn: 'PSY-006', full_name: 'Gabriela Tudor', date_of_birth: '1983-11-09', gender: 'female', contact_info: { phone: '+40722100006', email: 'gabriela.t@email.com', emergency_contact: 'Dan Tudor (soț) - +40722100060' } },
    { user_id: userId, mrn: 'PSY-007', full_name: 'Florin Diaconu', date_of_birth: '1992-01-14', gender: 'male', contact_info: { phone: '+40722100007', email: 'florin.d@email.com', emergency_contact: 'Ana Diaconu (mamă) - +40722100070' } },
    { user_id: userId, mrn: 'PSY-008', full_name: 'Maria Ene', date_of_birth: '1970-06-30', gender: 'female', contact_info: { phone: '+40722100008', email: 'maria.e@email.com', emergency_contact: 'George Ene (soț) - +40722100080' } },
    { user_id: userId, mrn: 'PSY-009', full_name: 'Victor Sava', date_of_birth: '1999-08-05', gender: 'male', contact_info: { phone: '+40722100009', email: 'victor.s@email.com', emergency_contact: 'Irina Sava (mamă) - +40722100090' } },
    { user_id: userId, mrn: 'PSY-010', full_name: 'Daniela Oprea', date_of_birth: '1958-02-19', gender: 'female', contact_info: { phone: '+40722100010', email: 'daniela.o@email.com', emergency_contact: 'Carmen Oprea (fiică) - +40722100100' } },
  ];

  const { data: insertedPatients, error: patErr } = await supabase
    .from('patients').upsert(patients, { onConflict: 'user_id,mrn' }).select();
  if (patErr) { console.error('Patient error:', patErr); return; }
  console.log(`✅ ${insertedPatients.length} patients created`);

  const patientMap = {};
  insertedPatients.forEach(p => patientMap[p.full_name] = p.id);

  const now = new Date();
  const d = (days) => new Date(now.getTime() - days * 86400000).toISOString();

  // Psychiatry consultations with realistic scenarios
  const consultations = [
    // Alexandru - Tulburare depresivă majoră, follow-up medicație
    { user_id: userId, patient_id: patientMap['Alexandru Marin'], visit_type: 'follow-up', status: 'finalized', consent_given: true, consent_timestamp: d(14), recording_duration_seconds: 1820, metadata: { diagnosis_code: 'F32.1', primary_diagnosis: 'Episod depresiv mediu' }, created_at: d(14) },
    // Ioana - Tulburare de anxietate generalizată, evaluare inițială
    { user_id: userId, patient_id: patientMap['Ioana Gheorghe'], visit_type: 'general', status: 'finalized', consent_given: true, consent_timestamp: d(10), recording_duration_seconds: 2450, metadata: { diagnosis_code: 'F41.1', primary_diagnosis: 'Tulburare de anxietate generalizată' }, created_at: d(10) },
    // Cristian - Tulburare bipolară tip I, monitorizare stabilizator
    { user_id: userId, patient_id: patientMap['Cristian Bălan'], visit_type: 'follow-up', status: 'finalized', consent_given: true, consent_timestamp: d(8), recording_duration_seconds: 1560, metadata: { diagnosis_code: 'F31.1', primary_diagnosis: 'Tulburare bipolară, episod maniacal fără simptome psihotice' }, created_at: d(8) },
    // Andreea - PTSD, ședință de terapie
    { user_id: userId, patient_id: patientMap['Andreea Niță'], visit_type: 'general', status: 'note_generated', consent_given: true, consent_timestamp: d(5), recording_duration_seconds: 2780, metadata: { diagnosis_code: 'F43.1', primary_diagnosis: 'Tulburare de stres post-traumatic' }, created_at: d(5) },
    // Mihai - Demență stadiu incipient + depresie
    { user_id: userId, patient_id: patientMap['Mihai Constantinescu'], visit_type: 'follow-up', status: 'reviewed', consent_given: true, consent_timestamp: d(4), recording_duration_seconds: 1340, metadata: { diagnosis_code: 'F03.9', primary_diagnosis: 'Demență nespecificată cu simptome depresive' }, created_at: d(4) },
    // Gabriela - TOC (Tulburare obsesiv-compulsivă)
    { user_id: userId, patient_id: patientMap['Gabriela Tudor'], visit_type: 'follow-up', status: 'finalized', consent_given: true, consent_timestamp: d(3), recording_duration_seconds: 1680, metadata: { diagnosis_code: 'F42.2', primary_diagnosis: 'Tulburare obsesiv-compulsivă, mixtă' }, created_at: d(3) },
    // Florin - Schizofrenie paranoidă, monitorizare
    { user_id: userId, patient_id: patientMap['Florin Diaconu'], visit_type: 'follow-up', status: 'finalized', consent_given: true, consent_timestamp: d(2), recording_duration_seconds: 1450, metadata: { diagnosis_code: 'F20.0', primary_diagnosis: 'Schizofrenie paranoidă' }, created_at: d(2) },
    // Maria - Insomnie cronică + tulburare depresivă recurentă
    { user_id: userId, patient_id: patientMap['Maria Ene'], visit_type: 'general', status: 'note_generated', consent_given: true, consent_timestamp: d(1), recording_duration_seconds: 1920, metadata: { diagnosis_code: 'F33.1', primary_diagnosis: 'Tulburare depresivă recurentă, episod mediu' }, created_at: d(1) },
    // Victor - ADHD adult, evaluare inițială
    { user_id: userId, patient_id: patientMap['Victor Sava'], visit_type: 'general', status: 'transcribed', consent_given: true, consent_timestamp: d(0), recording_duration_seconds: 2100, metadata: { diagnosis_code: 'F90.0', primary_diagnosis: 'ADHD predominant neatent' }, created_at: d(0) },
    // Daniela - Programată mâine
    { user_id: userId, patient_id: patientMap['Daniela Oprea'], visit_type: 'follow-up', status: 'scheduled', consent_given: false, metadata: { diagnosis_code: 'F41.0', primary_diagnosis: 'Tulburare de panică' }, created_at: new Date(now.getTime() + 86400000).toISOString() },
  ];

  const { data: insertedConsultations, error: conErr } = await supabase
    .from('consultations').insert(consultations).select();
  if (conErr) { console.error('Consultation error:', conErr); return; }
  console.log(`✅ ${insertedConsultations.length} consultations created`);

  // Transcripts - realistic psychiatry conversations
  const transcriptData = [
    { name: 'Alexandru Marin', text: "Pacientul revine pentru control la o lună de la inițierea tratamentului cu Sertralină 50mg. Raportează ameliorare parțială a dispoziției — nu mai are ideație suicidară, somnul s-a îmbunătățit ușor, dar persistă anhedonia și lipsa de energie. Apetitul crescut, a luat 3 kg. Funcționarea socio-profesională rămâne afectată — nu a reluat activitatea la locul de muncă. Relația cu soția s-a ameliorat ușor. PHQ-9 scor: 14 (anterior 22). Examen psihic: dispoziție depresivă moderată, afect congruent, fără elemente psihotice, insight prezent. Plan: creștere Sertralină la 100mg, recomand psihoterapie CBT, control peste 3 săptămâni." },
    { name: 'Ioana Gheorghe', text: "Pacientă de 30 ani prezentată pentru anxietate persistentă de aproximativ 8 luni. Descrie îngrijorare excesivă legată de muncă, relații, sănătate. Tensiune musculară cronică, dificultăți de concentrare, iritabilitate, tulburări de somn cu adormire dificilă. Simptomele au debutat după schimbarea locului de muncă. Neagă consum de substanțe. Antecedente: episod depresiv la 22 ani, tratat cu Escitalopram 6 luni. GAD-7 scor: 16 (anxietate severă). Examen psihic: anxioasă, agitație psihomotorie ușoară, gândire cu conținut anxios predominant, fără ideație suicidară. Plan: inițiere Escitalopram 10mg, Alprazolam 0.25mg seara timp de 2 săptămâni, trimitere la psihoterapie. Control 2 săptămâni." },
    { name: 'Cristian Bălan', text: "Pacient cu diagnostic de tulburare bipolară tip I de 12 ani, în tratament cu Litiu 900mg/zi și Quetiapină 200mg seara. Se prezintă pentru monitorizare trimestrială. Litemia: 0.72 mEq/L (terapeutic). TSH: 3.1 (normal). Funcție renală: normală. Dispoziție eutimică de 6 luni. Respectă tratamentul. Doarme 7-8 ore. Funcționează bine la locul de muncă. Soția confirmă stabilitatea. Nu au fost episoade maniacale sau depresive. Plan: continuare tratament actual, control litemie peste 3 luni, menținere igienă de somn." },
    { name: 'Andreea Niță', text: "Pacientă de 24 ani, diagnosticată cu PTSD acum 6 luni, în urma unui accident auto sever. Revine pentru ședința 8 de terapie EMDR. Raportează reducerea flashback-urilor de la zilnic la 2-3/săptămână. Coșmarurile persistă dar sunt mai puțin intense. Evitarea condusului rămâne — nu poate urca în mașină ca pasager. Hipervigilență la zgomote puternice. A început să iasă mai mult din casă. PCL-5 scor: 42 (anterior 58). În ședință am procesat amintirea impactului. SUDS a scăzut de la 8 la 4. Reacție emoțională puternică dar a reușit procesarea. Plan: continuare EMDR săptămânal, Prazosin 2mg seara pentru coșmaruri, expunere treptată la transport." },
    { name: 'Mihai Constantinescu', text: "Pacient de 60 ani, referit de neurolog pentru simptome depresive în context de deficit cognitiv ușor. MMSE: 24/30 (anterior 26/30 acum 6 luni). Soția raportează iritabilitate crescută, retragere socială, pierderea interesului pentru hobbyuri. Pacientul minimizează simptomele. Tristețe, tulburări de somn cu treziri frecvente, apetit scăzut. GDS scor: 18. Fără ideație suicidară. IRM cerebral: atrofie corticală difuză moderată. Plan: inițiere Mirtazapină 15mg seara (beneficiu dual somn + apetit + dispoziție), evitare benzodiazepine, implicare soție în monitorizare, control neurologic paralel." },
    { name: 'Gabriela Tudor', text: "Pacientă cu TOC diagnosticat de 5 ani. Simptomele principale: gânduri obsesive de contaminare, ritualuri de spălare (3-4 ore/zi). În tratament cu Fluvoxamină 200mg și psihoterapie ERP. Raportează reducerea ritualurilor la 1-1.5 ore/zi. Poate atinge obiecte publice cu anxietate moderată dar fără evitare completă. Y-BOCS scor: 18 (anterior 28). Progres semnificativ în ierarhia de expunere. Relația familială îmbunătățită — soțul confirmă. Plan: continuare Fluvoxamină, intensificare ERP cu expuneri in vivo, control 4 săptămâni." },
    { name: 'Florin Diaconu', text: "Pacient de 33 ani cu schizofrenie paranoidă diagnosticată la 23 ani. În tratament cu Paliperidone palmitat 150mg/lună (injecție depot). Stabil de 2 ani, fără internări. Revine pentru injecție lunară și evaluare. Nu prezintă halucinații auditive sau idei delirante. Insight parțial — acceptă diagnosticul dar minimizează severitatea. Funcționează în atelier protejat. Locuiește cu mama. Socializare limitată dar stabilă. Efecte secundare: rigiditate ușoară matinală, prolactină ușor crescută — ginecomastie absentă. PANSS total: 48 (remisiune simptomatică). Plan: continuare Paliperidone depot, monitorizare prolactină, încurajare activități sociale." },
    { name: 'Maria Ene', text: "Pacientă de 55 ani cu tulburare depresivă recurentă, al treilea episod. Insomnie cronică severă de 3 luni — adoarme greu, treziri multiple, somn neodihnitor. Tristețe profundă, plâns facil, pierdere în greutate 5 kg în 2 luni. Ideație suicidară pasivă fără plan. Funcționarea afectată — pensionare medicală. Antecedente: 2 episoade depresive anterioare tratate cu Venlafaxină. PHQ-9: 20. ISI (Insomnia Severity Index): 22. Plan: reinițiere Venlafaxină 75mg cu titrare la 150mg, Trazodonă 50mg seara pentru somn, contract de siguranță, control săptămânal, evaluare risc suicidar la fiecare vizită." },
    { name: 'Victor Sava', text: "Tânăr de 26 ani, referit de psihologul de la locul de muncă pentru dificultăți de concentrare și organizare. Istoric școlar: note oscilante, comentarii repetate despre neatenție, potențial neexploatat. La locul de muncă: pierde deadline-uri, uită întâlniri, dificultăți în prioritizare. Evaluare: ASRS v1.1 scor: 15/18 (sugestiv ADHD). WURS retrospectiv: 52 (sugestiv simptome în copilărie). Fără comorbidități psihiatrice majore aparente. EKG: normal. TA: 120/75. Plan: completare evaluare neuropsihologică, chestionar retrospectiv de la părinți, revenire cu rezultate pentru discuție terapeutică (Metilfenidat vs. Atomoxetină)." },
  ];

  const completedConsultations = insertedConsultations.filter(c => c.status !== 'scheduled');
  for (let i = 0; i < completedConsultations.length; i++) {
    const c = completedConsultations[i];
    const td = transcriptData[i];
    if (!td) continue;
    const { error } = await supabase.from('transcripts').upsert({
      consultation_id: c.id,
      full_text: td.text,
      language: 'ro',
      provider: 'deepgram',
      segments: [{ start: 0, end: c.recording_duration_seconds || 60, text: td.text, speaker: 'doctor' }]
    }, { onConflict: 'consultation_id' });
    if (error) console.error('Transcript error for', td.name, error);
  }
  console.log(`✅ ${completedConsultations.length} transcripts created`);

  // Clinical notes for finalized/reviewed/note_generated consultations
  const noteData = [
    { name: 'Alexandru Marin', sections: [
      { id: 'subjective', title: 'Subiectiv', content: 'Pacientul raportează ameliorare parțială sub Sertralină 50mg. Dispariția ideației suicidare, somn ușor ameliorat. Persistă anhedonia, lipsa de energie, apetit crescut (+3kg). Nu a reluat activitatea profesională. PHQ-9: 14 (scădere de la 22).' },
      { id: 'objective', title: 'Obiectiv', content: 'Aspect îngrijit, contact vizual intermitent. Dispoziție depresivă moderată, afect congruent, restrictionat. Psihomotricitate încetinită ușor. Gândire coerentă, fără elemente psihotice. Fără ideație suicidară activă. Insight prezent, judecată păstrată.' },
      { id: 'assessment', title: 'Evaluare', content: 'F32.1 — Episod depresiv mediu, ameliorare parțială sub Sertralină 50mg. Răspuns terapeutic parțial la 4 săptămâni — necesită optimizare doză. Risc suicidar scăzut (de la moderat).' },
      { id: 'plan', title: 'Plan', content: '1. Creștere Sertralină de la 50mg la 100mg\n2. Trimitere psihoterapie CBT — Dr. Andrei Pop\n3. Monitorizare greutate și efecte secundare\n4. Control peste 3 săptămâni\n5. Instrucțiuni: prezentare la urgență dacă reapare ideația suicidară' }
    ], billing: [{ code: 'F32.1', description: 'Episod depresiv mediu' }] },
    { name: 'Ioana Gheorghe', sections: [
      { id: 'subjective', title: 'Subiectiv', content: 'Anxietate persistentă de 8 luni cu îngrijorare excesivă (muncă, relații, sănătate). Tensiune musculară, dificultăți de concentrare, iritabilitate, insomnie de adormire. Debut post-schimbare loc de muncă. Antecedent: episod depresiv la 22 ani. GAD-7: 16.' },
      { id: 'objective', title: 'Obiectiv', content: 'Anxioasă, agitație psihomotorie ușoară, mâini tremurânde. Vorbire rapidă, gândire cu conținut anxios predominant. Orientată temporo-spațial. Fără ideație suicidară sau elemente psihotice.' },
      { id: 'assessment', title: 'Evaluare', content: 'F41.1 — Tulburare de anxietate generalizată, severă. Fără comorbiditate depresivă majoră curentă. Funcționare socio-profesională afectată moderat.' },
      { id: 'plan', title: 'Plan', content: '1. Inițiere Escitalopram 10mg dimineața\n2. Alprazolam 0.25mg seara — maxim 2 săptămâni\n3. Trimitere psihoterapie CBT\n4. Educație: tehnici de respirație, igienă de somn\n5. Control 2 săptămâni pentru evaluare răspuns' }
    ], billing: [{ code: 'F41.1', description: 'Tulburare de anxietate generalizată' }] },
    { name: 'Cristian Bălan', sections: [
      { id: 'subjective', title: 'Subiectiv', content: 'Control trimestrial. Dispoziție eutimică de 6 luni. Respectă tratamentul (Litiu 900mg + Quetiapină 200mg). Somn regulat 7-8h. Funcționare profesională bună. Soția confirmă stabilitatea.' },
      { id: 'objective', title: 'Obiectiv', content: 'Litemie: 0.72 mEq/L (interval terapeutic). TSH: 3.1 (normal). Creatinină: normală. Dispoziție eutimică, afect reactiv adecvat. Fără simptome maniacale sau depresive. Psihomotricitate normală.' },
      { id: 'assessment', title: 'Evaluare', content: 'F31.7 — Tulburare bipolară tip I, în remisiune. Stabilitate susținută sub tratament combinat. Litemie în interval optim. Funcții tiroidiene și renale normale.' },
      { id: 'plan', title: 'Plan', content: '1. Continuare Litiu 900mg/zi + Quetiapină 200mg seara\n2. Control litemie, TSH, funcție renală peste 3 luni\n3. Menținere igienă de somn și rutină\n4. Evitare alcool și substanțe\n5. Următorul control: 3 luni' }
    ], billing: [{ code: 'F31.7', description: 'Tulburare bipolară, în remisiune' }] },
    { name: 'Andreea Niță', sections: [
      { id: 'subjective', title: 'Subiectiv', content: 'Ședința 8 EMDR. Reducere flashback-uri (de la zilnic la 2-3/săpt). Coșmaruri persistente dar mai puțin intense. Evită încă transportul auto. Hipervigilență la zgomote. A început să iasă mai mult. PCL-5: 42 (de la 58).' },
      { id: 'objective', title: 'Obiectiv', content: 'Cooperantă, motivată pentru terapie. SUDS pentru amintirea-țintă: scădere de la 8 la 4 post-procesare. Reacție emoțională puternică (plâns) în timpul procesării dar conținută adecvat. Instalare cognitivă pozitivă parțială.' },
      { id: 'assessment', title: 'Evaluare', content: 'F43.1 — PTSD, ameliorare progresivă sub EMDR. Răspuns terapeutic favorabil. Evitarea transportului rămâne simptomul rezidual major. Risc scăzut.' },
      { id: 'plan', title: 'Plan', content: '1. Continuare EMDR săptămânal — ședința 9\n2. Prazosin 2mg seara pentru coșmaruri\n3. Introducere treptată expunere in vivo (transport auto — pasager, trasee scurte)\n4. Jurnal de simptome\n5. Plan de siguranță actualizat' }
    ], billing: [{ code: 'F43.1', description: 'PTSD' }] },
    { name: 'Mihai Constantinescu', sections: [
      { id: 'subjective', title: 'Subiectiv', content: 'Referit de neurolog. Deficit cognitiv ușor progresiv. Soția raportează iritabilitate, retragere socială, pierdere interes hobbyuri. Pacientul minimizează. Tristețe, tulburări de somn, apetit scăzut. GDS: 18.' },
      { id: 'objective', title: 'Obiectiv', content: 'MMSE: 24/30 (scădere de la 26/30). Dispoziție tristă, afect plat. Orientat în timp și spațiu. Deficit de memorie recentă. IRM: atrofie corticală difuză moderată. Fără ideație suicidară.' },
      { id: 'assessment', title: 'Evaluare', content: 'F03.9 + F32.1 — Demență nespecificată (stadiu incipient) cu episod depresiv mediu supraaadăugat. Necesitate diferențiere pseudo-demență depresivă vs. demență neurodegenerativă.' },
      { id: 'plan', title: 'Plan', content: '1. Inițiere Mirtazapină 15mg seara\n2. Contraindicat: benzodiazepine, anticolinergice\n3. Implicare soție în monitorizare și supraveghere medicație\n4. Evaluare neuropsihologică completă\n5. Control neurologic paralel\n6. Control psihiatric: 3 săptămâni' }
    ], billing: [{ code: 'F03.9', description: 'Demență nespecificată' }, { code: 'F32.1', description: 'Episod depresiv mediu' }] },
    { name: 'Gabriela Tudor', sections: [
      { id: 'subjective', title: 'Subiectiv', content: 'TOC de 5 ani. Obsesii de contaminare, ritualuri de spălare reduse de la 3-4h/zi la 1-1.5h/zi sub Fluvoxamină 200mg + ERP. Poate atinge obiecte publice cu anxietate moderată. Y-BOCS: 18 (de la 28). Soțul confirmă progresul.' },
      { id: 'objective', title: 'Obiectiv', content: 'Cooperantă, motivată. Mâini cu dermită de contact în ameliorare. Anxietate moderată la discuția despre expuneri. Gândire cu conținut obsesional prezent dar cu distanțare critică îmbunătățită.' },
      { id: 'assessment', title: 'Evaluare', content: 'F42.2 — TOC, formă mixtă (obsesii de contaminare + ritualuri de spălare), ameliorare semnificativă sub tratament combinat farmacologic + ERP. Y-BOCS scădere 36%.' },
      { id: 'plan', title: 'Plan', content: '1. Continuare Fluvoxamină 200mg/zi\n2. Intensificare ERP: expuneri in vivo (transport public, magazine)\n3. Cremă hidratantă pentru dermatită\n4. Control 4 săptămâni\n5. Obiectiv: Y-BOCS < 14 în 3 luni' }
    ], billing: [{ code: 'F42.2', description: 'TOC, formă mixtă' }] },
    { name: 'Florin Diaconu', sections: [
      { id: 'subjective', title: 'Subiectiv', content: 'Control lunar + administrare depot. Stabil de 2 ani. Fără halucinații sau idei delirante. Insight parțial. Funcționează în atelier protejat. Locuiește cu mama. Efecte secundare: rigiditate matinală ușoară.' },
      { id: 'objective', title: 'Obiectiv', content: 'Aspect adecvat, igienă corespunzătoare. Contact vizual prezent. Afect ușor plat (reziduală). Gândire coerentă, fără elemente productive. PANSS total: 48 (remisiune). Prolactină: 35 ng/ml (ușor crescută). Fără ginecomastie.' },
      { id: 'assessment', title: 'Evaluare', content: 'F20.0 — Schizofrenie paranoidă, în remisiune simptomatică sub Paliperidone depot. Simptomatologie negativă reziduală minimă. Prolactină ușor crescută — asimptomatic.' },
      { id: 'plan', title: 'Plan', content: '1. Administrare Paliperidone palmitat 150mg IM (deltoid drept)\n2. Monitorizare prolactină la 6 luni\n3. Încurajare activități sociale și de grup\n4. Coordonare cu asistentul social pentru program ocupațional\n5. Control: 1 lună' }
    ], billing: [{ code: 'F20.0', description: 'Schizofrenie paranoidă' }] },
    { name: 'Maria Ene', sections: [
      { id: 'subjective', title: 'Subiectiv', content: 'Al treilea episod depresiv. Insomnie severă 3 luni. Tristețe profundă, plâns facil, scădere ponderală 5kg/2 luni. Ideație suicidară pasivă fără plan. PHQ-9: 20. ISI: 22. Pensionare medicală.' },
      { id: 'objective', title: 'Obiectiv', content: 'Aspect neîngrijit, facies suferind. Plâns facil în cursul interviului. Psihomotricitate încetinită. Gândire cu conținut depresiv, idei de inutilitate și vinovăție. Ideație suicidară pasivă. Fără plan sau intenție.' },
      { id: 'assessment', title: 'Evaluare', content: 'F33.1 — Tulburare depresivă recurentă, episod actual mediu-sever, cu insomnie severă. Risc suicidar moderat. Necesită monitorizare intensivă.' },
      { id: 'plan', title: 'Plan', content: '1. Reinițiere Venlafaxină 75mg cu titrare la 150mg în 2 săptămâni\n2. Trazodonă 50mg seara pentru insomnie\n3. Contract de siguranță semnat\n4. Control săptămânal\n5. Evaluare risc suicidar la fiecare vizită\n6. Număr urgențe psihiatrice furnizat\n7. Implicare soț în supraveghere' }
    ], billing: [{ code: 'F33.1', description: 'Tulburare depresivă recurentă, episod mediu' }] },
  ];

  const notedConsultations = insertedConsultations.filter(c => 
    ['finalized', 'reviewed', 'note_generated'].includes(c.status)
  );

  for (let i = 0; i < notedConsultations.length; i++) {
    const c = notedConsultations[i];
    const nd = noteData[i];
    if (!nd) continue;
    const status = c.status === 'finalized' ? 'finalized' : c.status === 'reviewed' ? 'reviewed' : 'draft';
    
    const { error } = await supabase.from('clinical_notes').insert({
      consultation_id: c.id,
      sections: nd.sections,
      billing_codes: nd.billing,
      status,
      ai_model: 'claude-sonnet-4-5-20250514',
      finalized_at: status === 'finalized' ? new Date().toISOString() : null,
      finalized_by: status === 'finalized' ? userId : null,
    });
    if (error) console.error('Note error for', nd.name, error);
  }
  console.log(`✅ ${notedConsultations.length} clinical notes created`);

  // Audit log
  const auditEntries = insertedConsultations.slice(0, 5).map(c => ({
    user_id: userId, action: 'create', resource_type: 'consultation', resource_id: c.id
  }));
  await supabase.from('audit_log').insert(auditEntries);
  console.log('✅ Audit log entries created');

  console.log('\n🎉 Psychiatry data seeded successfully!');
  console.log('10 pacienți psihiatrici cu diagnostice ICD-10, transcrieri și note clinice SOAP');
}

seed().catch(console.error);
