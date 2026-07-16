CREATE OR REPLACE FUNCTION public.add_connection_bidirectional(_other_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _me uuid := auth.uid();
BEGIN
  IF _me IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF _other_id IS NULL OR _other_id = _me THEN
    RAISE EXCEPTION 'Invalid target user';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = _other_id) THEN
    RAISE EXCEPTION 'Target user does not exist';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.user_connections
    WHERE user_id = _me AND connected_user_id = _other_id
  ) THEN
    RETURN 'already_exists';
  END IF;

  INSERT INTO public.user_connections (user_id, connected_user_id)
  VALUES (_me, _other_id)
  ON CONFLICT DO NOTHING;

  INSERT INTO public.user_connections (user_id, connected_user_id)
  VALUES (_other_id, _me)
  ON CONFLICT DO NOTHING;

  RETURN 'ok';
END;
$$;

GRANT EXECUTE ON FUNCTION public.add_connection_bidirectional(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.remove_connection_bidirectional(_other_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _me uuid := auth.uid();
BEGIN
  IF _me IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  DELETE FROM public.user_connections
  WHERE (user_id = _me AND connected_user_id = _other_id)
     OR (user_id = _other_id AND connected_user_id = _me);
  RETURN 'ok';
END;
$$;

GRANT EXECUTE ON FUNCTION public.remove_connection_bidirectional(uuid) TO authenticated;