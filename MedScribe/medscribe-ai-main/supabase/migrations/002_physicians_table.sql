-- ============================================================================
-- Physicians Table for Patient Booking System
-- ============================================================================

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

-- Enable RLS
ALTER TABLE public.physicians ENABLE ROW LEVEL SECURITY;

-- Allow public read access (patients can browse doctors)
CREATE POLICY "Allow public read" ON public.physicians
  FOR SELECT USING (true);

-- Allow service role full access (for admin/seeding)
CREATE POLICY "Allow service role all" ON public.physicians
  FOR ALL USING (true) WITH CHECK (true);

-- Index for common queries
CREATE INDEX IF NOT EXISTS idx_physicians_country ON public.physicians(country);
CREATE INDEX IF NOT EXISTS idx_physicians_specialty ON public.physicians(specialty);
CREATE INDEX IF NOT EXISTS idx_physicians_available ON public.physicians(available);

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
