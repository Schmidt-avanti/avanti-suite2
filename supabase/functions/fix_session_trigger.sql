
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

-- Drop the existing trigger and recreate it with the fixed function
DROP TRIGGER IF EXISTS on_auth_successful_login ON auth.sessions;

-- Create a new trigger that runs the handle_new_session function after successful authentication
CREATE TRIGGER on_auth_successful_login
  AFTER INSERT ON auth.sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_session();
