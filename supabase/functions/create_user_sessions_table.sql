
-- Create a table to track user sessions
CREATE TABLE IF NOT EXISTS public.user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  last_seen TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Make sure RLS is enabled
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to manage their own session
CREATE POLICY "Users can manage their own session"
  ON public.user_sessions
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create policy to allow admin and supervisor to read all sessions
CREATE POLICY "Admins and supervisors can read sessions"
  ON public.user_sessions
  FOR SELECT
  USING (EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND (profiles.role = 'admin' OR profiles.role = 'supervisor')
  ));

-- Function to update user_sessions on login
CREATE OR REPLACE FUNCTION public.handle_new_session()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN NEW;
END;
$$;

-- Trigger that runs the handle_new_session function after successful authentication
DROP TRIGGER IF EXISTS on_auth_successful_login ON auth.sessions;
CREATE TRIGGER on_auth_successful_login
  AFTER INSERT ON auth.sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_session();

-- Function to schedule session refreshes
CREATE OR REPLACE FUNCTION public.refresh_session()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN;
END;
$$;
