
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
  const currentSessionTimeRef = useRef<number>(0);

  // Fetch total time from the task_times table
  const fetchAccumulatedTime = async () => {
    if (!taskId) return 0;

    try {
      // Get the current maximum time_spent_task value
      const { data: maxTimeEntry, error: maxTimeError } = await supabase
        .from('task_times')
        .select('time_spent_task')
        .eq('task_id', taskId)
        .order('time_spent_task', { ascending: false })
        .limit(1);

      if (maxTimeError) throw maxTimeError;

      const maxAccumulatedTime = maxTimeEntry?.[0]?.time_spent_task || 0;
      const totalSeconds = maxAccumulatedTime + currentSessionTimeRef.current;
      
      console.log('Time calculation:', {
        taskId,
        maxAccumulatedTime,
        currentSession: currentSessionTimeRef.current,
        total: totalSeconds,
        userId: user?.id
      });

      return totalSeconds;
    } catch (err) {
      console.error('Error calculating total time:', err);
      return currentSessionTimeRef.current;
    }
  };

  // Set up real-time subscription for task_times updates
  useEffect(() => {
    if (!taskId) return;

    const initializeTimer = async () => {
      const totalSeconds = await fetchAccumulatedTime();
      setElapsedTime(totalSeconds);
    };

    initializeTimer();

    const channel = supabase
      .channel('task_timer')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'task_times',
          filter: `task_id=eq.${taskId}`
        },
        async () => {
          console.log('Detected change in task_times - refreshing total time');
          const updatedTime = await fetchAccumulatedTime();
          setElapsedTime(updatedTime);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      stopLocalTimer();
    };
  }, [taskId]);

  // Handle the interval timer for the current user's session
  const startLocalTimer = () => {
    stopLocalTimer();
    
    timerRef.current = setInterval(async () => {
      if (startTimeRef.current) {
        currentSessionTimeRef.current = Math.floor((Date.now() - startTimeRef.current) / 1000);
        const totalTime = await fetchAccumulatedTime();
        setElapsedTime(totalTime);
      }
    }, 1000);
  };

  const stopLocalTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  // Start tracking time
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

      taskTimeEntryRef.current = data.id;
      startTimeRef.current = Date.now();
      currentSessionTimeRef.current = 0;
      setIsTracking(true);
      startLocalTimer();

    } catch (err) {
      console.error('Error starting task timer:', err);
      toast.error('Fehler beim Starten der Zeitmessung');
    }
  };

  // Stop tracking time
  const stopTracking = async () => {
    if (!isTracking || !taskTimeEntryRef.current) return;

    try {
      stopLocalTimer();

      if (startTimeRef.current) {
        const finalSessionTime = Math.floor((Date.now() - startTimeRef.current) / 1000);

        const { error } = await supabase
          .from('task_times')
          .update({
            ended_at: new Date().toISOString(),
            duration_seconds: finalSessionTime
          })
          .eq('id', taskTimeEntryRef.current);
        
        if (error) throw error;

        currentSessionTimeRef.current = 0;
      }

      setIsTracking(false);
      startTimeRef.current = null;
      taskTimeEntryRef.current = null;

      // Update total time immediately after stopping
      const updatedTime = await fetchAccumulatedTime();
      setElapsedTime(updatedTime);

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

  // Effect for handling active state changes
  useEffect(() => {
    if (isActive && !isTracking && taskId) {
      startTracking();
    } else if (!isActive && isTracking) {
      stopTracking();
    }

    return () => {
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
