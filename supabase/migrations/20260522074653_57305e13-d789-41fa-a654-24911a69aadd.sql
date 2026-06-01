
-- Enum for task type
DO $$ BEGIN
  CREATE TYPE public.task_type AS ENUM ('temporary', 'routine', 'milestone');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Routines library
CREATE TABLE public.routines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  time text NOT NULL,
  title text NOT NULL,
  note text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Tasks
CREATE TABLE public.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type public.task_type NOT NULL DEFAULT 'temporary',
  time text NOT NULL,
  title text NOT NULL,
  note text,
  link text,
  execution_date date,
  is_completed boolean NOT NULL DEFAULT false,
  routine_id uuid REFERENCES public.routines(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (routine_id, execution_date)
);

CREATE INDEX idx_tasks_exec_date ON public.tasks(execution_date);
CREATE INDEX idx_tasks_type ON public.tasks(type);

-- RLS: shared family board (no auth in prototype)
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.routines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view tasks" ON public.tasks FOR SELECT USING (true);
CREATE POLICY "Anyone can insert tasks" ON public.tasks FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update tasks" ON public.tasks FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete tasks" ON public.tasks FOR DELETE USING (true);

CREATE POLICY "Anyone can view routines" ON public.routines FOR SELECT USING (true);
CREATE POLICY "Anyone can insert routines" ON public.routines FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update routines" ON public.routines FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete routines" ON public.routines FOR DELETE USING (true);

-- Realtime
ALTER TABLE public.tasks REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;

-- Seed routine library
INSERT INTO public.routines (time, title, note) VALUES
  ('08:30', 'Vitamin D drops', '1 drop, after breakfast'),
  ('12:30', 'Midday nap', 'Curtains drawn, white noise'),
  ('18:00', 'Family dinner', 'No screens at the table'),
  ('20:30', 'Brush teeth', 'Soft brush, fluoride-free paste'),
  ('21:00', 'Bedtime story', '1 book, lights dim');
