
CREATE OR REPLACE FUNCTION public.get_active_sessions()
RETURNS TABLE(user_id uuid, last_seen timestamp with time zone)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT us.user_id, us.last_seen
  FROM public.user_sessions us
  WHERE us.last_seen >= (now() - interval '15 minutes');
END;
$$;
