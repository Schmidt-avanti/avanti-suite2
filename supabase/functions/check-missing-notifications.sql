
-- Funktion zur Überprüfung fehlender Benachrichtigungen für bestehende E-Mail-Aufgaben
CREATE OR REPLACE FUNCTION public.check_missing_notifications()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  task_record RECORD;
  customer_name TEXT;
BEGIN
  -- Für jede Aufgabe mit Quelle 'email' und Status 'new', die keine Benachrichtigung hat
  FOR task_record IN 
    SELECT t.* FROM tasks t
    LEFT JOIN notifications n ON n.task_id = t.id
    WHERE t.source = 'email' 
    AND t.status = 'new'
    AND n.id IS NULL
  LOOP
    -- Den Kundennamen abrufen
    SELECT name INTO customer_name 
    FROM customers 
    WHERE id = task_record.customer_id;
    
    -- Benachrichtigungen für Benutzer basierend auf Rollen und Zuweisungen erstellen
    -- Zuerst für Administratoren
    INSERT INTO notifications (user_id, message, task_id)
    SELECT p.id, 'Neue Aufgabe via E-Mail von ' || COALESCE(customer_name, 'unbekannt') || ' eingegangen.', task_record.id
    FROM profiles p
    WHERE p.role = 'admin'
    AND p.is_active = true;
    
    -- Dann für Agenten, die diesem Kunden zugewiesen sind
    INSERT INTO notifications (user_id, message, task_id)
    SELECT uca.user_id, 'Neue Aufgabe via E-Mail von ' || COALESCE(customer_name, 'unbekannt') || ' eingegangen.', task_record.id
    FROM user_customer_assignments uca
    JOIN profiles p ON uca.user_id = p.id
    WHERE uca.customer_id = task_record.customer_id
    AND p.is_active = true;
  END LOOP;
END;
$function$;

-- Ausführen der Funktion, um fehlende Benachrichtigungen zu erstellen
SELECT public.check_missing_notifications();
