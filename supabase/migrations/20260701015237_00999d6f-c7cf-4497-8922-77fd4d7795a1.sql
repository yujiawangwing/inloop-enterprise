
CREATE TABLE public.user_connections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  connected_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, connected_user_id),
  CHECK (user_id <> connected_user_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_connections TO authenticated;
GRANT ALL ON public.user_connections TO service_role;

ALTER TABLE public.user_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own connections"
  ON public.user_connections FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users add own connections"
  ON public.user_connections FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own connections"
  ON public.user_connections FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Look up a user by email or phone (security definer to reach auth.users).
CREATE OR REPLACE FUNCTION public.find_user_by_contact(contact TEXT)
RETURNS TABLE (id UUID, display_name TEXT, avatar_url TEXT)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  normalized TEXT := lower(trim(contact));
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF normalized IS NULL OR length(normalized) < 3 THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT p.id, p.display_name, p.avatar_url
  FROM auth.users u
  JOIN public.profiles p ON p.id = u.id
  WHERE (lower(u.email) = normalized OR u.phone = regexp_replace(contact, '\s+', '', 'g'))
    AND u.id <> auth.uid()
  LIMIT 5;
END;
$$;

REVOKE ALL ON FUNCTION public.find_user_by_contact(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.find_user_by_contact(TEXT) TO authenticated;
