import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { TaskStatus } from '@/types';

interface TaskTimerOptions {
  taskId: string;
  isActive: boolean;
  status?: TaskStatus;
}

export const useTaskTimer = ({ taskId, isActive, status = 'new' }: TaskTimerOptions) => {
  const { user } = useAuth();
  const [totalTime, setTotalTime] = useState(0);
  const [sessionTime, setSessionTime] = useState(0);
  const [isTracking, setIsTracking] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const taskTimeEntryRef = useRef<string | null>(null);
  const currentSessionTimeRef = useRef<number>(0);

  // Determine if timer should be active based on task status
  const shouldBeActive = (taskStatus: TaskStatus): boolean => {
    return isActive && (taskStatus === 'new' || taskStatus === 'in_progress');
  };

  // Fetch total time from the task_times table across ALL users
  const fetchAccumulatedTime = async () => {
    if (!taskId) return 0;

    try {
      // Calculate total time by summing all durations for this task (across all users)
      const { data: totalDurations, error: durationsError } = await supabase
        .from('task_times')
        .select('duration_seconds')
        .eq('task_id', taskId)
        .not('duration_seconds', 'is', null);

      if (durationsError) throw durationsError;

      // Calculate sum of all completed durations
      const totalCompletedTime = totalDurations?.reduce((sum, entry) => 
        sum + (entry.duration_seconds || 0), 0) || 0;
      
      console.log('Total time calculation:', {
        taskId,
        totalCompletedTime,
        userId: user?.id,
        status,
        entriesCount: totalDurations?.length || 0
      });

      return totalCompletedTime;
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
      setTotalTime(totalSeconds);
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
          setTotalTime(updatedTime);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      stopLocalTimer();
    };
  }, [taskId]);

  // Check if there's an ongoing timer session that needs to be resumed
  useEffect(() => {
    if (!taskId || !user) return;
    
    const checkOngoingSession = async () => {
      try {
        // Check for any ongoing timer session that hasn't been ended
        const { data, error } = await supabase
          .from('task_times')
          .select('id, started_at')
          .eq('task_id', taskId)
          .eq('user_id', user.id)
          .is('ended_at', null)
          .order('started_at', { ascending: false })
          .limit(1);
          
        if (error) throw error;
        
        if (data && data.length > 0) {
          // Found an ongoing session, resume it
          taskTimeEntryRef.current = data[0].id;
          const startTime = new Date(data[0].started_at).getTime();
          startTimeRef.current = startTime;
          currentSessionTimeRef.current = Math.floor((Date.now() - startTime) / 1000);
          setSessionTime(currentSessionTimeRef.current);
          setIsTracking(true);
          
          if (shouldBeActive(status)) {
            startLocalTimer();
          } else {
            // If we shouldn't be active now, end the previous session
            await stopTracking();
          }
        } else if (shouldBeActive(status)) {
          // No ongoing session but we should be active
          startTracking();
        }
      } catch (err) {
        console.error('Error checking ongoing timer session:', err);
      }
    };
    
    checkOngoingSession();
  }, [taskId, user, status]);

  // Handle the interval timer for the current user's session
  const startLocalTimer = () => {
    stopLocalTimer();
    
    timerRef.current = setInterval(async () => {
      if (startTimeRef.current) {
        currentSessionTimeRef.current = Math.floor((Date.now() - startTimeRef.current) / 1000);
        setSessionTime(currentSessionTimeRef.current);
        
        // We don't need to update total time here as it's updated via subscription
        // This keeps the UI responsive for the session time
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
    if (!user || isTracking || !shouldBeActive(status)) return;

    try {
      console.log(`Starting timer for task ${taskId} with status ${status}`);
      
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
      setSessionTime(0);
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
        
        // Only update if there was actual time spent
        if (finalSessionTime > 0) {
          const { error } = await supabase
            .from('task_times')
            .update({
              ended_at: new Date().toISOString(),
              duration_seconds: finalSessionTime
            })
            .eq('id', taskTimeEntryRef.current);
          
          if (error) throw error;
        }

        currentSessionTimeRef.current = 0;
      }

      setIsTracking(false);
      startTimeRef.current = null;
      taskTimeEntryRef.current = null;
      setSessionTime(0);

      // Update total time immediately after stopping
      const updatedTime = await fetchAccumulatedTime();
      setTotalTime(updatedTime);

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

  // Effect for handling active state and status changes
  useEffect(() => {
    const timerShouldBeActive = shouldBeActive(status);
    
    if (timerShouldBeActive && !isTracking && taskId) {
      startTracking();
    } else if (!timerShouldBeActive && isTracking) {
      stopTracking();
    }

    return () => {
      if (isTracking) {
        stopTracking();
      }
    };
  }, [isActive, taskId, status]);

  return {
    sessionTime,
    totalTime,
    formattedSessionTime: formatTime(sessionTime),
    formattedTotalTime: formatTime(totalTime),
    isTracking
  };
};
