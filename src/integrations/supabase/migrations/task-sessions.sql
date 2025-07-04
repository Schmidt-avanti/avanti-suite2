-- Add the task_sessions table
CREATE TABLE IF NOT EXISTS task_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE,
  duration_seconds INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_task_sessions_task_id ON task_sessions(task_id);
CREATE INDEX IF NOT EXISTS idx_task_sessions_user_id ON task_sessions(user_id);

-- Add total_duration_seconds column to tasks table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_name = 'tasks' AND column_name = 'total_duration_seconds'
  ) THEN
    ALTER TABLE tasks ADD COLUMN total_duration_seconds INTEGER DEFAULT 0;
  END IF;
END $$;

-- Create or replace function to calculate total task duration
CREATE OR REPLACE FUNCTION calculate_task_total_duration(task_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  total_seconds INTEGER;
BEGIN
  -- Sum all completed session durations
  SELECT COALESCE(SUM(duration_seconds), 0)
  INTO total_seconds
  FROM task_sessions
  WHERE task_sessions.task_id = calculate_task_total_duration.task_id
  AND duration_seconds IS NOT NULL;
  
  -- Update the tasks table with the total duration
  UPDATE tasks
  SET total_duration_seconds = total_seconds
  WHERE id = calculate_task_total_duration.task_id;
  
  RETURN total_seconds;
END;
$$;

-- Make sure RLS is enabled first before adding policies
BEGIN;
  -- Enable row level security on task_sessions table
  ALTER TABLE task_sessions ENABLE ROW LEVEL SECURITY;
  
  -- First clean up all existing policies to start fresh
  DROP POLICY IF EXISTS "Enable task sessions for all authenticated users" ON task_sessions;
  DROP POLICY IF EXISTS "Enable read access for all authenticated users" ON task_sessions;
  DROP POLICY IF EXISTS "Enable write access for own sessions" ON task_sessions;
  DROP POLICY IF EXISTS "Enable RPC for authenticated users only" ON tasks;
  
  -- Create a clear policy for task_sessions that allows all authenticated users to read ALL sessions
  -- regardless of user_id (this is critical for cross-user time viewing)
  CREATE POLICY "View all task sessions"
    ON task_sessions
    FOR SELECT
    TO authenticated
    USING (true);
    
  -- Create policy for creating/updating own sessions
  CREATE POLICY "Manage own task sessions"
    ON task_sessions
    FOR ALL
    TO authenticated
    USING (auth.uid() = user_id);
  
  -- Tasks table policy
  CREATE POLICY "Enable RPC for authenticated users only" 
    ON tasks
    FOR ALL 
    TO authenticated
    USING (true);
    
  -- Grant explicit permissions to calculate_task_total_duration function
  GRANT EXECUTE ON FUNCTION calculate_task_total_duration TO authenticated;
  
  -- Reset task_sessions permissions
  GRANT ALL ON task_sessions TO authenticated;
COMMIT;

-- Create function to update total durations for all tasks
CREATE OR REPLACE FUNCTION update_all_task_durations()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  updated_count INTEGER := 0;
  t_id UUID;
BEGIN
  FOR t_id IN SELECT DISTINCT task_id FROM task_sessions
  LOOP
    PERFORM calculate_task_total_duration(t_id);
    updated_count := updated_count + 1;
  END LOOP;
  
  RETURN updated_count;
END;
$$;

-- Create trigger to update total_duration_seconds when task_sessions are modified
CREATE OR REPLACE FUNCTION update_task_duration_on_session_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM calculate_task_total_duration(OLD.task_id);
  ELSE
    PERFORM calculate_task_total_duration(NEW.task_id);
  END IF;
  RETURN NULL;
END;
$$;

-- Add trigger to task_sessions table
DROP TRIGGER IF EXISTS update_task_duration_trigger ON task_sessions;
CREATE TRIGGER update_task_duration_trigger
AFTER INSERT OR UPDATE OR DELETE
ON task_sessions
FOR EACH ROW
EXECUTE FUNCTION update_task_duration_on_session_change();
