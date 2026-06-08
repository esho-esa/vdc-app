-- Create payments table
CREATE TABLE IF NOT EXISTS public.payments (
  id TEXT PRIMARY KEY,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  payment_date DATE NOT NULL,
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  payment_method TEXT NOT NULL CHECK (payment_method IN ('Cash', 'UPI', 'Credit Card', 'Debit Card', 'Bank Transfer', 'Cheque')),
  reference_number TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for faster queries on patient_id
CREATE INDEX IF NOT EXISTS payments_patient_id_idx ON public.payments (patient_id);
