
-- Update the refresh_session function to be consistent with our handle_new_session fix
CREATE OR REPLACE FUNCTION public.refresh_session()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_id_var UUID;
BEGIN
  -- Get the current user ID safely
  user_id_var := auth.uid();
  
  -- Only proceed if we have a valid user ID
  IF user_id_var IS NOT NULL THEN
    INSERT INTO public.user_sessions(user_id, last_seen)
    VALUES (user_id_var, now())
    ON CONFLICT (user_id)
    DO UPDATE SET last_seen = now();
  END IF;
  
  -- Add proper error handling
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error in refresh_session: %', SQLERRM;
END;
$$;
