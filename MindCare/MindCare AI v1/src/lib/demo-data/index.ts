// Centralized demo data for MindCare AI v1
// Used across dashboard, analytics, calendar, portal, etc.

export interface DemoPatient {
  id: string;
  name: string;
  mrn: string;
  dob: string;
  gender: string;
  diagnosis: string;
  icd10: string;
  riskLevel: 'high' | 'medium' | 'low';
  riskFlags: { type: string; severity: 'critical' | 'high' | 'medium' | 'low'; description: string; description_ro?: string }[];
}

export interface DemoConsultation {
  id: string;
  patientName: string;
  patientId: string;
  visitType: string;
  status: string;
  date: Date;
  duration: number; // minutes
  diagnosis: string;
  transcript?: string;
}

export interface DemoMoodEntry {
  date: string;
  score: number;
  notes: string;
}

export interface DemoJournalEntry {
  id: string;
  date: string;
  prompt: string;
  content: string;
}

export interface DemoSessionSummary {
  id: string;
  date: string;
  therapist: string;
  summary: string;
  actionPoints: string[];
  moodBefore: number;
  moodAfter: number;
}

export const DEMO_PATIENTS: DemoPatient[] = [
  {
    id: 'p1', name: 'Maria Popescu', mrn: 'MRN-001', dob: '1985-03-15', gender: 'female',
    diagnosis: 'Major Depressive Disorder, Recurrent', icd10: 'F33.1',
    riskLevel: 'high',
    riskFlags: [
      { type: 'suicidal_ideation', severity: 'critical', description: 'Expressed passive suicidal thoughts during last session', description_ro: 'A exprimat gânduri suicidare pasive în ultima ședință' },
    ],
  },
  {
    id: 'p2', name: 'Ion Ionescu', mrn: 'MRN-002', dob: '1978-07-22', gender: 'male',
    diagnosis: 'Generalized Anxiety Disorder + Alcohol Use Disorder', icd10: 'F41.1',
    riskLevel: 'high',
    riskFlags: [
      { type: 'medication_noncompliance', severity: 'high', description: 'Missed last 3 medication refills', description_ro: 'A ratat ultimele 3 reumpleri de medicație' },
      { type: 'substance_abuse', severity: 'medium', description: 'Reported increased alcohol consumption', description_ro: 'A raportat consum crescut de alcool' },
    ],
  },
  {
    id: 'p3', name: 'Ana Dumitrescu', mrn: 'MRN-003', dob: '1992-11-08', gender: 'female',
    diagnosis: 'Bipolar Disorder Type II', icd10: 'F31.81',
    riskLevel: 'medium',
    riskFlags: [
      { type: 'deterioration', severity: 'medium', description: 'PHQ-9 score increased from 12 to 18', description_ro: 'Scorul PHQ-9 a crescut de la 12 la 18' },
    ],
  },
  {
    id: 'p4', name: 'Elena Vasile', mrn: 'MRN-004', dob: '2000-01-30', gender: 'female',
    diagnosis: 'PTSD + Borderline Personality Disorder', icd10: 'F43.10',
    riskLevel: 'high',
    riskFlags: [
      { type: 'self_harm', severity: 'high', description: 'History of self-harm, recent stressor identified', description_ro: 'Istoric de automutilare, factor de stres recent identificat' },
    ],
  },
  {
    id: 'p5', name: 'Andrei Popa', mrn: 'MRN-005', dob: '1990-05-12', gender: 'male',
    diagnosis: 'Schizophrenia, Paranoid Type', icd10: 'F20.0',
    riskLevel: 'medium',
    riskFlags: [
      { type: 'psychotic_symptoms', severity: 'high', description: 'New onset auditory hallucinations reported', description_ro: 'Halucinații auditive nou apărute raportate' },
    ],
  },
  {
    id: 'p6', name: 'Cristina Marin', mrn: 'MRN-006', dob: '1988-09-18', gender: 'female',
    diagnosis: 'OCD + Social Anxiety', icd10: 'F42.2',
    riskLevel: 'low',
    riskFlags: [],
  },
  {
    id: 'p7', name: 'Mihai Radu', mrn: 'MRN-007', dob: '1995-12-03', gender: 'male',
    diagnosis: 'ADHD, Combined Type', icd10: 'F90.2',
    riskLevel: 'low',
    riskFlags: [],
  },
  {
    id: 'p8', name: 'Laura Stan', mrn: 'MRN-008', dob: '1982-06-25', gender: 'female',
    diagnosis: 'Panic Disorder with Agoraphobia', icd10: 'F40.01',
    riskLevel: 'medium',
    riskFlags: [
      { type: 'deterioration', severity: 'medium', description: 'Panic attacks increased from 2/week to daily', description_ro: 'Atacurile de panică au crescut de la 2/săptămână la zilnic' },
    ],
  },
];

