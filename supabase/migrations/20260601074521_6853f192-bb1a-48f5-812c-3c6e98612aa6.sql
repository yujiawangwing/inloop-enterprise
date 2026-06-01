ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS feedback_tag text,
  ADD COLUMN IF NOT EXISTS comment text;