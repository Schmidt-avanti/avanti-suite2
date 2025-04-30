
-- Add endkunde_id column to tasks table
ALTER TABLE public.tasks
ADD COLUMN endkunde_id UUID REFERENCES public.endkunden(id);
