-- ============================================================================
-- Add practice country to clinician profile (țara în care practică)
-- ============================================================================

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS practice_country text;

COMMENT ON COLUMN public.users.practice_country IS 'Country where the clinician practices (e.g. Romania, United Kingdom).';

-- Update trigger to set practice_country from signup metadata when present
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, full_name, specialty, practice_country)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.raw_user_meta_data->>'specialty',
    NEW.raw_user_meta_data->>'practice_country'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
