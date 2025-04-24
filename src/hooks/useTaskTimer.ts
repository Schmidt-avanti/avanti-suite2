
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

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
      console.log(`Starting time tracking for task ${taskId}`);
      
      const { data, error } = await supabase
        .from('task_times')
        .insert({
          task_id: taskId,
          user_id: user.id,
          started_at: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (error) {
        console.error('Error creating task time entry:', error);
        throw error;
      }

      console.log(`Created task time entry: ${data.id}`);
      
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
      toast.error('Fehler beim Starten der Zeitmessung');
    }
  };

  // Stop tracking time
  const stopTracking = async () => {
    if (!isTracking || !taskTimeEntryRef.current) return;

    try {
      console.log(`Stopping time tracking for task ${taskId}, entry ${taskTimeEntryRef.current}`);
      
      // Clear interval
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      // Berechnete Dauer in Sekunden
      const seconds = elapsedTime > 0 ? elapsedTime : 
        (startTimeRef.current ? Math.floor((Date.now() - startTimeRef.current) / 1000) : 0);
      
      // Nur speichern, wenn die Dauer größer als 0 ist
      if (seconds > 0) {
        const endTime = new Date().toISOString();
        
        console.log(`Updating task time entry ${taskTimeEntryRef.current} with duration: ${seconds}s and end time: ${endTime}`);
        
        // Update task time entry
        const { error } = await supabase
          .from('task_times')
          .update({
            ended_at: endTime,
            duration_seconds: seconds
          })
          .eq('id', taskTimeEntryRef.current);
        
        if (error) {
          console.error('Error updating task time entry:', error);
          toast.error('Fehler beim Speichern der Bearbeitungszeit');
        } else {
          console.log(`Successfully updated time entry with duration: ${seconds}s`);
        }
      } else {
        console.warn(`Skipping update for task time entry ${taskTimeEntryRef.current} because duration is ${seconds}s`);
      }

      // Reset states
      setIsTracking(false);
      setElapsedTime(0);
      startTimeRef.current = null;
      taskTimeEntryRef.current = null;
    } catch (err) {
      console.error('Error stopping task timer:', err);
      toast.error('Fehler beim Stoppen der Zeitmessung');
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
    console.log(`Task timer effect triggered - isActive: ${isActive}, taskId: ${taskId}, isTracking: ${isTracking}`);
    
    if (isActive && !isTracking) {
      startTracking();
    } else if (!isActive && isTracking) {
      stopTracking();
    }

    // Cleanup on unmount or when taskId changes
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (isTracking) {
        stopTracking();
      }
    };
  }, [isActive, taskId]);

  return {
    elapsedTime,
    formattedTime: formatTime(elapsedTime),
    isTracking
  };
};
