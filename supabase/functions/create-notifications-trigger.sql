-- Diese SQL-Datei erstellt den Trigger für Benachrichtigungen bei neuen E-Mail-Aufgaben

-- Zunächst löschen wir den Trigger, falls er bereits existiert
DROP TRIGGER IF EXISTS create_notification_for_email_task_trigger ON tasks;

-- Jetzt erstellen wir die Trigger-Funktion neu
CREATE OR REPLACE FUNCTION public.create_notification_for_email_task()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  customer_name TEXT;
BEGIN
  -- Nur fortfahren, wenn die Aufgabenquelle 'email' ist und der Status 'new'
  IF NEW.source = 'email' AND NEW.status = 'new' THEN
    -- Den Kundennamen abrufen
    SELECT name INTO customer_name FROM customers WHERE id = NEW.customer_id;
    
    -- Benachrichtigungen für Benutzer basierend auf Rollen und Zuweisungen erstellen
    -- Zuerst für Administratoren
    INSERT INTO notifications (user_id, message, task_id)
    SELECT p.id, 'Neue Aufgabe "' || NEW.title || '" via E-Mail von ' || COALESCE(customer_name, 'unbekannt') || ' eingegangen.', NEW.id
    FROM profiles p
    WHERE p.role = 'admin'
    AND p.is_active = true;
    
    -- Dann für Agenten, die diesem Kunden zugewiesen sind
    INSERT INTO notifications (user_id, message, task_id)
    SELECT uca.user_id, 'Neue Aufgabe "' || NEW.title || '" via E-Mail von ' || COALESCE(customer_name, 'unbekannt') || ' eingegangen.', NEW.id
    FROM user_customer_assignments uca
    JOIN profiles p ON uca.user_id = p.id
    WHERE uca.customer_id = NEW.customer_id
    AND p.is_active = true;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Jetzt erstellen wir den eigentlichen Trigger
CREATE TRIGGER create_notification_for_email_task_trigger
AFTER INSERT ON tasks
FOR EACH ROW
EXECUTE FUNCTION public.create_notification_for_email_task();

-- Bonus: Fügen wir auch einen Trigger für Statusänderungen hinzu
CREATE OR REPLACE FUNCTION public.notify_task_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  customer_name TEXT;
  assignee_name TEXT;
  status_text TEXT;
BEGIN
  -- Nur fortfahren, wenn sich der Status geändert hat
  IF NEW.status != OLD.status THEN
    -- Den Kundennamen abrufen
    SELECT name INTO customer_name FROM customers WHERE id = NEW.customer_id;
    
    -- Status in lesbaren Text umwandeln
    CASE NEW.status
      WHEN 'new' THEN status_text := 'Neu';
      WHEN 'in_progress' THEN status_text := 'In Bearbeitung';
      WHEN 'followup' THEN status_text := 'Auf Wiedervorlage';
      WHEN 'completed' THEN status_text := 'Abgeschlossen';
      ELSE status_text := NEW.status;
    END CASE;
    
    -- Benachrichtigungen erstellen für den Ersteller und zugewiesene Benutzer
    -- Wenn es einen Ersteller gibt und dieser nicht derselbe ist wie der, der die Änderung vorgenommen hat
    IF NEW.created_by IS NOT NULL AND NEW.created_by != auth.uid() THEN
      INSERT INTO notifications (user_id, message, task_id)
      VALUES (
        NEW.created_by,
        'Status der Aufgabe "' || NEW.title || '" wurde zu "' || status_text || '" geändert.',
        NEW.id
      );
    END IF;
    
    -- Für Agenten, die diesem Kunden zugewiesen sind
    INSERT INTO notifications (user_id, message, task_id)
    SELECT uca.user_id, 'Status der Aufgabe "' || NEW.title || '" wurde zu "' || status_text || '" geändert.', NEW.id
    FROM user_customer_assignments uca
    JOIN profiles p ON uca.user_id = p.id
    WHERE uca.customer_id = NEW.customer_id
    AND p.is_active = true
    AND uca.user_id != auth.uid(); -- Nicht den Benutzer benachrichtigen, der die Änderung vorgenommen hat
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Trigger für Statusänderungen erstellen
CREATE TRIGGER notify_task_status_change_trigger
AFTER UPDATE ON tasks
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION public.notify_task_status_change();
