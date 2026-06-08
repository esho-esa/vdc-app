-- Create follow_ups table
CREATE TABLE IF NOT EXISTS public.follow_ups (
  id TEXT PRIMARY KEY,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  treatment_id TEXT REFERENCES public.treatments(id) ON DELETE SET NULL,
  followup_date DATE NOT NULL,
  followup_type TEXT NOT NULL,
  notes TEXT,
  status TEXT NOT NULL CHECK (status IN ('Scheduled', 'Completed', 'Missed', 'Cancelled')) DEFAULT 'Scheduled',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create reminder_logs table
CREATE TABLE IF NOT EXISTS public.reminder_logs (
  id TEXT PRIMARY KEY,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  followup_id TEXT REFERENCES public.follow_ups(id) ON DELETE CASCADE,
  appointment_id TEXT REFERENCES public.appointments(id) ON DELETE CASCADE,
  reminder_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reminder_type TEXT NOT NULL CHECK (reminder_type IN ('1 Day Before', 'Same Day', 'Overdue')),
  channel TEXT NOT NULL CHECK (channel IN ('WhatsApp', 'SMS', 'Email')),
  status TEXT NOT NULL CHECK (status IN ('Sent', 'Failed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS follow_ups_patient_id_idx ON public.follow_ups(patient_id);
CREATE INDEX IF NOT EXISTS follow_ups_treatment_id_idx ON public.follow_ups(treatment_id);
CREATE INDEX IF NOT EXISTS follow_ups_date_idx ON public.follow_ups(followup_date);
CREATE INDEX IF NOT EXISTS follow_ups_status_idx ON public.follow_ups(status);

CREATE INDEX IF NOT EXISTS reminder_logs_patient_id_idx ON public.reminder_logs(patient_id);
CREATE INDEX IF NOT EXISTS reminder_logs_followup_id_idx ON public.reminder_logs(followup_id);
CREATE INDEX IF NOT EXISTS reminder_logs_appointment_id_idx ON public.reminder_logs(appointment_id);
