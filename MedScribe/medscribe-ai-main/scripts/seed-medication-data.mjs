import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://oltonmgkzmfcmdbmyyuq.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9sdG9ubWdrem1mY21kYm15eXVxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTkzODQyNSwiZXhwIjoyMDg3NTE0NDI1fQ.xJpkD8urz4TsnzeakS--G8yYI0o69km29VFjmrSVuaM',
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function seed() {
  console.log('💊 Seeding medication alerts and prescriptions...');

  const { data: users } = await supabase.auth.admin.listUsers();
  const diana = users?.users?.find(u => u.email === 'd.i.pirjol@gmail.com');
  if (!diana) { console.error('User not found'); return; }

  const { data: patients } = await supabase.from('patients').select('id, full_name, mrn').eq('user_id', diana.id);
  const pm = {};
  patients.forEach(p => pm[p.full_name] = p);

  // Define medication alerts per patient
  const medData = {
    'Cristian Bălan': {
      alerts: [
        { id: 'ma-1', patientName: 'Cristian Bălan', mrn: 'PSY-003', type: 'lab_due', severity: 'critical', title: 'Lithium level overdue', detail: 'Last litemie: 0.72 mEq/L on Jan 15. Quarterly check due Feb 15. 11 days overdue.', dueDate: 'Feb 15' },
        { id: 'ma-2', patientName: 'Cristian Bălan', mrn: 'PSY-003', type: 'lab_due', severity: 'medium', title: 'TSH monitoring due', detail: 'Thyroid function check due with lithium level. Last: 3.1 mU/L.', dueDate: 'Feb 15' },
      ],
      prescriptions: [
        { id: 'rx-1', patientName: 'Cristian Bălan', mrn: 'PSY-003', medication: 'Lithium Carbonate', dosage: '900mg/day', expiresIn: 5, status: 'urgent', lastRefill: 'Jan 28' },
        { id: 'rx-2', patientName: 'Cristian Bălan', mrn: 'PSY-003', medication: 'Quetiapine', dosage: '200mg nocte', expiresIn: 5, status: 'urgent', lastRefill: 'Jan 28' },
      ]
    },
    'Florin Diaconu': {
      alerts: [
        { id: 'ma-3', patientName: 'Florin Diaconu', mrn: 'PSY-007', type: 'lab_due', severity: 'high', title: 'Prolactin level due', detail: 'Monitoring due at 6 months on Paliperidone depot. Last: 35 ng/ml (elevated). Check for gynecomastia symptoms.', dueDate: 'Mar 1' },
        { id: 'ma-4', patientName: 'Florin Diaconu', mrn: 'PSY-007', type: 'monitoring', severity: 'medium', title: 'Metabolic panel due', detail: 'Fasting glucose + lipids monitoring on antipsychotic. Annual check.', dueDate: 'Mar 5' },
      ],
      prescriptions: [
        { id: 'rx-3', patientName: 'Florin Diaconu', mrn: 'PSY-007', medication: 'Paliperidone Palmitate', dosage: '150mg IM monthly', expiresIn: 3, status: 'urgent', lastRefill: 'Jan 26' },
      ]
    },
    'Maria Ene': {
      alerts: [
        { id: 'ma-5', patientName: 'Maria Ene', mrn: 'PSY-008', type: 'monitoring', severity: 'critical', title: 'Weekly suicide risk assessment due', detail: 'Patient has passive suicidal ideation. Last assessment 8 days ago. Weekly review mandated.', dueDate: 'Feb 25' },
        { id: 'ma-6', patientName: 'Maria Ene', mrn: 'PSY-008', type: 'monitoring', severity: 'high', title: 'Venlafaxine titration check', detail: 'Started 75mg 10 days ago. Due for titration to 150mg. Check BP (SNRI hypertension risk).', dueDate: 'Feb 27' },
      ],
      prescriptions: [
        { id: 'rx-4', patientName: 'Maria Ene', mrn: 'PSY-008', medication: 'Venlafaxine XR', dosage: '75mg → 150mg', expiresIn: -1, status: 'overdue', lastRefill: 'Feb 16' },
        { id: 'rx-5', patientName: 'Maria Ene', mrn: 'PSY-008', medication: 'Trazodone', dosage: '50mg nocte', expiresIn: 12, status: 'upcoming', lastRefill: 'Feb 16' },
      ]
    },
    "James O'Brien": {
      alerts: [
        { id: 'ma-7', patientName: "James O'Brien", mrn: 'INT-001', type: 'lab_due', severity: 'critical', title: 'Baseline renal + thyroid for Lithium', detail: 'Lithium augmentation initiated. Baseline U&E, eGFR, TSH required BEFORE continuing. Not yet done.', dueDate: 'ASAP' },
        { id: 'ma-8', patientName: "James O'Brien", mrn: 'INT-001', type: 'interaction', severity: 'high', title: 'Alcohol + Lithium interaction', detail: 'Patient reports 3-4 units nightly. Alcohol increases lithium toxicity risk. Counsel urgently.', dueDate: '' },
      ],
      prescriptions: [
        { id: 'rx-6', patientName: "James O'Brien", mrn: 'INT-001', medication: 'Lithium Carbonate', dosage: '400mg/day', expiresIn: 14, status: 'upcoming', lastRefill: 'Feb 14' },
        { id: 'rx-7', patientName: "James O'Brien", mrn: 'INT-001', medication: 'Venlafaxine XR', dosage: '225mg/day', expiresIn: -3, status: 'overdue', lastRefill: 'Feb 9' },
      ]
    },
    'Yuki Tanaka': {
      alerts: [
        { id: 'ma-9', patientName: 'Yuki Tanaka', mrn: 'INT-004', type: 'monitoring', severity: 'critical', title: 'ECG monitoring — bradycardia', detail: 'HR 48bpm at last visit. Fortnightly ECG required. QTc was normal (410ms). Recheck due.', dueDate: 'Feb 28' },
        { id: 'ma-10', patientName: 'Yuki Tanaka', mrn: 'INT-004', type: 'lab_due', severity: 'high', title: 'Electrolytes + bone density', detail: 'Osteopenia on DEXA. Calcium + Vitamin D supplementation monitoring. Electrolytes for refeeding risk.', dueDate: 'Mar 1' },
      ],
      prescriptions: [
        { id: 'rx-8', patientName: 'Yuki Tanaka', mrn: 'INT-004', medication: 'Calcium + Vit D', dosage: '1000mg + 2000IU', expiresIn: 7, status: 'urgent', lastRefill: 'Feb 5' },
      ]
    },
    'Hans Müller': {
      alerts: [
        { id: 'ma-11', patientName: 'Hans Müller', mrn: 'INT-003', type: 'monitoring', severity: 'critical', title: 'Post-detox Naltrexone initiation', detail: 'Medically supervised detox completing. Naltrexone 50mg to start once abstinent 7-10 days. Liver function check required first (GGT was 340).', dueDate: 'Feb 28' },
        { id: 'ma-12', patientName: 'Hans Müller', mrn: 'INT-003', type: 'lab_due', severity: 'high', title: 'Liver function tests', detail: 'GGT 340, AST 95 at admission. Repeat LFTs before Naltrexone. MCV 104 — check B12/folate.', dueDate: 'Feb 27' },
      ],
      prescriptions: [
        { id: 'rx-9', patientName: 'Hans Müller', mrn: 'INT-003', medication: 'Thiamine (IV→oral)', dosage: '300mg oral/day', expiresIn: 0, status: 'overdue', lastRefill: 'Feb 20' },
        { id: 'rx-10', patientName: 'Hans Müller', mrn: 'INT-003', medication: 'Diazepam reducing', dosage: '10mg → taper', expiresIn: 2, status: 'urgent', lastRefill: 'Feb 22' },
      ]
    },
    'Alexandru Marin': {
      prescriptions: [
        { id: 'rx-11', patientName: 'Alexandru Marin', mrn: 'PSY-001', medication: 'Sertraline', dosage: '50mg → 100mg', expiresIn: -2, status: 'overdue', lastRefill: 'Feb 12' },
      ]
    },
    'Ioana Gheorghe': {
      prescriptions: [
        { id: 'rx-12', patientName: 'Ioana Gheorghe', mrn: 'PSY-002', medication: 'Escitalopram', dosage: '10mg/day', expiresIn: 8, status: 'upcoming', lastRefill: 'Feb 16' },
        { id: 'rx-13', patientName: 'Ioana Gheorghe', mrn: 'PSY-002', medication: 'Alprazolam', dosage: '0.25mg nocte (2wk only)', expiresIn: -4, status: 'overdue', lastRefill: 'Feb 10' },
      ]
    },
    'Olga Petrova': {
      alerts: [
        { id: 'ma-13', patientName: 'Olga Petrova', mrn: 'INT-011', type: 'lab_due', severity: 'high', title: 'Lithium level check', detail: 'Lithium augmentation at 800mg. Level check needed. Thyroid function also due.', dueDate: 'Feb 28' },
      ],
      prescriptions: [
        { id: 'rx-14', patientName: 'Olga Petrova', mrn: 'INT-011', medication: 'Venlafaxine XR', dosage: '225mg/day', expiresIn: 4, status: 'urgent', lastRefill: 'Feb 8' },
        { id: 'rx-15', patientName: 'Olga Petrova', mrn: 'INT-011', medication: 'Lithium Carbonate', dosage: '800mg/day', expiresIn: 4, status: 'urgent', lastRefill: 'Feb 8' },
      ]
    },
  };

  // Update consultations with medication data
  const { data: consultations } = await supabase
    .from('consultations')
    .select('id, patient_id, metadata')
    .eq('user_id', diana.id);

  let updated = 0;
  for (const c of consultations) {
    const patient = patients.find(p => p.id === c.patient_id);
    if (!patient) continue;
    
    const md = medData[patient.full_name];
    if (!md) continue;

    const metadata = {
      ...(c.metadata || {}),
      ...(md.alerts ? { medication_alerts: md.alerts } : {}),
      ...(md.prescriptions ? { pending_prescriptions: md.prescriptions } : {}),
    };

    const { error } = await supabase
      .from('consultations')
      .update({ metadata })
      .eq('id', c.id);

    if (!error) {
      updated++;
      console.log(`✅ ${patient.full_name} — ${md.alerts?.length || 0} alerts, ${md.prescriptions?.length || 0} prescriptions`);
    }
  }

  console.log(`\n🎉 Updated ${updated} consultations with medication data!`);
}

seed().catch(console.error);
