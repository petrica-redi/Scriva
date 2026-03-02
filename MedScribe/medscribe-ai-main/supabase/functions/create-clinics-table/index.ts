import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

serve(async (req) => {
  try {
    const dbUrl = Deno.env.get('SUPABASE_DB_URL')!
    
    const { Client } = await import("https://deno.land/x/postgres@v0.17.0/mod.ts")
    const client = new Client(dbUrl)
    await client.connect()
    
    await client.queryArray(`
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
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'clinics' AND policyname = 'Allow public read') THEN
          CREATE POLICY "Allow public read" ON public.clinics FOR SELECT USING (true);
        END IF;
      END $$;
      
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'clinics' AND policyname = 'Allow service role all') THEN
          CREATE POLICY "Allow service role all" ON public.clinics FOR ALL USING (true) WITH CHECK (true);
        END IF;
      END $$;
      
      NOTIFY pgrst, 'reload schema';
    `)
    
    await client.end()
    
    return new Response(JSON.stringify({ success: true, message: 'Clinics table created' }), {
      headers: { "Content-Type": "application/json" },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }
})
