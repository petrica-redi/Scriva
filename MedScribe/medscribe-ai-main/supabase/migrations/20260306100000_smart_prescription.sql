-- ============================================================================
-- Smart Prescription: medications, protocols (diagnosis → med, list A/B/C),
-- dose equivalences, treatment pathway (Maudsley-style)
-- ============================================================================

-- Medications (reference list: can be extended with CNAS list for Romania)
CREATE TABLE IF NOT EXISTS public.medications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  name_normalized text GENERATED ALWAYS AS (lower(trim(name))) STORED,
  brand_names text[] DEFAULT '{}',
  atc_code text,
  list_type text CHECK (list_type IN ('A', 'B', 'C')),
  compensated boolean,
  source text DEFAULT 'internal' CHECK (source IN ('cnas', 'maudsley', 'canmat', 'internal', 'global')),
  region text DEFAULT 'global',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_medications_name_region ON public.medications(name_normalized, region);
CREATE INDEX IF NOT EXISTS idx_medications_atc ON public.medications(atc_code);
CREATE INDEX IF NOT EXISTS idx_medications_list_type ON public.medications(list_type);

-- Protocol: which medication for which diagnosis, which line, list A/B/C, compensated
CREATE TABLE IF NOT EXISTS public.medication_protocols (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  diagnosis_icd10 text NOT NULL,
  diagnosis_name text,
  medication_id uuid NOT NULL REFERENCES public.medications(id) ON DELETE CASCADE,
  line integer NOT NULL CHECK (line >= 1),
  list_type text CHECK (list_type IN ('A', 'B', 'C')),
  compensated boolean,
  source text NOT NULL DEFAULT 'maudsley' CHECK (source IN ('maudsley', 'canmat', 'cnas', 'nice', 'internal')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_medication_protocols_diagnosis ON public.medication_protocols(diagnosis_icd10);
CREATE INDEX IF NOT EXISTS idx_medication_protocols_medication ON public.medication_protocols(medication_id);
CREATE INDEX IF NOT EXISTS idx_medication_protocols_line ON public.medication_protocols(diagnosis_icd10, line);

-- Dose equivalence: when switching from one drug to another (e.g. SSRI to SSRI)
CREATE TABLE IF NOT EXISTS public.dose_equivalences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_medication_id uuid NOT NULL REFERENCES public.medications(id) ON DELETE CASCADE,
  to_medication_id uuid NOT NULL REFERENCES public.medications(id) ON DELETE CASCADE,
  from_value numeric NOT NULL,
  from_unit text NOT NULL DEFAULT 'mg',
  to_value numeric NOT NULL,
  to_unit text NOT NULL DEFAULT 'mg',
  notes text,
  source text DEFAULT 'internal',
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (from_medication_id != to_medication_id)
);

CREATE INDEX IF NOT EXISTS idx_dose_equivalences_from ON public.dose_equivalences(from_medication_id);
CREATE INDEX IF NOT EXISTS idx_dose_equivalences_to ON public.dose_equivalences(to_medication_id);

-- RLS
ALTER TABLE public.medications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medication_protocols ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dose_equivalences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "medications_read" ON public.medications FOR SELECT TO authenticated USING (true);
CREATE POLICY "medication_protocols_read" ON public.medication_protocols FOR SELECT TO authenticated USING (true);
CREATE POLICY "dose_equivalences_read" ON public.dose_equivalences FOR SELECT TO authenticated USING (true);

-- Seed: common psychiatric medications (placeholder; CNAS/validated list to be added later)
INSERT INTO public.medications (name, atc_code, list_type, compensated, source, region) VALUES
  ('Sertraline', 'N06AB06', 'A', true, 'internal', 'global'),
  ('Escitalopram', 'N06AB10', 'A', true, 'internal', 'global'),
  ('Fluoxetine', 'N06AB03', 'A', true, 'internal', 'global'),
  ('Venlafaxine', 'N06AX16', 'A', true, 'internal', 'global'),
  ('Duloxetine', 'N06AX21', 'A', true, 'internal', 'global'),
  ('Paroxetine', 'N06AB05', 'A', true, 'internal', 'global'),
  ('Citalopram', 'N06AB04', 'A', true, 'internal', 'global'),
  ('Mirtazapine', 'N06AX11', 'A', true, 'internal', 'global'),
  ('Bupropion', 'N06AX12', 'B', true, 'internal', 'global'),
  ('Quetiapine', 'N05AH04', 'A', true, 'internal', 'global'),
  ('Aripiprazole', 'N05AX12', 'A', true, 'internal', 'global'),
  ('Risperidone', 'N05AX08', 'A', true, 'internal', 'global'),
  ('Olanzapine', 'N05AH03', 'A', true, 'internal', 'global'),
  ('Lithium', 'N05AN01', 'A', true, 'internal', 'global'),
  ('Valproate', 'N05AN01', 'A', true, 'internal', 'global'),
  ('Lamotrigine', 'N03AX09', 'A', true, 'internal', 'global'),
  ('Clonazepam', 'N03AE01', 'A', true, 'internal', 'global'),
  ('Alprazolam', 'N05BA12', 'A', true, 'internal', 'global'),
  ('Diazepam', 'N05BA01', 'A', true, 'internal', 'global'),
  ('Lorazepam', 'N05BA06', 'A', true, 'internal', 'global')
ON CONFLICT (name_normalized, region) DO NOTHING;

-- Dose equivalences (SSRI/SNRI examples – to be validated by pharmacologist/psychiatrist)
WITH meds AS (
  SELECT id, name FROM public.medications
)
INSERT INTO public.dose_equivalences (from_medication_id, to_medication_id, from_value, from_unit, to_value, to_unit, notes, source)
SELECT a.id, b.id, 100, 'mg', 10, 'mg', 'Sertraline 100mg ≈ Escitalopram 10mg', 'maudsley'
FROM meds a, meds b WHERE a.name = 'Sertraline' AND b.name = 'Escitalopram'
UNION ALL
SELECT a.id, b.id, 50, 'mg', 10, 'mg', 'Sertraline 50mg ≈ Escitalopram 5-10mg', 'maudsley'
FROM meds a, meds b WHERE a.name = 'Sertraline' AND b.name = 'Escitalopram'
UNION ALL
SELECT a.id, b.id, 20, 'mg', 50, 'mg', 'Escitalopram 20mg ≈ Sertraline 100mg', 'maudsley'
FROM meds a, meds b WHERE a.name = 'Escitalopram' AND b.name = 'Sertraline'
UNION ALL
SELECT a.id, b.id, 20, 'mg', 20, 'mg', 'Fluoxetine 20mg ≈ Paroxetine 20mg', 'maudsley'
FROM meds a, meds b WHERE a.name = 'Fluoxetine' AND b.name = 'Paroxetine'
UNION ALL
SELECT a.id, b.id, 150, 'mg', 75, 'mg', 'Venlafaxine 150mg ≈ Duloxetine 60-75mg', 'maudsley'
FROM meds a, meds b WHERE a.name = 'Venlafaxine' AND b.name = 'Duloxetine'
UNION ALL
SELECT a.id, b.id, 10, 'mg', 1, 'mg', 'Diazepam 10mg ≈ Lorazepam 1-2mg (approx 0.5-1mg per 5mg diazepam)', 'internal'
FROM meds a, meds b WHERE a.name = 'Diazepam' AND b.name = 'Lorazepam';

-- Protocol: Maudsley-style first/second line for common diagnoses (placeholder structure)
WITH meds AS (SELECT id, name FROM public.medications)
INSERT INTO public.medication_protocols (diagnosis_icd10, diagnosis_name, medication_id, line, list_type, compensated, source, notes)
SELECT 'F32.1', 'Major depressive episode, moderate', m.id, 1, 'A', true, 'maudsley', 'First-line SSRI'
FROM meds m WHERE m.name = 'Sertraline'
UNION ALL SELECT 'F32.1', 'Major depressive episode, moderate', m.id, 1, 'A', true, 'maudsley', 'First-line SSRI'
FROM meds m WHERE m.name = 'Escitalopram'
UNION ALL SELECT 'F32.1', 'Major depressive episode, moderate', m.id, 2, 'A', true, 'maudsley', 'Second-line if inadequate response'
FROM meds m WHERE m.name = 'Venlafaxine'
UNION ALL SELECT 'F32.1', 'Major depressive episode, moderate', m.id, 2, 'A', true, 'maudsley', 'Second-line'
FROM meds m WHERE m.name = 'Duloxetine'
UNION ALL SELECT 'F41.1', 'Generalised anxiety disorder', m.id, 1, 'A', true, 'maudsley', 'First-line'
FROM meds m WHERE m.name = 'Sertraline'
UNION ALL SELECT 'F41.1', 'Generalised anxiety disorder', m.id, 1, 'A', true, 'maudsley', 'First-line'
FROM meds m WHERE m.name = 'Escitalopram'
UNION ALL SELECT 'F41.1', 'Generalised anxiety disorder', m.id, 2, 'A', true, 'maudsley', 'Second-line'
FROM meds m WHERE m.name = 'Venlafaxine';
