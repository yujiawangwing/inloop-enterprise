GRANT SELECT, INSERT, UPDATE, DELETE ON public.tasks TO anon, authenticated;
GRANT ALL ON public.tasks TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.routines TO anon, authenticated;
GRANT ALL ON public.routines TO service_role;

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.routines ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'tasks' AND policyname = 'Debug allow public task reads'
  ) THEN
    CREATE POLICY "Debug allow public task reads"
    ON public.tasks
    FOR SELECT
    TO anon, authenticated
    USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'tasks' AND policyname = 'Debug allow public task creates'
  ) THEN
    CREATE POLICY "Debug allow public task creates"
    ON public.tasks
    FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'tasks' AND policyname = 'Debug allow public task edits'
  ) THEN
    CREATE POLICY "Debug allow public task edits"
    ON public.tasks
    FOR UPDATE
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'tasks' AND policyname = 'Debug allow public task deletes'
  ) THEN
    CREATE POLICY "Debug allow public task deletes"
    ON public.tasks
    FOR DELETE
    TO anon, authenticated
    USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'routines' AND policyname = 'Debug allow public routine reads'
  ) THEN
    CREATE POLICY "Debug allow public routine reads"
    ON public.routines
    FOR SELECT
    TO anon, authenticated
    USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'routines' AND policyname = 'Debug allow public routine creates'
  ) THEN
    CREATE POLICY "Debug allow public routine creates"
    ON public.routines
    FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'routines' AND policyname = 'Debug allow public routine edits'
  ) THEN
    CREATE POLICY "Debug allow public routine edits"
    ON public.routines
    FOR UPDATE
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'routines' AND policyname = 'Debug allow public routine deletes'
  ) THEN
    CREATE POLICY "Debug allow public routine deletes"
    ON public.routines
    FOR DELETE
    TO anon, authenticated
    USING (true);
  END IF;
END $$;