
-- Create a function to safely access system_settings
-- This adds an abstraction layer between the frontend and the actual table
CREATE OR REPLACE FUNCTION public.get_system_settings()
RETURNS TABLE (
  key TEXT,
  value TEXT,
  description TEXT
) SECURITY DEFINER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Check if the user has permission to read system settings
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Permission denied: only admins can read system settings';
  END IF;
  
  RETURN QUERY
  SELECT 
    system_settings.key,
    system_settings.value,
    system_settings.description
  FROM 
    public.system_settings;
END;
$$;

-- Add comment
COMMENT ON FUNCTION public.get_system_settings IS 'Securely access system settings (admin only)';
