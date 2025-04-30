
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
