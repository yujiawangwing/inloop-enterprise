ALTER TABLE public.routines
  ADD COLUMN IF NOT EXISTS recurrence_type text NOT NULL DEFAULT 'daily',
  ADD COLUMN IF NOT EXISTS recurrence_days integer[] NOT NULL DEFAULT ARRAY[1,2,3,4,5,6,7]::integer[];