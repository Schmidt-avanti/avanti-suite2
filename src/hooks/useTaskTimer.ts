
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

// Maximum session duration in seconds (10 minutes)
const MAX_SESSION_DURATION = 600;

// How often to update active sessions (1 minute)
const UPDATE_INTERVAL = 60 * 1000;

// Storage keys
const getSessionStorageKey = (taskId: string) => `task_timer_session_${taskId}`;
const getStartTimeStorageKey = (taskId: string) => `task_timer_start_${taskId}`;

export const useTaskTimer = ({ taskId, isActive, status = 'new' }: TaskTimerOptions) => {
  const { user } = useAuth();
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isTracking, setIsTracking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  
  // Refs for timer management
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const updateIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const taskTimeEntryRef = useRef<string | null>(null);
  const currentSessionTimeRef = useRef<number>(0);
  const lastActivityRef = useRef<number>(Date.now());
  const visibilityPausedRef = useRef<boolean>(false);

  // Determine if timer should be active based on task status
  const shouldBeActive = (taskStatus: TaskStatus): boolean => {
    return isActive && (taskStatus === 'new' || taskStatus === 'in_progress');
  };

  // Check if user is active
  const checkUserActivity = () => {
    const now = Date.now();
    const inactiveTime = now - lastActivityRef.current;
    
    // If user is inactive for more than 5 minutes, pause the timer
    if (inactiveTime > 5 * 60 * 1000 && !isPaused) {
      console.log('User inactive for 5 minutes, pausing timer');
      pauseTracking();
    }
  };

  // Handle user activity events
  const handleUserActivity = () => {
    lastActivityRef.current = Date.now();
    
    // Resume timer if it was paused due to inactivity
    if (isPaused && !visibilityPausedRef.current && shouldBeActive(status)) {
      resumeTracking();
    }
  };

  // Handle page visibility changes
  const handleVisibilityChange = () => {
    if (document.hidden) {
      console.log('Page hidden, pausing timer');
      visibilityPausedRef.current = true;
      pauseTracking();
    } else {
      console.log('Page visible again, resuming timer if needed');
      visibilityPausedRef.current = false;
      if (shouldBeActive(status)) {
        resumeTracking();
      }
    }
  };

  // Save session data to localStorage
  const saveSessionToStorage = () => {
    if (!taskId || !startTimeRef.current) return;
    
    try {
      localStorage.setItem(getSessionStorageKey(taskId), taskTimeEntryRef.current || '');
      localStorage.setItem(getStartTimeStorageKey(taskId), startTimeRef.current.toString());
    } catch (err) {
      console.error('Error saving session to localStorage:', err);
    }
  };

  // Load session data from localStorage
  const loadSessionFromStorage = (): { sessionId: string | null; startTime: number | null } => {
    if (!taskId) return { sessionId: null, startTime: null };
    
    try {
      const sessionId = localStorage.getItem(getSessionStorageKey(taskId));
      const startTimeStr = localStorage.getItem(getStartTimeStorageKey(taskId));
      const startTime = startTimeStr ? parseInt(startTimeStr, 10) : null;
      
      return { sessionId, startTime };
    } catch (err) {
      console.error('Error loading session from localStorage:', err);
      return { sessionId: null, startTime: null };
    }
  };

  // Clear session data from localStorage
  const clearSessionFromStorage = () => {
    if (!taskId) return;
    
    try {
      localStorage.removeItem(getSessionStorageKey(taskId));
      localStorage.removeItem(getStartTimeStorageKey(taskId));
    } catch (err) {
      console.error('Error clearing session from localStorage:', err);
    }
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

      // Add current user's active session time (if any)
      const totalSeconds = totalCompletedTime + currentSessionTimeRef.current;
      
      return totalSeconds;
    } catch (err) {
      console.error('Error calculating total time:', err);
      return currentSessionTimeRef.current;
    }
  };

  // Clean up orphaned sessions
  const cleanupOrphanedSessions = async () => {
    if (!taskId || !user) return;
    
    try {
      // Fetch orphaned sessions for this user and task
      const oneHourAgo = new Date();
      oneHourAgo.setHours(oneHourAgo.getHours() - 1);
      
      const { data: orphanedSessions, error } = await supabase
        .from('task_times')
        .select('id, started_at')
        .eq('task_id', taskId)
        .eq('user_id', user.id)
        .is('ended_at', null)
        .lt('started_at', oneHourAgo.toISOString());
        
      if (error) throw error;
      
      if (orphanedSessions && orphanedSessions.length > 0) {
        console.log(`Found ${orphanedSessions.length} orphaned sessions to clean up`);
        
        // Close each orphaned session, limiting duration to MAX_SESSION_DURATION
        for (const session of orphanedSessions) {
          const startedAt = new Date(session.started_at);
          const endedAt = new Date(startedAt.getTime() + (MAX_SESSION_DURATION * 1000));
          const durationSeconds = MAX_SESSION_DURATION;
          
          await supabase
            .from('task_times')
            .update({
              ended_at: endedAt.toISOString(),
              duration_seconds: durationSeconds
            })
            .eq('id', session.id);
            
          console.log(`Cleaned up orphaned session ${session.id} with max duration of ${MAX_SESSION_DURATION} seconds`);
        }
      }
    } catch (err) {
      console.error('Error cleaning up orphaned sessions:', err);
    }
  };

  // Set up real-time subscription for task_times updates
  useEffect(() => {
    if (!taskId) return;

    const initializeTimer = async () => {
      await cleanupOrphanedSessions();
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

  // Check for ongoing session to resume
  useEffect(() => {
    if (!taskId || !user) return;
    
    const checkOngoingSession = async () => {
      try {
        // First, clean up any orphaned sessions
        await cleanupOrphanedSessions();
        
        // Try to restore from localStorage first
        const { sessionId, startTime } = loadSessionFromStorage();
        
        // If found in local storage, validate it exists in the database
        if (sessionId && startTime) {
          console.log(`Found session in localStorage: ${sessionId}, checking if valid`);
          
          const { data: sessionData, error: sessionError } = await supabase
            .from('task_times')
            .select('id, started_at')
            .eq('id', sessionId)
            .eq('user_id', user.id)
            .is('ended_at', null)
            .single();
          
          if (!sessionError && sessionData) {
            console.log('Session found in database, resuming');
            taskTimeEntryRef.current = sessionId;
            startTimeRef.current = startTime;
            
            // Calculate duration, respecting MAX_SESSION_DURATION
            const now = Date.now();
            const sessionDuration = Math.floor((now - startTime) / 1000);
            const capDuration = Math.min(sessionDuration, MAX_SESSION_DURATION);
            
            currentSessionTimeRef.current = capDuration;
            setIsTracking(true);
            
            if (shouldBeActive(status)) {
              startLocalTimer();
            } else {
              // If we shouldn't be active now, end the previous session
              await stopTracking();
            }
            return;
          } else {
            console.log('Session not found in database, clearing local storage');
            clearSessionFromStorage();
          }
        }
        
        // Check database for any ongoing timer session that hasn't been ended
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
          const sessionId = data[0].id;
          const startTime = new Date(data[0].started_at).getTime();
          
          console.log(`Found ongoing session ${sessionId} in database, resuming`);
          
          taskTimeEntryRef.current = sessionId;
          startTimeRef.current = startTime;
          
          // Calculate duration, respecting MAX_SESSION_DURATION
          const now = Date.now();
          const sessionDuration = Math.floor((now - startTime) / 1000);
          const cappedDuration = Math.min(sessionDuration, MAX_SESSION_DURATION);
          
          currentSessionTimeRef.current = cappedDuration;
          setIsTracking(true);
          
          // Save to localStorage
          saveSessionToStorage();
          
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

  // Set up event listeners for user activity and page visibility
  useEffect(() => {
    // Set up page visibility listener
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Set up user activity listeners
    ['mousedown', 'keydown', 'touchstart', 'scroll'].forEach(event => {
      document.addEventListener(event, handleUserActivity);
    });
    
    // Set up beforeunload handler to save session state
    const handleBeforeUnload = () => {
      if (isTracking) {
        saveSessionToStorage();
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    // Set up activity check interval
    const activityCheckInterval = setInterval(checkUserActivity, 30000);  // Every 30 seconds
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      
      ['mousedown', 'keydown', 'touchstart', 'scroll'].forEach(event => {
        document.removeEventListener(event, handleUserActivity);
      });
      
      window.removeEventListener('beforeunload', handleBeforeUnload);
      clearInterval(activityCheckInterval);
    };
  }, [isTracking, status]);

  // Handle the interval timer for the current user's session
  const startLocalTimer = () => {
    stopLocalTimer();
    
    // Start time tracking interval
    timerRef.current = setInterval(async () => {
      if (startTimeRef.current) {
        const now = Date.now();
        let sessionDuration = Math.floor((now - startTimeRef.current) / 1000);
        
        // Enforce maximum session duration
        if (sessionDuration >= MAX_SESSION_DURATION) {
          console.log(`Session reached maximum duration of ${MAX_SESSION_DURATION} seconds, ending session`);
          stopLocalTimer();
          await endCurrentSession();
          await startTracking(); // Start a new session
          return;
        }
        
        currentSessionTimeRef.current = sessionDuration;
        const totalTime = await fetchAccumulatedTime();
        setElapsedTime(totalTime);
      }
    }, 1000);
    
    // Set up periodic updates to the database (every UPDATE_INTERVAL)
    updateIntervalRef.current = setInterval(async () => {
      if (isTracking && taskTimeEntryRef.current) {
        await updateDatabaseSession();
      }
    }, UPDATE_INTERVAL);
  };

  const stopLocalTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    if (updateIntervalRef.current) {
      clearInterval(updateIntervalRef.current);
      updateIntervalRef.current = null;
    }
  };

  // Update the current session in the database without ending it
  const updateDatabaseSession = async () => {
    if (!taskTimeEntryRef.current || !startTimeRef.current) return;
    
    try {
      const now = Date.now();
      const sessionDuration = Math.floor((now - startTimeRef.current) / 1000);
      
      // Don't update if session is very short
      if (sessionDuration < 5) return;
      
      // Cap the duration at MAX_SESSION_DURATION
      const cappedDuration = Math.min(sessionDuration, MAX_SESSION_DURATION);
      
      console.log(`Updating session ${taskTimeEntryRef.current} in database with current duration: ${cappedDuration}s`);
      
      await supabase
        .from('task_times')
        .update({
          duration_seconds: cappedDuration
        })
        .eq('id', taskTimeEntryRef.current);
    } catch (err) {
      console.error('Error updating session in database:', err);
    }
  };

  // End the current session in the database
  const endCurrentSession = async () => {
    if (!taskTimeEntryRef.current || !startTimeRef.current) return;
    
    try {
      const now = Date.now();
      const sessionDuration = Math.floor((now - startTimeRef.current) / 1000);
      
      // Cap the duration at MAX_SESSION_DURATION
      const cappedDuration = Math.min(sessionDuration, MAX_SESSION_DURATION);
      
      console.log(`Ending session ${taskTimeEntryRef.current} with duration: ${cappedDuration}s`);
      
      await supabase
        .from('task_times')
        .update({
          ended_at: new Date().toISOString(),
          duration_seconds: cappedDuration > 0 ? cappedDuration : null
        })
        .eq('id', taskTimeEntryRef.current);
      
      // Clear local session data
      clearSessionFromStorage();
      currentSessionTimeRef.current = 0;
      startTimeRef.current = null;
      taskTimeEntryRef.current = null;
    } catch (err) {
      console.error('Error ending session:', err);
    }
  };

  // Pause tracking (without ending the session)
  const pauseTracking = () => {
    if (isTracking && !isPaused) {
      stopLocalTimer();
      setIsPaused(true);
      console.log('Timer paused');
    }
  };

  // Resume tracking
  const resumeTracking = () => {
    if (isTracking && isPaused) {
      startLocalTimer();
      setIsPaused(false);
      console.log('Timer resumed');
    }
  };

  // Start tracking time
  const startTracking = async () => {
    if (!user || isTracking || !shouldBeActive(status)) return;

    try {
      console.log(`Starting timer for task ${taskId} with status ${status}`);
      
      // First, check if there's already an open session for this task/user
      const { data: existingSessions, error: checkError } = await supabase
        .from('task_times')
        .select('id')
        .eq('task_id', taskId)
        .eq('user_id', user.id)
        .is('ended_at', null);
        
      if (checkError) throw checkError;
      
      // Close any existing sessions
      if (existingSessions && existingSessions.length > 0) {
        for (const session of existingSessions) {
          await supabase
            .from('task_times')
            .update({
              ended_at: new Date().toISOString(),
              duration_seconds: 0  // Zero duration for these orphaned sessions
            })
            .eq('id', session.id);
        }
        
        console.log(`Closed ${existingSessions.length} orphaned sessions before starting new one`);
      }
      
      // Create new session
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
      setIsPaused(false);
      
      // Save to localStorage
      saveSessionToStorage();
      
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
      setIsPaused(false);
      await endCurrentSession();
      setIsTracking(false);

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
    elapsedTime,
    formattedTime: formatTime(elapsedTime),
    isTracking,
    isPaused,
    pauseTracking,
    resumeTracking
  };
};
