
-- Function to generate a standardized email address for a customer
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

-- Check for missing avanti_emails and fill them in
UPDATE customers
SET avanti_email = public.generate_avanti_email(name)
WHERE avanti_email IS NULL;
