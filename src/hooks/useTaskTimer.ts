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
  const [sessionTime, setSessionTime] = useState(0);
  const [totalTime, setTotalTime] = useState(0);
  const [isTracking, setIsTracking] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const taskTimeEntryRef = useRef<string | null>(null);
  const currentSessionTimeRef = useRef<number>(0);
  const visibilityChangeRef = useRef<boolean>(false);
  const localStorageKeyPrefix = 'task-timer-';
  
  // Keep track of the previous status and isActive values
  const prevStatusRef = useRef<TaskStatus | null>(null);
  const prevIsActiveRef = useRef<boolean | null>(null);

  // Determine if timer should be active based on task status
  const shouldBeActive = (taskStatus: TaskStatus, isActiveState: boolean): boolean => {
    // Include completed tasks if they're actively being viewed
    return isActiveState && (taskStatus === 'new' || taskStatus === 'in_progress' || 
                           (taskStatus === 'completed' && isActiveState !== prevIsActiveRef.current));
  };

  // Save timer state to localStorage
  const saveTimerState = () => {
    if (!taskId || !user) return;
    
    try {
      const state = {
        currentSessionTime: currentSessionTimeRef.current,
        startTime: startTimeRef.current,
        taskTimeEntry: taskTimeEntryRef.current,
        isTracking
      };
      
      localStorage.setItem(`${localStorageKeyPrefix}${taskId}-${user.id}`, JSON.stringify(state));
    } catch (err) {
      console.error('Error saving timer state to localStorage:', err);
    }
  };

  // Load timer state from localStorage
  const loadTimerState = () => {
    if (!taskId || !user) return null;
    
    try {
      const stateJson = localStorage.getItem(`${localStorageKeyPrefix}${taskId}-${user.id}`);
      if (!stateJson) return null;
      
      return JSON.parse(stateJson);
    } catch (err) {
      console.error('Error loading timer state from localStorage:', err);
      return null;
    }
  };

  // Fetch total time from the task_times table across ALL users
  const fetchAccumulatedTime = async () => {
    if (!taskId) return { sessionTime: 0, totalTime: 0 };

    try {
      // Calculate total time by summing all durations for this task (across all users)
      const { data: totalDurations, error: durationsError } = await supabase
        .from('task_times')
        .select('duration_seconds, user_id')
        .eq('task_id', taskId)
        .not('duration_seconds', 'is', null);

      if (durationsError) throw durationsError;

      // Calculate sum of all completed durations
      const totalCompletedTime = totalDurations?.reduce((sum, entry) => 
        sum + (entry.duration_seconds || 0), 0) || 0;
      
      // Calculate current user's completed time
      const userCompletedTime = totalDurations
        ?.filter(entry => entry.user_id === user?.id)
        .reduce((sum, entry) => sum + (entry.duration_seconds || 0), 0) || 0;

      // Add current user's active session time (if any)
      const userSessionTime = userCompletedTime + currentSessionTimeRef.current;
      const totalSeconds = totalCompletedTime + currentSessionTimeRef.current;
      
      console.log('Time calculation:', {
        taskId,
        userCompletedTime,
        currentSession: currentSessionTimeRef.current,
        userTotal: userSessionTime,
        allTotal: totalSeconds,
        userId: user?.id,
        status,
        entriesCount: totalDurations?.length || 0
      });

      return { 
        sessionTime: userSessionTime, 
        totalTime: totalSeconds
      };
    } catch (err) {
      console.error('Error calculating total time:', err);
      return { 
        sessionTime: currentSessionTimeRef.current, 
        totalTime: currentSessionTimeRef.current
      };
    }
  };

  // Handle visibility change events
  const handleVisibilityChange = () => {
    visibilityChangeRef.current = document.hidden;
    
    if (document.hidden) {
      console.log('Tab hidden, pausing timer');
      stopLocalTimer();
      saveTimerState();
    } else if (isTracking) {
      console.log('Tab visible again, resuming timer');
      startLocalTimer();
    }
  };

  // Handle online/offline events
  const handleOnlineStatus = () => {
    if (navigator.onLine && isTracking) {
      console.log('Connection restored, resuming timer');
      startLocalTimer();
    } else if (!navigator.onLine) {
      console.log('Connection lost, pausing timer');
      stopLocalTimer();
      saveTimerState();
    }
  };

  // Handle beforeunload event
  const handleBeforeUnload = async () => {
    console.log('Page unloading, saving timer state');
    saveTimerState();
    
    // If tracking is active, save the current progress
    if (isTracking && startTimeRef.current && taskTimeEntryRef.current) {
      try {
        const finalSessionTime = Math.floor((Date.now() - startTimeRef.current) / 1000);
        
        if (finalSessionTime > 0) {
          await supabase
            .from('task_times')
            .update({
              ended_at: new Date().toISOString(),
              duration_seconds: finalSessionTime
            })
            .eq('id', taskTimeEntryRef.current);
            
          console.log('Saved final session time on page unload:', finalSessionTime);
        }
      } catch (err) {
        console.error('Error saving timer state on unload:', err);
      }
    }
  };

  // Set up real-time subscription for task_times updates
  useEffect(() => {
    if (!taskId) return;

    const initializeTimer = async () => {
      // Check for any orphaned sessions and attempt to recover from localStorage
      await cleanupOrphanedSessions();
      
      // Load saved state
      const savedState = loadTimerState();
      if (savedState && savedState.isTracking) {
        console.log('Recovered timer state from localStorage:', savedState);
        if (savedState.startTime && savedState.taskTimeEntry) {
          // Resume the existing session
          taskTimeEntryRef.current = savedState.taskTimeEntry;
          startTimeRef.current = savedState.startTime;
          currentSessionTimeRef.current = Math.floor((Date.now() - savedState.startTime) / 1000);
          setIsTracking(true);
          
          if (shouldBeActive(status, isActive)) {
            startLocalTimer();
          }
        }
      }
      
      const { sessionTime, totalTime } = await fetchAccumulatedTime();
      setSessionTime(sessionTime);
      setTotalTime(totalTime);
    };

    initializeTimer();

    // Set up event listeners for background/foreground transitions
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('online', handleOnlineStatus);
    window.addEventListener('offline', handleOnlineStatus);
    window.addEventListener('beforeunload', handleBeforeUnload);

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
          const { sessionTime: newSessionTime, totalTime: newTotalTime } = await fetchAccumulatedTime();
          setSessionTime(newSessionTime);
          setTotalTime(newTotalTime);
        }
      )
      .subscribe();

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('online', handleOnlineStatus);
      window.removeEventListener('offline', handleOnlineStatus);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      supabase.removeChannel(channel);
      stopLocalTimer();
    };
  }, [taskId]);

  // Cleanup orphaned sessions on initialization
  const cleanupOrphanedSessions = async () => {
    if (!taskId || !user) return;
    
    try {
      // Check for any ongoing session for this task and user
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
        // Found an orphaned session, calculate the duration and end it
        const session = data[0];
        const startTime = new Date(session.started_at).getTime();
        const now = Date.now();
        
        // Cap orphaned sessions at 30 minutes max
        const maxSessionTime = 30 * 60 * 1000; // 30 minutes
        const endTime = new Date(Math.min(startTime + maxSessionTime, now));
        const durationSeconds = Math.floor((endTime.getTime() - startTime) / 1000);
        
        console.log(`Cleaning up orphaned session ${session.id} with duration: ${durationSeconds}s`);
        
        await supabase
          .from('task_times')
          .update({
            ended_at: endTime.toISOString(),
            duration_seconds: durationSeconds
          })
          .eq('id', session.id);
      }
    } catch (err) {
      console.error('Error cleaning up orphaned sessions:', err);
    }
  };

  // Handle the interval timer for the current user's session
  const startLocalTimer = () => {
    stopLocalTimer();
    
    timerRef.current = setInterval(async () => {
      if (startTimeRef.current && !visibilityChangeRef.current) {
        currentSessionTimeRef.current = Math.floor((Date.now() - startTimeRef.current) / 1000);
        const { sessionTime: newSessionTime, totalTime: newTotalTime } = await fetchAccumulatedTime();
        setSessionTime(newSessionTime);
        setTotalTime(newTotalTime);
        
        // Periodically save progress every 30 seconds
        if (currentSessionTimeRef.current % 30 === 0) {
          saveTimerState();
        }
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
    if (!user || isTracking || !shouldBeActive(status, isActive)) return;

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
      setIsTracking(true);
      startLocalTimer();
      saveTimerState();

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
      
      // Remove from localStorage
      if (user) {
        localStorage.removeItem(`${localStorageKeyPrefix}${taskId}-${user.id}`);
      }

      // Update total time immediately after stopping
      const { sessionTime: newSessionTime, totalTime: newTotalTime } = await fetchAccumulatedTime();
      setSessionTime(newSessionTime);
      setTotalTime(newTotalTime);

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
    const timerShouldBeActive = shouldBeActive(status, isActive);
    const statusChanged = status !== prevStatusRef.current;
    const isActiveChanged = isActive !== prevIsActiveRef.current;
    
    // Update refs
    prevStatusRef.current = status;
    prevIsActiveRef.current = isActive;
    
    // Handle status transitions
    if ((statusChanged || isActiveChanged) && timerShouldBeActive && !isTracking && taskId && user?.id) {
      console.log(`Status/active state changed - was: ${prevStatusRef.current}/${prevIsActiveRef.current}, now: ${status}/${isActive}`);
      startTracking();
    } else if ((statusChanged || isActiveChanged) && !timerShouldBeActive && isTracking) {
      console.log(`Status changed to inactive state - was: ${prevStatusRef.current}, now: ${status}/${isActive}`);
      stopTracking();
    }

    return () => {
      if (isTracking) {
        console.log('Component unmounting, saving timer progress');
        saveTimerState();
        stopTracking();
      }
    };
  }, [isActive, taskId, status, user?.id]);

  return {
    sessionTime,
    totalTime,
    formattedSessionTime: formatTime(sessionTime),
    formattedTotalTime: formatTime(totalTime),
    isTracking
  };
};