// Generate consultations relative to "now"
function generateDemoConsultations(): DemoConsultation[] {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  return [
    { id: 'dc1', patientName: 'Maria Popescu', patientId: 'p1', visitType: 'Psychiatric Evaluation', status: 'finalized', date: new Date(today.getTime() - 6 * 86400000 + 9 * 3600000), duration: 50, diagnosis: 'F33.1 — MDD Recurrent' },
    { id: 'dc2', patientName: 'Ion Ionescu', patientId: 'p2', visitType: 'CBT Session', status: 'finalized', date: new Date(today.getTime() - 6 * 86400000 + 11 * 3600000), duration: 45, diagnosis: 'F41.1 — GAD' },
    { id: 'dc3', patientName: 'Elena Vasile', patientId: 'p4', visitType: 'Crisis Follow-up', status: 'finalized', date: new Date(today.getTime() - 5 * 86400000 + 9 * 3600000), duration: 60, diagnosis: 'F43.10 — PTSD' },
    { id: 'dc4', patientName: 'Ana Dumitrescu', patientId: 'p3', visitType: 'Medication Management', status: 'finalized', date: new Date(today.getTime() - 5 * 86400000 + 14 * 3600000), duration: 30, diagnosis: 'F31.81 — Bipolar II' },
    { id: 'dc5', patientName: 'Andrei Popa', patientId: 'p5', visitType: 'Psychiatric Evaluation', status: 'reviewed', date: new Date(today.getTime() - 4 * 86400000 + 10 * 3600000), duration: 55, diagnosis: 'F20.0 — Schizophrenia' },
    { id: 'dc6', patientName: 'Cristina Marin', patientId: 'p6', visitType: 'CBT Session', status: 'finalized', date: new Date(today.getTime() - 3 * 86400000 + 15 * 3600000), duration: 45, diagnosis: 'F42.2 — OCD' },
    { id: 'dc7', patientName: 'Mihai Radu', patientId: 'p7', visitType: 'Follow-up Visit', status: 'note_generated', date: new Date(today.getTime() - 2 * 86400000 + 11 * 3600000), duration: 30, diagnosis: 'F90.2 — ADHD' },
    { id: 'dc8', patientName: 'Laura Stan', patientId: 'p8', visitType: 'CBT Session', status: 'finalized', date: new Date(today.getTime() - 2 * 86400000 + 16 * 3600000), duration: 50, diagnosis: 'F40.01 — Panic Disorder' },
    { id: 'dc9', patientName: 'Maria Popescu', patientId: 'p1', visitType: 'Follow-up Visit', status: 'transcribed', date: new Date(today.getTime() - 1 * 86400000 + 9 * 3600000), duration: 45, diagnosis: 'F33.1 — MDD Recurrent' },
    { id: 'dc10', patientName: 'Ion Ionescu', patientId: 'p2', visitType: 'Medication Management', status: 'note_generated', date: new Date(today.getTime() - 1 * 86400000 + 14 * 3600000), duration: 25, diagnosis: 'F41.1 — GAD' },
    // Today
    { id: 'dc11', patientName: 'Elena Vasile', patientId: 'p4', visitType: 'DBT Session', status: 'scheduled', date: new Date(today.getTime() + 9 * 3600000), duration: 50, diagnosis: 'F43.10 — PTSD' },
    { id: 'dc12', patientName: 'Ana Dumitrescu', patientId: 'p3', visitType: 'Psychiatric Evaluation', status: 'scheduled', date: new Date(today.getTime() + 10.5 * 3600000), duration: 50, diagnosis: 'F31.81 — Bipolar II' },
    { id: 'dc13', patientName: 'Andrei Popa', patientId: 'p5', visitType: 'Medication Management', status: 'scheduled', date: new Date(today.getTime() + 14 * 3600000), duration: 30, diagnosis: 'F20.0 — Schizophrenia' },
    { id: 'dc14', patientName: 'Maria Popescu', patientId: 'p1', visitType: 'CBT Session', status: 'scheduled', date: new Date(today.getTime() + 16 * 3600000), duration: 45, diagnosis: 'F33.1 — MDD Recurrent' },
    // Tomorrow+
    { id: 'dc15', patientName: 'Cristina Marin', patientId: 'p6', visitType: 'CBT Session', status: 'scheduled', date: new Date(today.getTime() + 86400000 + 10 * 3600000), duration: 45, diagnosis: 'F42.2 — OCD' },
    { id: 'dc16', patientName: 'Mihai Radu', patientId: 'p7', visitType: 'Follow-up Visit', status: 'scheduled', date: new Date(today.getTime() + 86400000 + 14 * 3600000), duration: 30, diagnosis: 'F90.2 — ADHD' },
    { id: 'dc17', patientName: 'Laura Stan', patientId: 'p8', visitType: 'Group Therapy', status: 'scheduled', date: new Date(today.getTime() + 2 * 86400000 + 15 * 3600000), duration: 90, diagnosis: 'F40.01 — Panic Disorder' },
    { id: 'dc18', patientName: 'Ion Ionescu', patientId: 'p2', visitType: 'CBT Session', status: 'scheduled', date: new Date(today.getTime() + 3 * 86400000 + 11 * 3600000), duration: 45, diagnosis: 'F41.1 — GAD' },
  ];
}

