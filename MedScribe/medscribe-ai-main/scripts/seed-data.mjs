import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://oltonmgkzmfcmdbmyyuq.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9sdG9ubWdrem1mY21kYm15eXVxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTkzODQyNSwiZXhwIjoyMDg3NTE0NDI1fQ.xJpkD8urz4TsnzeakS--G8yYI0o69km29VFjmrSVuaM';

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function seed() {
  console.log('🌱 Seeding database...');

  // 1. Create a demo user via auth
  const email = 'demo@medscribe.ai';
  const password = 'Demo1234!';
  
  // Check if user exists
  const { data: existingUsers } = await supabase.auth.admin.listUsers();
  let userId;
  const existing = existingUsers?.users?.find(u => u.email === email);
  
  if (existing) {
    userId = existing.id;
    console.log('✅ Demo user already exists:', userId);
  } else {
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: 'Dr. Maria Popescu' }
    });
    if (authError) { console.error('Auth error:', authError); return; }
    userId = authUser.user.id;
    console.log('✅ Created demo user:', userId);
  }

  // Update user profile
  await supabase.from('users').upsert({
    id: userId,
    full_name: 'Dr. Maria Popescu',
    specialty: 'Medicină de Familie',
    license_number: 'RO-12345',
    role: 'clinician',
    settings: { language: 'ro', theme: 'light' }
  });
  console.log('✅ User profile updated');

  // 2. Create patients
  const patients = [
    { user_id: userId, mrn: 'MRN-001', full_name: 'Ion Marinescu', date_of_birth: '1985-03-15', gender: 'male', contact_info: { phone: '+40721000001', email: 'ion.m@email.com' } },
    { user_id: userId, mrn: 'MRN-002', full_name: 'Elena Dumitrescu', date_of_birth: '1972-08-22', gender: 'female', contact_info: { phone: '+40721000002', email: 'elena.d@email.com' } },
    { user_id: userId, mrn: 'MRN-003', full_name: 'Andrei Ionescu', date_of_birth: '1990-11-05', gender: 'male', contact_info: { phone: '+40721000003', email: 'andrei.i@email.com' } },
    { user_id: userId, mrn: 'MRN-004', full_name: 'Ana Popa', date_of_birth: '1968-01-30', gender: 'female', contact_info: { phone: '+40721000004', email: 'ana.p@email.com' } },
    { user_id: userId, mrn: 'MRN-005', full_name: 'Mihai Stanescu', date_of_birth: '1995-06-12', gender: 'male', contact_info: { phone: '+40721000005', email: 'mihai.s@email.com' } },
    { user_id: userId, mrn: 'MRN-006', full_name: 'Cristina Vlad', date_of_birth: '1980-04-18', gender: 'female', contact_info: { phone: '+40721000006', email: 'cristina.v@email.com' } },
    { user_id: userId, mrn: 'MRN-007', full_name: 'George Radu', date_of_birth: '1955-12-03', gender: 'male', contact_info: { phone: '+40721000007', email: 'george.r@email.com' } },
    { user_id: userId, mrn: 'MRN-008', full_name: 'Daniela Munteanu', date_of_birth: '2001-09-25', gender: 'female', contact_info: { phone: '+40721000008', email: 'daniela.m@email.com' } },
  ];

  const { data: insertedPatients, error: patErr } = await supabase
    .from('patients')
    .upsert(patients, { onConflict: 'user_id,mrn' })
    .select();
  if (patErr) console.error('Patient error:', patErr);
  else console.log(`✅ ${insertedPatients.length} patients created`);

  // Get patient IDs
  const { data: allPatients } = await supabase.from('patients').select('id, full_name').eq('user_id', userId);
  const patientMap = {};
  allPatients.forEach(p => patientMap[p.full_name] = p.id);

  // 3. Create consultations
  const now = new Date();
  const consultations = [
    { user_id: userId, patient_id: patientMap['Ion Marinescu'], visit_type: 'follow-up', status: 'finalized', consent_given: true, consent_timestamp: new Date(now - 7*86400000).toISOString(), recording_duration_seconds: 845, created_at: new Date(now - 7*86400000).toISOString() },
    { user_id: userId, patient_id: patientMap['Elena Dumitrescu'], visit_type: 'general', status: 'note_generated', consent_given: true, consent_timestamp: new Date(now - 5*86400000).toISOString(), recording_duration_seconds: 1230, created_at: new Date(now - 5*86400000).toISOString() },
    { user_id: userId, patient_id: patientMap['Andrei Ionescu'], visit_type: 'general', status: 'reviewed', consent_given: true, consent_timestamp: new Date(now - 3*86400000).toISOString(), recording_duration_seconds: 620, created_at: new Date(now - 3*86400000).toISOString() },
    { user_id: userId, patient_id: patientMap['Ana Popa'], visit_type: 'follow-up', status: 'finalized', consent_given: true, consent_timestamp: new Date(now - 2*86400000).toISOString(), recording_duration_seconds: 980, created_at: new Date(now - 2*86400000).toISOString() },
    { user_id: userId, patient_id: patientMap['Mihai Stanescu'], visit_type: 'general', status: 'transcribed', consent_given: true, consent_timestamp: new Date(now - 1*86400000).toISOString(), recording_duration_seconds: 540, created_at: new Date(now - 1*86400000).toISOString() },
    { user_id: userId, patient_id: patientMap['Cristina Vlad'], visit_type: 'specialist', status: 'finalized', consent_given: true, consent_timestamp: new Date(now - 10*86400000).toISOString(), recording_duration_seconds: 1560, created_at: new Date(now - 10*86400000).toISOString() },
    { user_id: userId, patient_id: patientMap['George Radu'], visit_type: 'general', status: 'scheduled', consent_given: false, created_at: new Date(now + 1*86400000).toISOString() },
    { user_id: userId, patient_id: patientMap['Daniela Munteanu'], visit_type: 'general', status: 'note_generated', consent_given: true, consent_timestamp: new Date(now - 4*86400000).toISOString(), recording_duration_seconds: 720, created_at: new Date(now - 4*86400000).toISOString() },
  ];

  const { data: insertedConsultations, error: conErr } = await supabase
    .from('consultations')
    .insert(consultations)
    .select();
  if (conErr) console.error('Consultation error:', conErr);
  else console.log(`✅ ${insertedConsultations.length} consultations created`);

  // 4. Create transcripts for completed consultations
  const completedConsultations = insertedConsultations?.filter(c => c.status !== 'scheduled') || [];
  
  const transcriptTexts = [
    "Pacientul prezintă dureri lombare persistente de 2 săptămâni. Durerea se accentuează la mișcare și la ridicarea greutăților. Nu prezintă simptome neurologice. Examenul fizic relevă spasm muscular paravertebral bilateral. Recomand AINS, fizioterapie și control la 2 săptămâni.",
    "Pacienta vine pentru control de rutină. Tensiunea arterială 145/90 mmHg. Glicemia à jeun 126 mg/dl. IMC 28.5. Discutăm ajustarea tratamentului antihipertensiv și inițierea dietei hipoglucidice. Recomand analize complete și revenire peste o lună.",
    "Pacientul acuză tuse productivă de 5 zile, febră 38.2°C. Auscultație: raluri bazal dreapta. Saturația O2 97%. Suspiciune pneumonie bazală dreaptă. Recomand radiografie toracică, hemoleucogramă, antibioterapie empirică cu Amoxicilină.",
    "Pacienta revine pentru monitorizarea tratamentului cu Metformin. HbA1c scăzut de la 7.8% la 6.9%. Toleranță bună la medicament. Tensiune 130/85. Recomand continuarea tratamentului, dietă și exercițiu fizic regulat.",
    "Pacientul prezintă erupție cutanată pruriginoasă pe brațe și trunchi de 3 zile. Fără febră. Posibil contact alergic. Recomand antihistaminic, cremă cu corticoid topic și evitarea factorilor declanșatori.",
    "Pacienta referită pentru evaluare cardiologică. ECG: ritm sinusal normal. Ecocardiografie: FE 60%, fără anomalii valvulare. Recomand monitorizare tensiune, continuarea tratamentului actual. Revizuire peste 6 luni.",
    "Pacienta prezintă cefalee frecventă de tip tensional. Fără simptome de alarmă. Examen neurologic normal. Discutăm managementul stresului, hidratare, somn regulat. Recomand paracetamol la nevoie și jurnal cefalee.",
  ];

  for (let i = 0; i < completedConsultations.length; i++) {
    const c = completedConsultations[i];
    const text = transcriptTexts[i % transcriptTexts.length];
    const { error: trErr } = await supabase.from('transcripts').upsert({
      consultation_id: c.id,
      full_text: text,
      language: 'ro',
      provider: 'deepgram',
      segments: [{ start: 0, end: 60, text, speaker: 'doctor' }]
    }, { onConflict: 'consultation_id' });
    if (trErr) console.error('Transcript error:', trErr);
  }
  console.log(`✅ ${completedConsultations.length} transcripts created`);

  // 5. Create clinical notes for finalized/reviewed consultations
  const notedConsultations = insertedConsultations?.filter(c => 
    ['finalized', 'reviewed', 'note_generated'].includes(c.status)
  ) || [];

  const soapNotes = [
    { subjective: "Pacientul acuză dureri lombare de 2 săptămâni, agravate de mișcare.", objective: "Spasm muscular paravertebral bilateral. ROM lombar limitat.", assessment: "Lombalgie mecanică (M54.5)", plan: "Ibuprofen 400mg x3/zi, fizioterapie 10 ședințe, control 2 săpt." },
    { subjective: "Control de rutină. Pacienta acuză oboseală și sete crescută.", objective: "TA 145/90, IMC 28.5, glicemie 126 mg/dl", assessment: "HTA gr. I, Diabet zaharat tip 2 suspicionat", plan: "Ajustare Enalapril, analize HbA1c, profil lipidic, revenire 1 lună" },
    { subjective: "Tuse productivă 5 zile, febră 38.2°C, frisoane.", objective: "Raluri bazal dreapta, SaO2 97%, FR 18/min", assessment: "Pneumonie comunitară bazală dreaptă (J18.9)", plan: "Amoxicilină 1g x3/zi 7 zile, Rx torace, hemoleucogramă, control 3 zile" },
    { subjective: "Revenire monitorizare diabet. Se simte mai bine, tolerează Metformin.", objective: "TA 130/85, greutate -2kg, HbA1c 6.9%", assessment: "DZ tip 2 - control îmbunătățit", plan: "Continuare Metformin 850mg x2, dietă, exercițiu fizic, control 3 luni" },
    { subjective: "Pacientul raportează cefalee frecventă, oboseală cronică.", objective: "Examen neurologic normal, TA 120/80", assessment: "Cefalee de tip tensional (G44.2)", plan: "Paracetamol PRN, jurnal cefalee, management stres, control 1 lună" },
  ];

  for (let i = 0; i < notedConsultations.length; i++) {
    const c = notedConsultations[i];
    const soap = soapNotes[i % soapNotes.length];
    const status = c.status === 'finalized' ? 'finalized' : c.status === 'reviewed' ? 'reviewed' : 'draft';
    
    const { error: noteErr } = await supabase.from('clinical_notes').insert({
      consultation_id: c.id,
      sections: [
        { id: 'subjective', title: 'Subjective', content: soap.subjective },
        { id: 'objective', title: 'Objective', content: soap.objective },
        { id: 'assessment', title: 'Assessment', content: soap.assessment },
        { id: 'plan', title: 'Plan', content: soap.plan },
      ],
      billing_codes: [{ code: 'J18.9', description: 'Pneumonia' }],
      status,
      ai_model: 'claude-3-sonnet',
      finalized_at: status === 'finalized' ? new Date().toISOString() : null,
      finalized_by: status === 'finalized' ? userId : null,
    });
    if (noteErr) console.error('Note error:', noteErr);
  }
  console.log(`✅ ${notedConsultations.length} clinical notes created`);

  // 6. Create audit log entries
  const auditEntries = [
    { user_id: userId, action: 'login', resource_type: 'session', resource_id: userId },
    { user_id: userId, action: 'create', resource_type: 'consultation', resource_id: insertedConsultations?.[0]?.id || userId },
    { user_id: userId, action: 'generate_note', resource_type: 'clinical_note', resource_id: insertedConsultations?.[0]?.id || userId },
    { user_id: userId, action: 'finalize', resource_type: 'clinical_note', resource_id: insertedConsultations?.[0]?.id || userId },
  ];

  const { error: auditErr } = await supabase.from('audit_log').insert(auditEntries);
  if (auditErr) console.error('Audit error:', auditErr);
  else console.log('✅ Audit log entries created');

  console.log('\n🎉 Database seeded successfully!');
  console.log(`\n📧 Demo login: ${email} / ${password}`);
}

seed().catch(console.error);
