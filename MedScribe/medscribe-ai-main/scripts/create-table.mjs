import pg from 'pg';
const { Client } = pg;

const client = new Client({
  host: 'aws-0-eu-central-1.pooler.supabase.com',
  port: 6543,
  database: 'postgres',
  user: 'postgres.oltonmgkzmfcmdbmyyuq',
  password: process.argv[2] || '',
  ssl: { rejectUnauthorized: false },
});

const SQL = `
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

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'physicians' AND policyname = 'Allow public read') THEN
    CREATE POLICY "Allow public read" ON public.physicians FOR SELECT USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'physicians' AND policyname = 'Allow service role all') THEN
    CREATE POLICY "Allow service role all" ON public.physicians FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;
`;

async function main() {
  await client.connect();
  console.log('Connected to database');
  await client.query(SQL);
  console.log('Table created successfully');
  
  // Notify PostgREST to reload schema cache
  await client.query('NOTIFY pgrst, \'reload schema\'');
  console.log('Schema cache reload notified');
  
  await client.end();
}

main().catch(e => { console.error(e.message); process.exit(1); });
