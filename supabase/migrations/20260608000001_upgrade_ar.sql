-- Add due_date column to patients table
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS due_date DATE;

-- Expand payment methods check constraint
ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_payment_method_check;
ALTER TABLE public.payments ADD CONSTRAINT payments_payment_method_check CHECK (
  payment_method IN ('Cash', 'UPI', 'Credit Card', 'Debit Card', 'Bank Transfer', 'Cheque', 'Insurance', 'Other')
);
