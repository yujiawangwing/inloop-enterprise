
-- Notifications table for collaboration feedback loop
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  receiver_id UUID NOT NULL,
  sender_id UUID NOT NULL,
  title TEXT NOT NULL,
  content TEXT,
  task_id UUID,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Receiver can read their own notifications
CREATE POLICY "Receivers can read their notifications"
  ON public.notifications FOR SELECT TO authenticated
  USING (auth.uid() = receiver_id);

-- Any authenticated user can insert as sender (must be self)
CREATE POLICY "Authenticated users can send notifications"
  ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = sender_id);

-- Receiver can update (mark read) or delete their notifications
CREATE POLICY "Receivers can update their notifications"
  ON public.notifications FOR UPDATE TO authenticated
  USING (auth.uid() = receiver_id) WITH CHECK (auth.uid() = receiver_id);

CREATE POLICY "Receivers can delete their notifications"
  ON public.notifications FOR DELETE TO authenticated
  USING (auth.uid() = receiver_id);

CREATE INDEX notifications_receiver_created_idx
  ON public.notifications (receiver_id, created_at DESC);
