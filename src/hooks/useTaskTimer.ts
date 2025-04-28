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
  const accumulatedTimeRef = useRef<number>(0);

  // Fetch accumulated time from all users and calculate active sessions
  const fetchAccumulatedTime = async () => {
    if (!taskId) return 0;

    try {
      // First get completed sessions
      const { data: completedSessions, error: completedError } = await supabase
        .from('task_times')
        .select('duration_seconds')
        .eq('task_id', taskId)
        .not('duration_seconds', 'is', null);

      if (completedError) throw completedError;

      // Then get active sessions
      const { data: activeSessions, error: activeError } = await supabase
        .from('task_times')
        .select('started_at')
        .eq('task_id', taskId)
        .is('ended_at', null);

      if (activeError) throw activeError;

      // Calculate total from completed sessions
      const completedTotal = completedSessions.reduce((sum, entry) => 
        sum + (entry.duration_seconds || 0), 0);

      // Calculate total from active sessions
      const now = Date.now();
      const activeTotal = activeSessions.reduce((sum, entry) => {
        const startTime = new Date(entry.started_at).getTime();
        const sessionDuration = Math.floor((now - startTime) / 1000);
        return sum + sessionDuration;
      }, 0);

      const totalSeconds = completedTotal + activeTotal;
      console.log(`Total time (completed + active): ${completedTotal}s + ${activeTotal}s = ${totalSeconds}s`);
      
      return totalSeconds;
    } catch (err) {
      console.error('Error calculating total time:', err);
      return 0;
    }
  };

  // Set up real-time subscription for task_times updates
  useEffect(() => {
    if (!taskId) return;

    const initializeTimer = async () => {
      const totalSeconds = await fetchAccumulatedTime();
      accumulatedTimeRef.current = totalSeconds;
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
          accumulatedTimeRef.current = updatedTime;
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
    
    timerRef.current = setInterval(() => {
      if (startTimeRef.current) {
        const sessionTime = Math.floor((Date.now() - startTimeRef.current) / 1000);
        setElapsedTime(accumulatedTimeRef.current + sessionTime);
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
      const { data: existingSessions } = await supabase
        .from('task_times')
        .select('id, started_at')
        .eq('task_id', taskId)
        .eq('user_id', user.id)
        .is('ended_at', null)
        .order('started_at', { ascending: false })
        .limit(1);

      if (existingSessions && existingSessions.length > 0) {
        taskTimeEntryRef.current = existingSessions[0].id;
        startTimeRef.current = new Date(existingSessions[0].started_at).getTime();
      } else {
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
      }
      
      setIsTracking(true);
      currentSessionTimeRef.current = 0;
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
        const currentSessionTime = Math.floor((Date.now() - startTimeRef.current) / 1000);

        const { error } = await supabase
          .from('task_times')
          .update({
            ended_at: new Date().toISOString(),
            duration_seconds: currentSessionTime
          })
          .eq('id', taskTimeEntryRef.current);
        
        if (error) {
          throw error;
        }
      }

      setIsTracking(false);
      startTimeRef.current = null;
      currentSessionTimeRef.current = 0;
      taskTimeEntryRef.current = null;

      // Update accumulated time immediately after stopping
      const updatedTime = await fetchAccumulatedTime();
      accumulatedTimeRef.current = updatedTime;
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
