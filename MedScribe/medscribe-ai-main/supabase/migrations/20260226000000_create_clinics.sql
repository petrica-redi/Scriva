CREATE TABLE IF NOT EXISTS public.clinics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL DEFAULT 'clinic',
  specialty text[] NOT NULL DEFAULT '{General Practice}',
  country text NOT NULL,
  country_code text NOT NULL,
  city text NOT NULL,
  address text,
  phone text,
  email text,
  website text,
  description text,
  services text[] DEFAULT '{}',
  languages text[] DEFAULT '{}',
  consultation_types text[] DEFAULT '{in-person,teleconsultation}',
  rating numeric DEFAULT 4.5,
  reviews_count integer DEFAULT 0,
  logo_url text,
  available boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.clinics ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public read access' AND tablename = 'clinics') THEN
    CREATE POLICY "Allow public read access" ON public.clinics FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow service role full access' AND tablename = 'clinics') THEN
    CREATE POLICY "Allow service role full access" ON public.clinics FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;
