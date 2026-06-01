
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS creator_id uuid,
  ADD COLUMN IF NOT EXISTS owner_id uuid,
  ADD COLUMN IF NOT EXISTS flow_status text NOT NULL DEFAULT 'accepted';

ALTER TABLE public.routines
  ADD COLUMN IF NOT EXISTS creator_id uuid,
  ADD COLUMN IF NOT EXISTS owner_id uuid,
  ADD COLUMN IF NOT EXISTS flow_status text NOT NULL DEFAULT 'accepted';

ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_flow_status_check;
ALTER TABLE public.tasks
  ADD CONSTRAINT tasks_flow_status_check
  CHECK (flow_status IN ('pending','accepted','closed'));

ALTER TABLE public.routines DROP CONSTRAINT IF EXISTS routines_flow_status_check;
ALTER TABLE public.routines
  ADD CONSTRAINT routines_flow_status_check
  CHECK (flow_status IN ('pending','accepted','closed'));

CREATE INDEX IF NOT EXISTS idx_tasks_owner_id ON public.tasks(owner_id);
CREATE INDEX IF NOT EXISTS idx_tasks_creator_id ON public.tasks(creator_id);
CREATE INDEX IF NOT EXISTS idx_tasks_flow_status ON public.tasks(flow_status);
