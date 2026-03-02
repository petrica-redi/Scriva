import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://oltonmgkzmfcmdbmyyuq.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9sdG9ubWdrem1mY21kYm15eXVxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTkzODQyNSwiZXhwIjoyMDg3NTE0NDI1fQ.xJpkD8urz4TsnzeakS--G8yYI0o69km29VFjmrSVuaM',
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function seed() {
  console.log('🚨 Adding risk data to consultations...');

  const { data: users } = await supabase.auth.admin.listUsers();
  const diana = users?.users?.find(u => u.email === 'd.i.pirjol@gmail.com');
  if (!diana) { console.error('User not found'); return; }

  // Get all consultations with their patient info
  const { data: consultations } = await supabase
    .from('consultations')
    .select('id, patient_id, metadata')
    .eq('user_id', diana.id);

  // Get all patients
  const { data: patients } = await supabase
    .from('patients')
    .select('id, full_name, mrn')
    .eq('user_id', diana.id);

  const patientMap = {};
  patients.forEach(p => patientMap[p.id] = p);

  // Define risk profiles by patient name
  const riskProfiles = {
    "James O'Brien": { level: 'high', signals: [
      { label: 'suicidal ideation', severity: 'critical' },
      { label: 'alcohol misuse', severity: 'high' },
    ]},
    'Alexandru Marin': { level: 'high', signals: [
      { label: 'suicidal ideation', severity: 'critical' },
      { label: 'anhedonia', severity: 'high' },
    ]},
    'Maria Ene': { level: 'high', signals: [
      { label: 'suicidal ideation', severity: 'critical' },
      { label: 'weight loss', severity: 'medium' },
    ]},
    'Fatima Al-Hassan': { level: 'high', signals: [
      { label: 'self harm', severity: 'high' },
      { label: 'dissociative episodes', severity: 'high' },
    ]},
    'Isabella Rossi': { level: 'high', signals: [
      { label: 'self harm', severity: 'high' },
      { label: 'impulsivity', severity: 'medium' },
    ]},
    'Hans Müller': { level: 'high', signals: [
      { label: 'substance abuse', severity: 'critical' },
      { label: 'withdrawal seizure', severity: 'critical' },
    ]},
    'Andreea Niță': { level: 'high', signals: [
      { label: 'flashbacks', severity: 'high' },
      { label: 'avoidance behavior', severity: 'medium' },
    ]},
    'Olga Petrova': { level: 'high', signals: [
      { label: 'treatment resistant', severity: 'high' },
      { label: 'passive suicidal ideation', severity: 'high' },
    ]},
    'Kwame Asante': { level: 'high', signals: [
      { label: 'psychotic symptoms', severity: 'critical' },
      { label: 'first episode', severity: 'high' },
    ]},
    'Florin Diaconu': { level: 'medium', signals: [
      { label: 'psychotic symptoms', severity: 'medium' },
      { label: 'limited insight', severity: 'medium' },
    ]},
    'Mihai Constantinescu': { level: 'medium', signals: [
      { label: 'cognitive decline', severity: 'medium' },
      { label: 'deterioration', severity: 'medium' },
    ]},
    'Yuki Tanaka': { level: 'high', signals: [
      { label: 'low BMI', severity: 'critical' },
      { label: 'bradycardia', severity: 'high' },
    ]},
    'Sophie Lefèvre': { level: 'medium', signals: [
      { label: 'agoraphobia', severity: 'medium' },
      { label: 'functional impairment', severity: 'medium' },
    ]},
    'Ioana Gheorghe': { level: 'medium', signals: [
      { label: 'deterioration', severity: 'medium' },
    ]},
    'Gabriela Tudor': { level: 'medium', signals: [
      { label: 'compulsive rituals', severity: 'medium' },
    ]},
    'Erik Johansson': { level: 'medium', signals: [
      { label: 'substance use', severity: 'medium' },
      { label: 'occupational risk', severity: 'medium' },
    ]},
    'Michael Chen': { level: 'medium', signals: [
      { label: 'depressive episode', severity: 'medium' },
      { label: 'functional decline', severity: 'medium' },
    ]},
    'Aisha Patel': { level: 'high', signals: [
      { label: 'intrusive harm thoughts', severity: 'high' },
      { label: 'impaired bonding', severity: 'high' },
    ]},
  };

  let updated = 0;
  for (const c of consultations) {
    const patient = patientMap[c.patient_id];
    if (!patient) continue;

    const risk = riskProfiles[patient.full_name];
    if (!risk) continue;

    const metadata = {
      ...(c.metadata || {}),
      patient_name: patient.full_name,
      patient_code: patient.mrn,
      risk_level: risk.level,
      risk_signals: risk.signals,
    };

    const { error } = await supabase
      .from('consultations')
      .update({ metadata })
      .eq('id', c.id);

    if (!error) {
      updated++;
      console.log(`✅ ${patient.full_name} — ${risk.level} risk`);
    } else {
      console.error(`❌ ${patient.full_name}:`, error);
    }
  }

  console.log(`\n🎉 Updated ${updated} consultations with risk data!`);
}

seed().catch(console.error);
