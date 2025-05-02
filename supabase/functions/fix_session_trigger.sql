
-- Fix the handle_new_session function to just return NEW without any session tracking
CREATE OR REPLACE FUNCTION public.handle_new_session()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Simply return NEW without attempting to track sessions
  RETURN NEW;
END;
$$;