export const DEMO_CONSULTATIONS = generateDemoConsultations();

// Weekly consultation counts (for analytics chart)
export const DEMO_WEEKLY_STATS = [
  { week: 'Week 1', count: 18 },
  { week: 'Week 2', count: 22 },
  { week: 'Week 3', count: 15 },
  { week: 'Week 4', count: 24 },
  { week: 'Week 5', count: 20 },
  { week: 'Week 6', count: 26 },
  { week: 'Week 7', count: 19 },
  { week: 'This Week', count: 14 },
];

export const DEMO_DIAGNOSIS_DISTRIBUTION = [
  { name: 'Major Depressive Disorder', icd10: 'F33', count: 28, color: '#3B82F6' },
  { name: 'Generalized Anxiety Disorder', icd10: 'F41.1', count: 22, color: '#6366F1' },
  { name: 'PTSD', icd10: 'F43.1', count: 12, color: '#EF4444' },
  { name: 'Bipolar Disorder', icd10: 'F31', count: 8, color: '#A855F7' },
  { name: 'ADHD', icd10: 'F90', count: 10, color: '#22C55E' },
  { name: 'OCD', icd10: 'F42', count: 6, color: '#F59E0B' },
  { name: 'Schizophrenia', icd10: 'F20', count: 4, color: '#EC4899' },
  { name: 'Substance Use Disorder', icd10: 'F10-F19', count: 14, color: '#F97316' },
];

export const DEMO_RISK_TRENDS = [
  { month: 'Sep', critical: 1, high: 3, medium: 5, low: 4 },
  { month: 'Oct', critical: 2, high: 4, medium: 6, low: 3 },
  { month: 'Nov', critical: 1, high: 5, medium: 4, low: 5 },
  { month: 'Dec', critical: 3, high: 3, medium: 7, low: 2 },
  { month: 'Jan', critical: 2, high: 4, medium: 5, low: 3 },
  { month: 'Feb', critical: 2, high: 5, medium: 8, low: 3 },
];

// Patient portal demo data
export const DEMO_MOOD_ENTRIES: DemoMoodEntry[] = Array.from({ length: 30 }, (_, i) => {
  const date = new Date();
  date.setDate(date.getDate() - (29 - i));
  const baseScore = 5 + Math.sin(i / 5) * 2;
  const score = Math.max(1, Math.min(10, Math.round(baseScore + (Math.random() - 0.5) * 2)));
  const notes = [
    'Feeling okay today', 'Had a good therapy session', 'Anxious about work',
    'Slept well last night', 'Difficult morning', 'Practiced mindfulness',
    'Spent time outdoors', 'Feeling isolated', 'Good conversation with friend',
    'Medication side effects', 'Productive day', 'Restless sleep',
  ][i % 12];
  return { date: date.toISOString().split('T')[0], score, notes };
});

