
-- Add new columns to the inbound_emails table for tracking email threads
ALTER TABLE inbound_emails
ADD COLUMN IF NOT EXISTS references text,
ADD COLUMN IF NOT EXISTS in_reply_to text,
ADD COLUMN IF NOT EXISTS message_id text;

-- Add message_id column to email_threads table if it doesn't exist yet
ALTER TABLE email_threads
ADD COLUMN IF NOT EXISTS message_id text;

-- Make sure we have the avanti_email generation function available
CREATE OR REPLACE FUNCTION public.generate_avanti_email(customer_name text)
 RETURNS text
 LANGUAGE plpgsql
 IMMUTABLE
AS $function$
DECLARE
  base_email TEXT;
BEGIN
  -- Convert to lowercase
  base_email := lower(customer_name);
  
  -- Replace spaces with hyphens
  base_email := regexp_replace(base_email, '\s+', '-', 'g');
  
  -- Remove special characters (keep only alphanumeric and hyphens)
  base_email := regexp_replace(base_email, '[^a-z0-9\-]', '', 'g');
  
  -- Append domain
  base_email := base_email || '@inbox.avanti.cx';
  
  RETURN base_email;
END;
$function$;

-- Update the match_email_to_customer function to prioritize avanti_email
CREATE OR REPLACE FUNCTION public.match_email_to_customer(email_address text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  matched_customer_id UUID;
BEGIN
  -- First try to match against avanti_email (highest priority)
  SELECT id INTO matched_customer_id
  FROM customers
  WHERE avanti_email = email_address
  LIMIT 1;
  
  -- If no match found, try to match against customer email directly
  IF matched_customer_id IS NULL THEN
    SELECT id INTO matched_customer_id
    FROM customers
    WHERE email = email_address
    LIMIT 1;
  END IF;

  -- If still no direct match, try to match against contact persons
  IF matched_customer_id IS NULL THEN
    SELECT customer_id INTO matched_customer_id
    FROM customer_contacts
    WHERE email = email_address
    LIMIT 1;
  END IF;

  RETURN matched_customer_id;
END;
$function$;
