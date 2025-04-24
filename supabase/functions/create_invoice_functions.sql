
-- Diese Datei enthält die gespeicherte Prozedur für die Berechnung von Kundenzeiten in Supabase

CREATE OR REPLACE FUNCTION calculate_total_time_for_customer(
  customer_id_param UUID,
  from_date_param TIMESTAMP WITH TIME ZONE,
  to_date_param TIMESTAMP WITH TIME ZONE
) 
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  total_seconds BIGINT;
BEGIN
  SELECT COALESCE(SUM(tt.duration_seconds), 0)
  INTO total_seconds
  FROM task_times tt
  JOIN tasks t ON tt.task_id = t.id
  WHERE t.customer_id = customer_id_param
    AND tt.started_at >= from_date_param
    AND tt.started_at <= to_date_param;
  
  RETURN total_seconds;
END;
$$;

-- Füge eine Debug-Funktion hinzu, um die einzelnen Zeiteinträge zu überprüfen
CREATE OR REPLACE FUNCTION debug_customer_times(
  customer_id_param UUID,
  from_date_param TIMESTAMP WITH TIME ZONE,
  to_date_param TIMESTAMP WITH TIME ZONE
) 
RETURNS TABLE (
  task_id UUID,
  task_title TEXT,
  started_at TIMESTAMP WITH TIME ZONE,
  duration_seconds INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT tt.task_id, t.title, tt.started_at, tt.duration_seconds
  FROM task_times tt
  JOIN tasks t ON tt.task_id = t.id
  WHERE t.customer_id = customer_id_param
    AND tt.started_at >= from_date_param
    AND tt.started_at <= to_date_param
  ORDER BY tt.started_at;
END;
$$;
