
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
  const currentSessionTimeRef = useRef<number>(0);

  // Fetch accumulated time from all users' sessions
  const fetchAccumulatedTime = async () => {
    if (!taskId) return 0;

    try {
      const { data, error } = await supabase
        .from('task_times')
        .select('duration_seconds')
        .eq('task_id', taskId)
        .not('duration_seconds', 'is', null);

      if (error) throw error;

      const totalSeconds = data.reduce((sum, entry) => sum + (entry.duration_seconds || 0), 0);
      console.log(`Fetched total accumulated time for all users: ${totalSeconds}s`);
      return totalSeconds;
    } catch (err) {
      console.error('Error fetching accumulated time:', err);
      return 0;
    }
  };

  // Set up real-time subscription for task_times updates
  useEffect(() => {
    if (!taskId) return;

    const initializeTimer = async () => {
      const accumulatedSeconds = await fetchAccumulatedTime();
      accumulatedTimeRef.current = accumulatedSeconds;
      updateElapsedTime();
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
          console.log('Detected change in task_times table - refreshing accumulated time');
          const updatedTime = await fetchAccumulatedTime();
          accumulatedTimeRef.current = updatedTime;
          updateElapsedTime();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      stopLocalTimer();
    };
  }, [taskId]);

  // Handle the interval timer separately from the subscription
  const startLocalTimer = () => {
    stopLocalTimer(); // Clear any existing timer
    
    timerRef.current = setInterval(() => {
      if (startTimeRef.current) {
        currentSessionTimeRef.current = Math.floor((Date.now() - startTimeRef.current) / 1000);
        updateElapsedTime();
      }
    }, 1000);
  };

  const stopLocalTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const updateElapsedTime = () => {
    const sessionTime = startTimeRef.current ? 
      Math.floor((Date.now() - startTimeRef.current) / 1000) : 
      0;
    
    // This now shows the total accumulated time from ALL users plus current session
    setElapsedTime(accumulatedTimeRef.current + sessionTime);
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
      updateElapsedTime();

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

  // Cleanup orphaned sessions
  const cleanupOrphanedSessions = async () => {
    if (!user || !taskId) return;

    try {
      const { data, error } = await supabase
        .from('task_times')
        .select('id, started_at')
        .eq('task_id', taskId)
        .eq('user_id', user.id)
        .is('ended_at', null)
        .order('started_at', { ascending: false })
        .limit(1);

      if (error) {
        console.error('Error fetching orphaned sessions:', error);
        return;
      }

      if (data && data.length > 0) {
        console.log(`Found ${data.length} orphaned session(s) for task ${taskId}`);
        
        const oneHourAgo = new Date();
        oneHourAgo.setHours(oneHourAgo.getHours() - 1);
        
        for (const session of data) {
          const startedAt = new Date(session.started_at);
          
          if (data.indexOf(session) === 0 && startedAt > oneHourAgo) {
            console.log(`Keeping recent session ${session.id} active`);
            continue;
          }
          
          const endTime = new Date(startedAt);
          endTime.setMinutes(startedAt.getMinutes() + 30);
          
          const durationSeconds = Math.floor((endTime.getTime() - startedAt.getTime()) / 1000);
          
          console.log(`Auto-closing orphaned session ${session.id} with duration: ${durationSeconds}s`);
          
          await supabase
            .from('task_times')
            .update({
              ended_at: endTime.toISOString(),
              duration_seconds: durationSeconds
            })
            .eq('id', session.id);
        }
      }
    } catch (err) {
      console.error('Error cleaning up orphaned sessions:', err);
    }
  };

  return {
    elapsedTime,
    formattedTime: formatTime(elapsedTime),
    isTracking
  };
};
