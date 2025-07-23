
-- Populate Twilio credentials from environment variables into system_settings table
-- This is a one-time migration to set up the initial Twilio configuration

-- Update TWILIO_ACCOUNT_SID if it exists, otherwise insert it
INSERT INTO public.system_settings (key, value, description)
VALUES ('TWILIO_ACCOUNT_SID', current_setting('app.settings.TWILIO_ACCOUNT_SID', true)::text, 'Twilio Account SID')
ON CONFLICT (key) 
DO UPDATE SET value = current_setting('app.settings.TWILIO_ACCOUNT_SID', true)::text;

-- Update TWILIO_AUTH_TOKEN if it exists, otherwise insert it
INSERT INTO public.system_settings (key, value, description)
VALUES ('TWILIO_AUTH_TOKEN', current_setting('app.settings.TWILIO_AUTH_TOKEN', true)::text, 'Twilio Auth Token')
ON CONFLICT (key) 
DO UPDATE SET value = current_setting('app.settings.TWILIO_AUTH_TOKEN', true)::text;

-- Update TWILIO_TWIML_APP_SID if it exists, otherwise insert it
INSERT INTO public.system_settings (key, value, description)
VALUES ('TWILIO_TWIML_APP_SID', current_setting('app.settings.TWILIO_TWIML_APP_SID', true)::text, 'Twilio TwiML App SID')
ON CONFLICT (key) 
DO UPDATE SET value = current_setting('app.settings.TWILIO_TWIML_APP_SID', true)::text;

-- The WORKSPACE_SID and WORKFLOW_SID will be populated by the workspace setup function
