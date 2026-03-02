import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

serve(async (req) => {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    // Connect directly to postgres
    // Edge functions have access to the database connection string
    const dbUrl = Deno.env.get('SUPABASE_DB_URL')!
    
    const { Client } = await import("https://deno.land/x/postgres@v0.17.0/mod.ts")
    const client = new Client(dbUrl)
    await client.connect()
    
    await client.queryArray(`
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
      
      NOTIFY pgrst, 'reload schema';
    `)
    
    await client.end()
    
    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json" },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }
})
