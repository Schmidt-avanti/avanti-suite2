
-- Create a function to create notifications when a new email task is created
CREATE OR REPLACE FUNCTION public.create_notification_for_email_task()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  customer_name TEXT;
BEGIN
  -- Only proceed if the task's source is 'email' and status is 'new'
  IF NEW.source = 'email' AND NEW.status = 'new' THEN
    -- Get the customer name
    SELECT name INTO customer_name FROM customers WHERE id = NEW.customer_id;
    
    -- Create notifications for users based on roles and assignments
    -- First for admins
    INSERT INTO notifications (user_id, message, task_id)
    SELECT p.id, 'Neue Aufgabe via E-Mail von ' || customer_name || ' eingegangen.', NEW.id
    FROM profiles p
    WHERE p.role = 'admin';
    
    -- Then for agents assigned to this customer
    INSERT INTO notifications (user_id, message, task_id)
    SELECT uca.user_id, 'Neue Aufgabe via E-Mail von ' || customer_name || ' eingegangen.', NEW.id
    FROM user_customer_assignments uca
    WHERE uca.customer_id = NEW.customer_id;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Check if the trigger already exists
DO $$ 
DECLARE
  trigger_exists BOOLEAN;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'email_task_notification_trigger'
  ) INTO trigger_exists;
  
  IF NOT trigger_exists THEN
    -- Create the trigger if it doesn't exist
    CREATE TRIGGER email_task_notification_trigger
      AFTER INSERT ON tasks
      FOR EACH ROW
      EXECUTE FUNCTION create_notification_for_email_task();
  END IF;
END $$;
