-- Create patient_photos table
CREATE TABLE IF NOT EXISTS public.patient_photos (
  id TEXT PRIMARY KEY,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  treatment_id TEXT REFERENCES public.treatments(id) ON DELETE SET NULL,
  file_url TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('Before', 'During', 'After')),
  notes TEXT,
  uploaded_by TEXT NOT NULL,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create patient_xrays table
CREATE TABLE IF NOT EXISTS public.patient_xrays (
  id TEXT PRIMARY KEY,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  treatment_id TEXT REFERENCES public.treatments(id) ON DELETE SET NULL,
  file_url TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  notes TEXT,
  uploaded_by TEXT NOT NULL,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create patient_files table
CREATE TABLE IF NOT EXISTS public.patient_files (
  id TEXT PRIMARY KEY,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  treatment_id TEXT REFERENCES public.treatments(id) ON DELETE SET NULL,
  file_url TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('Scan', 'Report', 'Other')),
  notes TEXT,
  uploaded_by TEXT NOT NULL,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS patient_photos_patient_id_idx ON public.patient_photos(patient_id);
CREATE INDEX IF NOT EXISTS patient_photos_treatment_id_idx ON public.patient_photos(treatment_id);

CREATE INDEX IF NOT EXISTS patient_xrays_patient_id_idx ON public.patient_xrays(patient_id);
CREATE INDEX IF NOT EXISTS patient_xrays_treatment_id_idx ON public.patient_xrays(treatment_id);

CREATE INDEX IF NOT EXISTS patient_files_patient_id_idx ON public.patient_files(patient_id);
CREATE INDEX IF NOT EXISTS patient_files_treatment_id_idx ON public.patient_files(treatment_id);
