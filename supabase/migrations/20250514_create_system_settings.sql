
-- Create system_settings table for storing Twilio and other configuration
CREATE TABLE IF NOT EXISTS public.system_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT NOT NULL UNIQUE,
    value TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    description TEXT
);

-- Add RLS policies
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Only admins can read system settings
CREATE POLICY "Admins can read system settings" ON public.system_settings
    FOR SELECT USING (auth.role() = 'authenticated' AND EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    ));

-- Only admins can insert system settings
CREATE POLICY "Admins can insert system settings" ON public.system_settings
    FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    ));

-- Only admins can update system settings
CREATE POLICY "Admins can update system settings" ON public.system_settings
    FOR UPDATE USING (auth.role() = 'authenticated' AND EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    ));

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS system_settings_key_idx ON public.system_settings (key);

-- Add comment
COMMENT ON TABLE public.system_settings IS 'Stores system-wide settings including API keys and configuration values';

-- Insert initial Twilio config entries (without values)
INSERT INTO public.system_settings (key, description)
VALUES 
  ('TWILIO_ACCOUNT_SID', 'Twilio Account SID'),
  ('TWILIO_AUTH_TOKEN', 'Twilio Auth Token'),
  ('TWILIO_TWIML_APP_SID', 'Twilio TwiML App SID'),
  ('TWILIO_WORKSPACE_SID', 'Twilio TaskRouter Workspace SID'),
  ('TWILIO_WORKFLOW_SID', 'Twilio TaskRouter Workflow SID')
ON CONFLICT (key) DO NOTHING;