export const DEMO_JOURNAL_ENTRIES: DemoJournalEntry[] = [
  { id: 'j1', date: new Date(Date.now() - 86400000).toISOString().split('T')[0], prompt: 'How are you feeling today?', content: 'I woke up feeling a bit anxious but after my morning walk, things improved. I practiced the breathing exercises Dr. Stanescu taught me and they helped.' },
  { id: 'j2', date: new Date(Date.now() - 2 * 86400000).toISOString().split('T')[0], prompt: 'What went well this week?', content: 'I managed to attend the group therapy session without canceling. I also cooked a proper meal for the first time in weeks. Small wins but they matter.' },
  { id: 'j3', date: new Date(Date.now() - 4 * 86400000).toISOString().split('T')[0], prompt: "What's been challenging?", content: 'Sleep has been difficult. I keep waking up at 3am with racing thoughts. The new medication dose change might be affecting me.' },
  { id: 'j4', date: new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0], prompt: 'What are you grateful for?', content: 'My sister called to check on me. It reminded me that people care. Also grateful for the sunny weather — it lifts my mood.' },
];

export const DEMO_SESSION_SUMMARIES: DemoSessionSummary[] = [
  {
    id: 's1', date: new Date(Date.now() - 2 * 86400000).toISOString().split('T')[0],
    therapist: 'Dr. Elena Stanescu',
    summary: 'Discussed progress with cognitive restructuring techniques. Patient reports reduced frequency of catastrophic thinking. Sleep quality remains a concern. Reviewed medication adherence — consistent this week.',
    actionPoints: ['Continue CBT homework: thought records daily', 'Practice sleep hygiene checklist', 'Reduce caffeine after 2pm', 'Schedule follow-up in 1 week'],
    moodBefore: 4, moodAfter: 6,
  },
  {
    id: 's2', date: new Date(Date.now() - 9 * 86400000).toISOString().split('T')[0],
    therapist: 'Dr. Elena Stanescu',
    summary: 'Patient reports increased anxiety related to upcoming work deadline. Used exposure hierarchy to address avoidance of team meetings. Practiced grounding exercises in session.',
    actionPoints: ['Attend at least 2 team meetings this week', 'Use 5-4-3-2-1 grounding when anxiety peaks', 'Journal about triggers after meetings', 'Call crisis line if suicidal thoughts return'],
    moodBefore: 3, moodAfter: 5,
  },
  {
    id: 's3', date: new Date(Date.now() - 16 * 86400000).toISOString().split('T')[0],
    therapist: 'Dr. Elena Stanescu',
    summary: 'Initial assessment session. Discussed presenting complaints: persistent low mood for 4+ months, difficulty concentrating, social withdrawal. PHQ-9 score: 16 (moderately severe). GAD-7 score: 12 (moderate).',
    actionPoints: ['Start Sertraline 50mg daily', 'Begin weekly CBT sessions', 'Complete mood tracking daily', 'Emergency plan reviewed and agreed'],
    moodBefore: 2, moodAfter: 4,
  },
];

export const JOURNAL_PROMPTS = [
  'How are you feeling today?',
  'What went well this week?',
  "What's been challenging?",
  'What are you grateful for?',
  'Describe a moment of peace you experienced recently.',
  'What would you like to tell your future self?',
  'What coping strategy helped you today?',
  'How did you take care of yourself today?',
];

// Demo accounts
export const DEMO_ACCOUNTS = {
  clinicians: [
    { email: 'dr.stanescu@mindcare.ai', password: 'demo123', name: 'Dr. Elena Stanescu', specialty: 'Psychiatry', role: 'clinician' as const },
    { email: 'dr.tudor@mindcare.ai', password: 'demo123', name: 'Dr. Alexandru Tudor', specialty: 'Clinical Psychology', role: 'clinician' as const },
    { email: 'dr.iliescu@mindcare.ai', password: 'demo123', name: 'Dr. Ioana Iliescu', specialty: 'Child & Adolescent Psychiatry', role: 'clinician' as const },
  ],
  patients: [
    { email: 'maria.popescu@email.com', password: 'patient123', name: 'Maria Popescu', patientId: 'p1', role: 'patient' as const },
    { email: 'ion.ionescu@email.com', password: 'patient123', name: 'Ion Ionescu', patientId: 'p2', role: 'patient' as const },
  ],
};

// MSE Template
export interface MSEFields {
  appearance: string;
  behavior: string;
  speech: string;
  mood: string;
  affect: string;
  thoughtProcess: string;
  thoughtContent: string;
  perception: string;
  cognition: string;
  insight: string;
  judgment: string;
}

