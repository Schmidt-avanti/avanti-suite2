-- Ensure task_sessions table exists
CREATE TABLE IF NOT EXISTS public.task_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  duration_seconds INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Add indexes for better performance
  CONSTRAINT task_times_task_id_fkey FOREIGN KEY (task_id) REFERENCES tasks(id),
  CONSTRAINT task_times_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Add total_duration_seconds to tasks table if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_name = 'tasks' AND column_name = 'total_duration_seconds'
  ) THEN
    ALTER TABLE public.tasks ADD COLUMN total_duration_seconds INTEGER DEFAULT 0;
  END IF;
END $$;

-- Create RLS policies for task_sessions
ALTER TABLE public.task_sessions ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to create their own sessions
CREATE POLICY "Users can create their own task sessions" 
  ON public.task_sessions FOR INSERT 
  TO authenticated 
  WITH CHECK (auth.uid() = user_id);

-- Allow authenticated users to update their own sessions
CREATE POLICY "Users can update their own task sessions" 
  ON public.task_sessions FOR UPDATE 
  TO authenticated 
  USING (auth.uid() = user_id);

-- Allow users to read all sessions for tasks they have access to
CREATE POLICY "Users can read task sessions for tasks they have access to" 
  ON public.task_sessions FOR SELECT 
  TO authenticated 
  USING (EXISTS (
    SELECT 1 FROM public.tasks 
    WHERE public.tasks.id = task_sessions.task_id 
    AND (
      public.tasks.assigned_to = auth.uid() OR
      public.tasks.created_by = auth.uid() OR
      auth.uid() IN (SELECT user_id FROM user_roles WHERE role = 'admin')
    )
  ));
