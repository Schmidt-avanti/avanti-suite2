
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface TaskTimerOptions {
  taskId: string;
  isActive: boolean;
}

export const useTaskTimer = ({ taskId, isActive }: TaskTimerOptions) => {
  const { user } = useAuth();
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isTracking, setIsTracking] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const taskTimeEntryRef = useRef<string | null>(null);

  // Start tracking time for a task
  const startTracking = async () => {
    if (!user || isTracking) return;

    try {
      const { data, error } = await supabase
        .from('task_times')
        .insert({
          task_id: taskId,
          user_id: user.id,
          started_at: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (error) throw error;

      // Store the entry ID for later updates
      taskTimeEntryRef.current = data.id;
      startTimeRef.current = Date.now();
      setIsTracking(true);

      // Start timer
      timerRef.current = setInterval(() => {
        if (startTimeRef.current) {
          const currentElapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
          setElapsedTime(currentElapsed);
        }
      }, 1000);
    } catch (err) {
      console.error('Error starting task timer:', err);
    }
  };

  // Stop tracking time
  const stopTracking = async () => {
    if (!isTracking || !taskTimeEntryRef.current) return;

    try {
      // Clear interval
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }

      // Update task time entry
      await supabase
        .from('task_times')
        .update({
          ended_at: new Date().toISOString(),
          duration_seconds: elapsedTime
        })
        .eq('id', taskTimeEntryRef.current);

      // Reset states
      setIsTracking(false);
      setElapsedTime(0);
      startTimeRef.current = null;
      taskTimeEntryRef.current = null;
    } catch (err) {
      console.error('Error stopping task timer:', err);
    }
  };

  // Format time to HH:MM:SS
  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Effect to start/stop tracking based on task view
  useEffect(() => {
    if (isActive) {
      startTracking();
    } else {
      stopTracking();
    }

    // Cleanup on unmount
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      stopTracking();
    };
  }, [isActive, taskId]);

  return {
    elapsedTime,
    formattedTime: formatTime(elapsedTime),
    isTracking
  };
};
