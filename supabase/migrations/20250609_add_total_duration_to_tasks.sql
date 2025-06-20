-- Migration to add total_duration_seconds to tasks table
-- This stores the aggregated time from all sessions for quick access

-- Add the total_duration_seconds column to tasks table
ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS total_duration_seconds INTEGER DEFAULT 0;

-- Create a function to update the total_duration_seconds on the tasks table
CREATE OR REPLACE FUNCTION update_task_total_duration()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the total_duration_seconds in the tasks table
  UPDATE tasks
  SET total_duration_seconds = (
    SELECT COALESCE(SUM(duration_seconds), 0)
    FROM task_sessions
    WHERE task_id = NEW.task_id
  )
  WHERE id = NEW.task_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to call the function after insert or update on task_sessions
DROP TRIGGER IF EXISTS trigger_update_task_duration ON task_sessions;
CREATE TRIGGER trigger_update_task_duration
AFTER INSERT OR UPDATE OF duration_seconds ON task_sessions
FOR EACH ROW
EXECUTE FUNCTION update_task_total_duration();
