import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://oltonmgkzmfcmdbmyyuq.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9sdG9ubWdrem1mY21kYm15eXVxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTkzODQyNSwiZXhwIjoyMDg3NTE0NDI1fQ.xJpkD8urz4TsnzeakS--G8yYI0o69km29VFjmrSVuaM',
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function fix() {
  // Get all consultations with patient_id
  const { data: consultations } = await supabase
    .from('consultations')
    .select('id, patient_id, metadata')
    .not('patient_id', 'is', null);

  console.log(`Found ${consultations.length} consultations to fix`);

  for (const c of consultations) {
    // Get patient name
    const { data: patient } = await supabase
      .from('patients')
      .select('full_name, mrn')
      .eq('id', c.patient_id)
      .single();

    if (!patient) continue;

    const metadata = { ...(c.metadata || {}), patient_name: patient.full_name, patient_code: patient.mrn };
    
    const { error } = await supabase
      .from('consultations')
      .update({ metadata })
      .eq('id', c.id);

    if (error) console.error('Error:', c.id, error);
    else console.log(`✅ ${patient.full_name} (${patient.mrn})`);
  }

  console.log('\n🎉 All patient names fixed in consultation metadata!');
}

fix().catch(console.error);
