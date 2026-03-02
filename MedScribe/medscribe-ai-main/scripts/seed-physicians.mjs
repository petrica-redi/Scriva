import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://oltonmgkzmfcmdbmyyuq.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9sdG9ubWdrem1mY21kYm15eXVxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTkzODQyNSwiZXhwIjoyMDg3NTE0NDI1fQ.xJpkD8urz4TsnzeakS--G8yYI0o69km29VFjmrSVuaM';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const CREATE_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS public.physicians (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  specialty text NOT NULL,
  country text NOT NULL,
  city text NOT NULL,
  language text[] NOT NULL DEFAULT '{}',
  email text,
  phone text,
  bio text,
  avatar_url text,
  consultation_types text[] DEFAULT '{in-person,teleconsultation}',
  price_consultation numeric DEFAULT 0,
  currency text DEFAULT 'EUR',
  available boolean DEFAULT true,
  rating numeric DEFAULT 4.5,
  reviews_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.physicians ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Allow public read" ON public.physicians FOR SELECT USING (true);
`;

const physicians = [
  // ROMANIA
  { name: 'Dr. Andrei Popescu', specialty: 'Psychiatry', country: 'RO', city: 'București', language: ['ro','en'], bio: 'Specialist in anxiety and depressive disorders with 15 years of clinical experience. Integrates CBT with pharmacotherapy.', price_consultation: 250, currency: 'RON', rating: 4.8, reviews_count: 312 },
  { name: 'Dr. Elena Dumitrescu', specialty: 'Psychiatry', country: 'RO', city: 'Cluj-Napoca', language: ['ro','en','fr'], bio: 'Expert in bipolar disorder and PTSD treatment. Published researcher in mood disorders.', price_consultation: 280, currency: 'RON', rating: 4.9, reviews_count: 245 },
  { name: 'Dr. Mihai Ionescu', specialty: 'Psychiatry', country: 'RO', city: 'Timișoara', language: ['ro','en','de'], bio: 'Child and adolescent psychiatrist specializing in ADHD and autism spectrum disorders.', price_consultation: 200, currency: 'RON', rating: 4.6, reviews_count: 178 },
  { name: 'Dr. Maria Stanescu', specialty: 'Psychiatry', country: 'RO', city: 'Iași', language: ['ro','en'], bio: 'Addiction psychiatry specialist with expertise in dual diagnosis treatment.', price_consultation: 180, currency: 'RON', rating: 4.5, reviews_count: 134 },
  { name: 'Dr. Alexandru Marinescu', specialty: 'General Practice', country: 'RO', city: 'București', language: ['ro','en'], bio: 'Family medicine physician providing comprehensive primary care for all ages.', price_consultation: 150, currency: 'RON', rating: 4.7, reviews_count: 420 },
  { name: 'Dr. Ioana Popa', specialty: 'General Practice', country: 'RO', city: 'Cluj-Napoca', language: ['ro','en','hu'], bio: 'Experienced GP focused on preventive medicine and chronic disease management.', price_consultation: 160, currency: 'RON', rating: 4.4, reviews_count: 356 },
  { name: 'Dr. Cristian Radu', specialty: 'General Practice', country: 'RO', city: 'Timișoara', language: ['ro','en','de'], bio: 'General practitioner with special interest in sports medicine and rehabilitation.', price_consultation: 150, currency: 'RON', rating: 4.3, reviews_count: 289 },
  { name: 'Dr. Adriana Moldovan', specialty: 'Neurology', country: 'RO', city: 'București', language: ['ro','en'], bio: 'Neurologist specializing in epilepsy and multiple sclerosis. University hospital consultant.', price_consultation: 300, currency: 'RON', rating: 4.8, reviews_count: 198 },
  { name: 'Dr. Vlad Gheorghe', specialty: 'Neurology', country: 'RO', city: 'Iași', language: ['ro','en','fr'], bio: 'Expert in neurodegenerative diseases and headache disorders.', price_consultation: 270, currency: 'RON', rating: 4.6, reviews_count: 156 },
  { name: 'Dr. Bogdan Tănase', specialty: 'Cardiology', country: 'RO', city: 'București', language: ['ro','en'], bio: 'Interventional cardiologist with expertise in coronary artery disease and heart failure.', price_consultation: 300, currency: 'RON', rating: 4.9, reviews_count: 267 },
  { name: 'Dr. Raluca Nistor', specialty: 'Cardiology', country: 'RO', city: 'Cluj-Napoca', language: ['ro','en'], bio: 'Cardiologist focused on arrhythmias and preventive cardiovascular medicine.', price_consultation: 280, currency: 'RON', rating: 4.7, reviews_count: 189 },
  { name: 'Dr. Simona Văcaru', specialty: 'Dermatology', country: 'RO', city: 'București', language: ['ro','en','fr'], bio: 'Dermatologist specializing in psoriasis, eczema, and cosmetic dermatology.', price_consultation: 250, currency: 'RON', rating: 4.5, reviews_count: 340 },
  { name: 'Dr. Dan Lazăr', specialty: 'Dermatology', country: 'RO', city: 'Timișoara', language: ['ro','en'], bio: 'Expert in skin cancer screening and dermatosurgery.', price_consultation: 220, currency: 'RON', rating: 4.6, reviews_count: 215 },
  { name: 'Dr. Gabriela Munteanu', specialty: 'Endocrinology', country: 'RO', city: 'București', language: ['ro','en'], bio: 'Endocrinologist specializing in diabetes management and thyroid disorders.', price_consultation: 280, currency: 'RON', rating: 4.7, reviews_count: 203 },
  // GERMANY
  { name: 'Dr. Thomas Müller', specialty: 'Psychiatry', country: 'DE', city: 'Berlin', language: ['de','en'], bio: 'Facharzt für Psychiatrie with focus on treatment-resistant depression and TMS therapy.', price_consultation: 180, currency: 'EUR', rating: 4.7, reviews_count: 289 },
  { name: 'Dr. Sabine Schneider', specialty: 'Psychiatry', country: 'DE', city: 'München', language: ['de','en','fr'], bio: 'Specialist in psychosomatic medicine and stress-related disorders.', price_consultation: 200, currency: 'EUR', rating: 4.8, reviews_count: 234 },
  { name: 'Dr. Klaus Weber', specialty: 'Psychiatry', country: 'DE', city: 'Hamburg', language: ['de','en'], bio: 'Forensic psychiatrist with additional expertise in personality disorders.', price_consultation: 160, currency: 'EUR', rating: 4.5, reviews_count: 167 },
  { name: 'Dr. Anna Fischer', specialty: 'General Practice', country: 'DE', city: 'Berlin', language: ['de','en','pl'], bio: 'Hausärztin offering holistic primary care including naturopathic treatments.', price_consultation: 80, currency: 'EUR', rating: 4.6, reviews_count: 456 },
  { name: 'Dr. Markus Hoffmann', specialty: 'General Practice', country: 'DE', city: 'Frankfurt', language: ['de','en'], bio: 'General practitioner specializing in travel medicine and vaccinations.', price_consultation: 90, currency: 'EUR', rating: 4.4, reviews_count: 378 },
  { name: 'Dr. Petra Becker', specialty: 'General Practice', country: 'DE', city: 'München', language: ['de','en','it'], bio: 'Family doctor with 20 years experience in chronic disease management.', price_consultation: 100, currency: 'EUR', rating: 4.7, reviews_count: 412 },
  { name: 'Dr. Stefan Richter', specialty: 'Neurology', country: 'DE', city: 'Berlin', language: ['de','en'], bio: 'Neurologist specializing in Parkinson\'s disease and movement disorders.', price_consultation: 180, currency: 'EUR', rating: 4.8, reviews_count: 201 },
  { name: 'Dr. Katharina Wolf', specialty: 'Neurology', country: 'DE', city: 'Hamburg', language: ['de','en','ru'], bio: 'Expert in stroke rehabilitation and cerebrovascular diseases.', price_consultation: 170, currency: 'EUR', rating: 4.6, reviews_count: 145 },
  { name: 'Dr. Friedrich Braun', specialty: 'Cardiology', country: 'DE', city: 'München', language: ['de','en'], bio: 'Interventional cardiologist at a leading university heart center.', price_consultation: 200, currency: 'EUR', rating: 4.9, reviews_count: 278 },
  { name: 'Dr. Monika Schröder', specialty: 'Cardiology', country: 'DE', city: 'Frankfurt', language: ['de','en','es'], bio: 'Preventive cardiologist focused on lipid management and hypertension.', price_consultation: 180, currency: 'EUR', rating: 4.5, reviews_count: 190 },
  { name: 'Dr. Hans Zimmermann', specialty: 'Orthopedics', country: 'DE', city: 'München', language: ['de','en'], bio: 'Orthopedic surgeon specializing in knee and hip replacement with minimally invasive techniques.', price_consultation: 190, currency: 'EUR', rating: 4.7, reviews_count: 321 },
  // UNITED KINGDOM
  { name: 'Dr. James Whitfield', specialty: 'Psychiatry', country: 'GB', city: 'London', language: ['en'], bio: 'Consultant psychiatrist specializing in OCD and anxiety disorders.', price_consultation: 200, currency: 'GBP', rating: 4.8, reviews_count: 267 },
  { name: 'Dr. Sarah Thompson', specialty: 'Psychiatry', country: 'GB', city: 'Manchester', language: ['en','fr'], bio: 'Specialist in perinatal psychiatry and women\'s mental health.', price_consultation: 180, currency: 'GBP', rating: 4.7, reviews_count: 198 },
  { name: 'Dr. Alistair Campbell', specialty: 'Psychiatry', country: 'GB', city: 'Edinburgh', language: ['en'], bio: 'Geriatric psychiatrist with expertise in dementia and late-life depression.', price_consultation: 170, currency: 'GBP', rating: 4.6, reviews_count: 156 },
  { name: 'Dr. Emily Clarke', specialty: 'General Practice', country: 'GB', city: 'London', language: ['en','es'], bio: 'GP partner with special interest in dermatology and minor surgery.', price_consultation: 80, currency: 'GBP', rating: 4.5, reviews_count: 489 },
  { name: 'Dr. David Williams', specialty: 'General Practice', country: 'GB', city: 'Birmingham', language: ['en','ur'], bio: 'Experienced family doctor providing comprehensive care for diverse communities.', price_consultation: 85, currency: 'GBP', rating: 4.4, reviews_count: 367 },
  { name: 'Dr. Fiona MacLeod', specialty: 'General Practice', country: 'GB', city: 'Edinburgh', language: ['en','gd'], bio: 'Rural GP with expertise in remote medicine and elderly care.', price_consultation: 80, currency: 'GBP', rating: 4.6, reviews_count: 298 },
  { name: 'Dr. Richard Patel', specialty: 'Neurology', country: 'GB', city: 'London', language: ['en','hi','gu'], bio: 'Consultant neurologist specializing in multiple sclerosis and neuroimmunology.', price_consultation: 200, currency: 'GBP', rating: 4.9, reviews_count: 213 },
  { name: 'Dr. Catherine Hughes', specialty: 'Neurology', country: 'GB', city: 'Manchester', language: ['en','cy'], bio: 'Expert in headache medicine and trigeminal neuralgia.', price_consultation: 180, currency: 'GBP', rating: 4.7, reviews_count: 176 },
  { name: 'Dr. Andrew Morrison', specialty: 'Cardiology', country: 'GB', city: 'London', language: ['en'], bio: 'Consultant cardiologist with expertise in cardiac imaging and structural heart disease.', price_consultation: 200, currency: 'GBP', rating: 4.8, reviews_count: 234 },
  { name: 'Dr. Priya Sharma', specialty: 'Pediatrics', country: 'GB', city: 'Birmingham', language: ['en','hi','pa'], bio: 'Pediatrician specializing in childhood allergies and respiratory conditions.', price_consultation: 150, currency: 'GBP', rating: 4.7, reviews_count: 345 },
  // UNITED STATES
  { name: 'Dr. Michael Reynolds', specialty: 'Psychiatry', country: 'US', city: 'New York', language: ['en','es'], bio: 'Board-certified psychiatrist specializing in psychopharmacology and treatment-resistant depression.', price_consultation: 400, currency: 'USD', rating: 4.8, reviews_count: 312 },
  { name: 'Dr. Jennifer Kim', specialty: 'Psychiatry', country: 'US', city: 'Los Angeles', language: ['en','ko'], bio: 'Integrative psychiatrist combining medication management with mindfulness-based approaches.', price_consultation: 350, currency: 'USD', rating: 4.7, reviews_count: 278 },
  { name: 'Dr. Robert Johnson', specialty: 'Psychiatry', country: 'US', city: 'Chicago', language: ['en'], bio: 'Addiction psychiatrist with dual board certification in psychiatry and addiction medicine.', price_consultation: 300, currency: 'USD', rating: 4.5, reviews_count: 198 },
  { name: 'Dr. Lisa Chen', specialty: 'General Practice', country: 'US', city: 'New York', language: ['en','zh'], bio: 'Internal medicine physician providing evidence-based primary care in Manhattan.', price_consultation: 200, currency: 'USD', rating: 4.6, reviews_count: 445 },
  { name: 'Dr. William Davis', specialty: 'General Practice', country: 'US', city: 'Houston', language: ['en','es'], bio: 'Family medicine doctor with focus on preventive health and wellness.', price_consultation: 180, currency: 'USD', rating: 4.4, reviews_count: 367 },
  { name: 'Dr. Amanda Foster', specialty: 'General Practice', country: 'US', city: 'Chicago', language: ['en'], bio: 'Primary care physician specializing in women\'s health and geriatric medicine.', price_consultation: 190, currency: 'USD', rating: 4.5, reviews_count: 312 },
  { name: 'Dr. David Goldstein', specialty: 'Neurology', country: 'US', city: 'New York', language: ['en','he'], bio: 'Neurologist at a major academic medical center specializing in epilepsy surgery evaluation.', price_consultation: 380, currency: 'USD', rating: 4.9, reviews_count: 234 },
  { name: 'Dr. Patricia Nguyen', specialty: 'Neurology', country: 'US', city: 'Los Angeles', language: ['en','vi'], bio: 'Specialist in neuromuscular disorders and ALS treatment.', price_consultation: 350, currency: 'USD', rating: 4.7, reviews_count: 189 },
  { name: 'Dr. Christopher Martinez', specialty: 'Cardiology', country: 'US', city: 'Houston', language: ['en','es'], bio: 'Interventional cardiologist at the Texas Medical Center performing complex coronary procedures.', price_consultation: 400, currency: 'USD', rating: 4.8, reviews_count: 298 },
  { name: 'Dr. Rachel Green', specialty: 'Cardiology', country: 'US', city: 'Chicago', language: ['en'], bio: 'Heart failure specialist and cardiac transplant cardiologist.', price_consultation: 380, currency: 'USD', rating: 4.6, reviews_count: 212 },
  { name: 'Dr. Samantha Brooks', specialty: 'Dermatology', country: 'US', city: 'Los Angeles', language: ['en'], bio: 'Board-certified dermatologist specializing in skin cancer and cosmetic procedures.', price_consultation: 300, currency: 'USD', rating: 4.7, reviews_count: 456 },
  // SPAIN
  { name: 'Dr. Carlos García López', specialty: 'Psychiatry', country: 'ES', city: 'Madrid', language: ['es','en'], bio: 'Psiquiatra especializado en trastornos de ansiedad y terapia cognitivo-conductual.', price_consultation: 120, currency: 'EUR', rating: 4.7, reviews_count: 234 },
  { name: 'Dr. Ana Martínez Ruiz', specialty: 'Psychiatry', country: 'ES', city: 'Barcelona', language: ['es','ca','en'], bio: 'Specialist in eating disorders and adolescent psychiatry.', price_consultation: 130, currency: 'EUR', rating: 4.6, reviews_count: 189 },
  { name: 'Dr. José Fernández Moreno', specialty: 'General Practice', country: 'ES', city: 'Valencia', language: ['es','en'], bio: 'Médico de familia con amplia experiencia en atención primaria y medicina preventiva.', price_consultation: 60, currency: 'EUR', rating: 4.5, reviews_count: 398 },
  { name: 'Dr. Laura Sánchez Díaz', specialty: 'General Practice', country: 'ES', city: 'Sevilla', language: ['es','en','pt'], bio: 'Family doctor with special interest in geriatric care and chronic conditions.', price_consultation: 70, currency: 'EUR', rating: 4.4, reviews_count: 312 },
  { name: 'Dr. Pablo Rodríguez Vega', specialty: 'Neurology', country: 'ES', city: 'Madrid', language: ['es','en'], bio: 'Neurologist at a national referral center for rare neurological diseases.', price_consultation: 140, currency: 'EUR', rating: 4.8, reviews_count: 167 },
  { name: 'Dr. Isabel Navarro Torres', specialty: 'Cardiology', country: 'ES', city: 'Barcelona', language: ['es','ca','en'], bio: 'Cardiologist specializing in cardiac electrophysiology and arrhythmia management.', price_consultation: 150, currency: 'EUR', rating: 4.7, reviews_count: 198 },
  { name: 'Dr. Miguel Ángel Romero', specialty: 'Pediatrics', country: 'ES', city: 'Madrid', language: ['es','en'], bio: 'Pediatrician focused on childhood development and vaccination programs.', price_consultation: 90, currency: 'EUR', rating: 4.6, reviews_count: 345 },
  // PORTUGAL
  { name: 'Dr. João Silva Pereira', specialty: 'Psychiatry', country: 'PT', city: 'Lisboa', language: ['pt','en','es'], bio: 'Psiquiatra com experiência em perturbações do humor e psicoterapia integrativa.', price_consultation: 100, currency: 'EUR', rating: 4.7, reviews_count: 198 },
  { name: 'Dr. Mariana Costa Santos', specialty: 'Psychiatry', country: 'PT', city: 'Porto', language: ['pt','en','fr'], bio: 'Specialist in trauma-focused therapy and EMDR.', price_consultation: 90, currency: 'EUR', rating: 4.6, reviews_count: 156 },
  { name: 'Dr. António Oliveira Ribeiro', specialty: 'General Practice', country: 'PT', city: 'Lisboa', language: ['pt','en'], bio: 'Médico de medicina geral e familiar com foco em cuidados preventivos.', price_consultation: 60, currency: 'EUR', rating: 4.5, reviews_count: 367 },
  { name: 'Dr. Sofia Ferreira Alves', specialty: 'General Practice', country: 'PT', city: 'Coimbra', language: ['pt','en','es'], bio: 'Family doctor with expertise in diabetes and metabolic syndrome.', price_consultation: 65, currency: 'EUR', rating: 4.4, reviews_count: 289 },
  { name: 'Dr. Pedro Mendes Carvalho', specialty: 'Neurology', country: 'PT', city: 'Lisboa', language: ['pt','en'], bio: 'Neurologist at Hospital de Santa Maria specializing in migraine and headache disorders.', price_consultation: 120, currency: 'EUR', rating: 4.8, reviews_count: 145 },
  { name: 'Dr. Catarina Rodrigues Lima', specialty: 'Cardiology', country: 'PT', city: 'Porto', language: ['pt','en','es'], bio: 'Cardiologist focused on echocardiography and valvular heart disease.', price_consultation: 130, currency: 'EUR', rating: 4.6, reviews_count: 178 },
  // FRANCE
  { name: 'Dr. Pierre Dubois', specialty: 'Psychiatry', country: 'FR', city: 'Paris', language: ['fr','en'], bio: 'Psychiatre spécialisé dans les troubles anxieux et la thérapie psychodynamique.', price_consultation: 150, currency: 'EUR', rating: 4.8, reviews_count: 267 },
  { name: 'Dr. Marie Laurent', specialty: 'Psychiatry', country: 'FR', city: 'Lyon', language: ['fr','en','it'], bio: 'Expert in child psychiatry and neurodevelopmental disorders.', price_consultation: 130, currency: 'EUR', rating: 4.7, reviews_count: 212 },
  { name: 'Dr. Antoine Moreau', specialty: 'Psychiatry', country: 'FR', city: 'Marseille', language: ['fr','en','ar'], bio: 'Psychiatrist specializing in transcultural psychiatry and migration-related trauma.', price_consultation: 120, currency: 'EUR', rating: 4.5, reviews_count: 178 },
  { name: 'Dr. Isabelle Martin', specialty: 'General Practice', country: 'FR', city: 'Paris', language: ['fr','en'], bio: 'Médecin généraliste offrant des soins complets en médecine familiale.', price_consultation: 70, currency: 'EUR', rating: 4.6, reviews_count: 456 },
  { name: 'Dr. François Leroy', specialty: 'General Practice', country: 'FR', city: 'Toulouse', language: ['fr','en','es'], bio: 'General practitioner with focus on occupational health and ergonomics.', price_consultation: 60, currency: 'EUR', rating: 4.4, reviews_count: 334 },
  { name: 'Dr. Camille Bernard', specialty: 'General Practice', country: 'FR', city: 'Lyon', language: ['fr','en'], bio: 'Family doctor experienced in pediatric care and women\'s health.', price_consultation: 65, currency: 'EUR', rating: 4.5, reviews_count: 398 },
  { name: 'Dr. Nicolas Petit', specialty: 'Neurology', country: 'FR', city: 'Paris', language: ['fr','en'], bio: 'Neurologist at Pitié-Salpêtrière specializing in ALS and motor neuron diseases.', price_consultation: 150, currency: 'EUR', rating: 4.9, reviews_count: 189 },
  { name: 'Dr. Véronique Roux', specialty: 'Neurology', country: 'FR', city: 'Marseille', language: ['fr','en','ar'], bio: 'Expert in sleep disorders and narcolepsy treatment.', price_consultation: 130, currency: 'EUR', rating: 4.6, reviews_count: 156 },
  { name: 'Dr. Jean-Luc Girard', specialty: 'Cardiology', country: 'FR', city: 'Paris', language: ['fr','en'], bio: 'Cardiologue interventionnel au sein d\'un centre cardiaque de référence.', price_consultation: 150, currency: 'EUR', rating: 4.8, reviews_count: 234 },
  { name: 'Dr. Céline Dupont', specialty: 'Dermatology', country: 'FR', city: 'Lyon', language: ['fr','en'], bio: 'Dermatologue spécialisée en dermatologie esthétique et traitement du psoriasis.', price_consultation: 100, currency: 'EUR', rating: 4.7, reviews_count: 289 },
];

async function main() {
  // Step 1: Create table via SQL
  console.log('Creating physicians table...');
  const { error: sqlError } = await supabase.rpc('exec_sql', { sql: CREATE_TABLE_SQL });
  
  if (sqlError) {
    // Try checking if table exists already
    const { error: checkError } = await supabase.from('physicians').select('id').limit(1);
    if (checkError?.message?.includes('does not exist')) {
      console.error('Table does not exist. Please run this SQL in the Supabase dashboard:\n');
      console.error(CREATE_TABLE_SQL);
      process.exit(1);
    }
    console.log('Table already exists or exec_sql not available, continuing...');
  } else {
    console.log('Table created successfully.');
  }

  // Step 2: Clear existing data
  console.log('Clearing existing data...');
  await supabase.from('physicians').delete().neq('id', '00000000-0000-0000-0000-000000000000');

  // Step 3: Insert physicians
  console.log(`Inserting ${physicians.length} physicians...`);
  const { data, error } = await supabase.from('physicians').insert(physicians).select('id, name, country');
  
  if (error) {
    console.error('Insert error:', error.message);
    process.exit(1);
  }

  console.log(`✅ Successfully inserted ${data.length} physicians!`);
  
  const byCountry = {};
  data.forEach(p => { byCountry[p.country] = (byCountry[p.country] || 0) + 1; });
  console.log('By country:', JSON.stringify(byCountry));
}

main().catch(e => { console.error(e); process.exit(1); });
