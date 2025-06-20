-- Migration to create task_sessions table for tracking time spent on tasks
-- This table tracks individual sessions where a user views a task

CREATE TABLE IF NOT EXISTS task_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  end_time TIMESTAMP WITH TIME ZONE,
  duration_seconds INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_task_sessions_task_id ON task_sessions(task_id);
CREATE INDEX IF NOT EXISTS idx_task_sessions_user_id ON task_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_task_sessions_start_time ON task_sessions(start_time);

-- Add a function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_task_session_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to automatically update updated_at on record change
CREATE TRIGGER update_task_session_updated_at
BEFORE UPDATE ON task_sessions
FOR EACH ROW
EXECUTE FUNCTION update_task_session_updated_at();

-- Add RLS policies to protect session data
ALTER TABLE task_sessions ENABLE ROW LEVEL SECURITY;

-- Policy for admins - full access
CREATE POLICY admin_task_sessions_policy
ON task_sessions
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'superadmin')
  )
);

-- Policy for users - access only to their own sessions
CREATE POLICY user_task_sessions_policy
ON task_sessions
USING (
  user_id = auth.uid()
);