export const DEMO_MSE: MSEFields = {
  appearance: 'Casually dressed, adequate hygiene, appears stated age. Mild psychomotor retardation noted.',
  behavior: 'Cooperative but guarded. Minimal eye contact. Fidgeting with hands throughout session.',
  speech: 'Soft in volume, slow rate, normal tone. Latency in responses (2-3 seconds).',
  mood: 'Patient reports mood as "empty" and rates it 3/10.',
  affect: 'Constricted range, congruent with reported mood. Tearful when discussing family relationships.',
  thoughtProcess: 'Linear and goal-directed. Mild circumstantiality when discussing stressors.',
  thoughtContent: 'Passive suicidal ideation without plan or intent. Denies homicidal ideation. Ruminative thoughts about worthlessness.',
  perception: 'Denies auditory or visual hallucinations. No illusions noted.',
  cognition: 'Alert and oriented x4. Attention mildly impaired (difficulty with serial 7s). Memory intact for recent and remote events.',
  insight: 'Fair — recognizes need for treatment but minimizes severity of symptoms.',
  judgment: 'Fair — making some poor decisions regarding medication adherence but engaging with treatment.',
};

// Detected psychiatric symptoms for demo
export interface DetectedSymptom {
  symptom: string;
  icd10: string;
  confidence: number;
  source: string; // quote from transcript
  category: 'mood' | 'anxiety' | 'psychotic' | 'cognitive' | 'behavioral' | 'somatic';
  confirmed: boolean;
}

export const DEMO_DETECTED_SYMPTOMS: DetectedSymptom[] = [
  { symptom: 'Depressed mood', icd10: 'F33.1', confidence: 0.95, source: '"I feel empty most of the time, like nothing matters"', category: 'mood', confirmed: false },
  { symptom: 'Anhedonia', icd10: 'F33.1', confidence: 0.88, source: '"I used to enjoy painting but now I can\'t even pick up a brush"', category: 'mood', confirmed: false },
  { symptom: 'Insomnia (initial)', icd10: 'G47.0', confidence: 0.92, source: '"It takes me 2-3 hours to fall asleep every night"', category: 'somatic', confirmed: false },
  { symptom: 'Psychomotor retardation', icd10: 'F33.1', confidence: 0.75, source: 'Observed: slow movements, delayed responses', category: 'behavioral', confirmed: false },
  { symptom: 'Worthlessness', icd10: 'F33.1', confidence: 0.90, source: '"I\'m a burden to everyone around me"', category: 'cognitive', confirmed: false },
  { symptom: 'Passive suicidal ideation', icd10: 'R45.851', confidence: 0.85, source: '"Sometimes I think everyone would be better off without me"', category: 'mood', confirmed: false },
  { symptom: 'Decreased concentration', icd10: 'R41.840', confidence: 0.82, source: '"I can\'t focus at work, I read the same email 5 times"', category: 'cognitive', confirmed: false },
  { symptom: 'Social withdrawal', icd10: 'F33.1', confidence: 0.78, source: '"I\'ve been avoiding my friends for weeks"', category: 'behavioral', confirmed: false },
  { symptom: 'Fatigue', icd10: 'R53.83', confidence: 0.88, source: '"Even after sleeping 10 hours I feel exhausted"', category: 'somatic', confirmed: false },
  { symptom: 'Appetite decrease', icd10: 'R63.0', confidence: 0.72, source: '"I forgot to eat yesterday, I just wasn\'t hungry"', category: 'somatic', confirmed: false },
];

export const DEMO_TRANSCRIPT = `Doctor: Good morning, how have you been since our last session?

Patient: Not great, honestly. I feel empty most of the time, like nothing matters.

Doctor: Can you tell me more about that emptiness? When does it feel strongest?

Patient: It's worst in the morning. I used to enjoy painting but now I can't even pick up a brush. I just lie in bed staring at the ceiling.

Doctor: How has your sleep been?

Patient: Terrible. It takes me 2-3 hours to fall asleep every night. Even after sleeping 10 hours I feel exhausted. My mind just races.

Doctor: What kind of thoughts run through your mind?

Patient: Mostly that I'm a burden to everyone around me. That I'm failing at everything. I can't focus at work, I read the same email 5 times and still don't know what it says.

Doctor: Have you been spending time with friends or family?

Patient: No, I've been avoiding my friends for weeks. I cancelled on my sister three times. I just don't have the energy.

Doctor: I want to ask you something important. Have you had any thoughts of harming yourself?

Patient: Sometimes I think everyone would be better off without me. But I wouldn't actually do anything. I don't have a plan or anything like that.

Doctor: Thank you for being honest with me. That takes courage. How about your appetite?

Patient: I forgot to eat yesterday, I just wasn't hungry. I've lost about 5 kilos in the last month.

Doctor: Let's discuss adjusting your treatment plan. I think we should consider increasing your medication dosage and adding more frequent sessions.`;
