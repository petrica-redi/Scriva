import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://oltonmgkzmfcmdbmyyuq.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9sdG9ubWdrem1mY21kYm15eXVxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTkzODQyNSwiZXhwIjoyMDg3NTE0NDI1fQ.xJpkD8urz4TsnzeakS--G8yYI0o69km29VFjmrSVuaM',
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function addSchedule() {
  console.log('📅 Adding today & tomorrow scheduled consultations...');

  const { data: users } = await supabase.auth.admin.listUsers();
  const diana = users?.users?.find(u => u.email === 'd.i.pirjol@gmail.com');
  if (!diana) { console.error('User not found'); return; }
  const userId = diana.id;

  // Get patients
  const { data: patients } = await supabase.from('patients').select('id, full_name, mrn').eq('user_id', userId);
  const pm = {};
  patients.forEach(p => pm[p.full_name] = p);

  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  // Delete old today/tomorrow consultations we created before (to avoid duplicates)
  // Keep user-created ones

  const schedule = [
    // Today
    { patient: 'Viktor Sava', time: `${todayStr}T07:00:00.000Z`, visit: 'general', status: 'transcribed', diag: 'ADHD, predominantly inattentive', icd: 'F90.0' },
    { patient: 'Ioana Gheorghe', time: `${todayStr}T08:00:00.000Z`, visit: 'follow-up', status: 'note_generated', diag: 'Generalized Anxiety Disorder', icd: 'F41.1' },
    { patient: 'Fatima Al-Hassan', time: `${todayStr}T09:30:00.000Z`, visit: 'follow-up', status: 'recording', diag: 'Complex PTSD', icd: 'F43.10' },
    { patient: 'Michael Chen', time: `${todayStr}T11:00:00.000Z`, visit: 'follow-up', status: 'scheduled', diag: 'Bipolar II, depressive episode', icd: 'F31.81' },
    { patient: 'Gabriela Tudor', time: `${todayStr}T14:00:00.000Z`, visit: 'follow-up', status: 'scheduled', diag: 'OCD, mixed form', icd: 'F42.2' },
    { patient: 'Aisha Patel', time: `${todayStr}T15:30:00.000Z`, visit: 'follow-up', status: 'scheduled', diag: 'Postpartum Depression', icd: 'F53.0' },
    // Tomorrow
    { patient: 'Daniela Oprea', time: `${tomorrowStr}T08:00:00.000Z`, visit: 'follow-up', status: 'scheduled', diag: 'Panic Disorder', icd: 'F41.0' },
    { patient: "James O'Brien", time: `${tomorrowStr}T09:00:00.000Z`, visit: 'follow-up', status: 'scheduled', diag: 'Major Depressive Disorder, recurrent, severe', icd: 'F33.2' },
    { patient: 'Florin Diaconu', time: `${tomorrowStr}T10:30:00.000Z`, visit: 'follow-up', status: 'scheduled', diag: 'Paranoid Schizophrenia — depot injection', icd: 'F20.0' },
    { patient: 'Isabella Rossi', time: `${tomorrowStr}T13:00:00.000Z`, visit: 'general', status: 'scheduled', diag: 'Borderline Personality Disorder', icd: 'F60.3' },
    { patient: 'Erik Johansson', time: `${tomorrowStr}T14:30:00.000Z`, visit: 'follow-up', status: 'scheduled', diag: 'Social Anxiety Disorder', icd: 'F40.10' },
    { patient: 'Olga Petrova', time: `${tomorrowStr}T16:00:00.000Z`, visit: 'follow-up', status: 'scheduled', diag: 'Treatment-Resistant Depression', icd: 'F32.2' },
  ];

  for (const s of schedule) {
    const p = pm[s.patient];
    if (!p) {
      // Try partial match
      const found = patients.find(pt => pt.full_name.includes(s.patient.split(' ')[1]));
      if (!found) { console.log(`⚠️ Patient not found: ${s.patient}`); continue; }
      pm[s.patient] = found;
    }
    const patient = pm[s.patient];

    const riskProfiles = {
      "James O'Brien": { level: 'high', signals: [{ label: 'suicidal ideation', severity: 'critical' }, { label: 'alcohol misuse', severity: 'high' }] },
      'Fatima Al-Hassan': { level: 'high', signals: [{ label: 'self harm', severity: 'high' }, { label: 'dissociative episodes', severity: 'high' }] },
      'Isabella Rossi': { level: 'high', signals: [{ label: 'self harm', severity: 'high' }, { label: 'impulsivity', severity: 'medium' }] },
      'Olga Petrova': { level: 'high', signals: [{ label: 'treatment resistant', severity: 'high' }, { label: 'passive suicidal ideation', severity: 'high' }] },
      'Aisha Patel': { level: 'high', signals: [{ label: 'intrusive harm thoughts', severity: 'high' }, { label: 'impaired bonding', severity: 'high' }] },
    };

    const risk = riskProfiles[s.patient];

    const metadata = {
      patient_name: patient.full_name,
      patient_code: patient.mrn,
      diagnosis_code: s.icd,
      primary_diagnosis: s.diag,
      ...(risk ? { risk_level: risk.level, risk_signals: risk.signals } : {}),
    };

    const { error } = await supabase.from('consultations').insert({
      user_id: userId,
      patient_id: patient.id,
      visit_type: s.visit,
      status: s.status,
      consent_given: s.status !== 'scheduled',
      consent_timestamp: s.status !== 'scheduled' ? s.time : null,
      metadata,
      created_at: s.time,
    });

    if (error) console.error(`❌ ${s.patient}:`, error.message);
    else console.log(`✅ ${s.patient} — ${s.time.split('T')[0]} at ${s.time.split('T')[1].slice(0,5)} — ${s.diag}`);
  }

  console.log('\n🎉 2-day schedule populated!');
}

addSchedule().catch(console.error);
