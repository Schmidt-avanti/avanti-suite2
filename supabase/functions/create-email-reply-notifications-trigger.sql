
-- Create a trigger function for email reply notifications
CREATE OR REPLACE FUNCTION public.create_notification_for_email_reply()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  customer_name TEXT;
  task_title TEXT;
  task_readable_id TEXT;
BEGIN
  -- Only proceed if the thread's direction is 'outbound' (meaning it's a reply)
  IF NEW.direction = 'outbound' THEN
    -- Get the customer name and task details
    SELECT 
      c.name, 
      t.title,
      t.readable_id
    INTO 
      customer_name,
      task_title,
      task_readable_id
    FROM tasks t
    JOIN customers c ON t.customer_id = c.id
    WHERE t.id = NEW.task_id;
    
    -- Create notifications for admins
    INSERT INTO notifications (user_id, message, task_id)
    SELECT 
      p.id, 
      'E-Mail-Antwort an ' || NEW.recipient || ' für Aufgabe ' || 
      COALESCE(task_readable_id, '') || ' wurde versandt.', 
      NEW.task_id
    FROM profiles p
    WHERE p.role = 'admin'
    AND p.is_active = true;
    
    -- Create notifications for agents assigned to this customer
    INSERT INTO notifications (user_id, message, task_id)
    SELECT 
      uca.user_id, 
      'E-Mail-Antwort an ' || NEW.recipient || ' für Aufgabe ' || 
      COALESCE(task_readable_id, '') || ' wurde versandt.', 
      NEW.task_id
    FROM user_customer_assignments uca
    JOIN tasks t ON t.customer_id = uca.customer_id
    WHERE t.id = NEW.task_id
    -- Don't notify the user who sent the email (they already know)
    AND uca.user_id != current_setting('request.jwt.claims', true)::json->>'sub'::text;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Create the trigger
CREATE TRIGGER create_notification_for_email_reply_trigger
AFTER INSERT ON email_threads
FOR EACH ROW
EXECUTE FUNCTION public.create_notification_for_email_reply();
