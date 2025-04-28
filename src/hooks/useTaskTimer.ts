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

  // Cleanup orphaned sessions on initial load
  useEffect(() => {
    if (user && taskId) {
      cleanupOrphanedSessions();
    }
  }, [user, taskId]);

  // Cleanup orphaned sessions for this user and task
  const cleanupOrphanedSessions = async () => {
    if (!user || !taskId) return;

    try {
      const { data, error } = await supabase
        .from('task_times')
        .select('id, started_at')
        .eq('task_id', taskId)
        .eq('user_id', user.id)
        .is('ended_at', null)
        .order('started_at', { ascending: false });

      if (error) {
        console.error('Error fetching orphaned sessions:', error);
        return;
      }

      if (data && data.length > 0) {
        console.log(`Found ${data.length} orphaned session(s) for task ${taskId}`);
        
        // For sessions older than 1 hour, auto-close them with a maximum duration of 30 minutes
        const oneHourAgo = new Date();
        oneHourAgo.setHours(oneHourAgo.getHours() - 1);
        
        for (const session of data) {
          const startedAt = new Date(session.started_at);
          
          // Skip the most recent session if it's less than an hour old
          if (data.indexOf(session) === 0 && startedAt > oneHourAgo) {
            console.log(`Keeping recent session ${session.id} active`);
            continue;
          }
          
          // Calculate duration - cap at 30 minutes for orphaned sessions
          const endTime = new Date(startedAt);
          endTime.setMinutes(startedAt.getMinutes() + 30); // Max 30 minutes
          
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

  // Start tracking time for a task
  const startTracking = async () => {
    if (!user || isTracking) return;

    try {
      console.log('Starting time tracking for task:', taskId);
      
      // First check if there's any existing active session for this task
      const { data: existingSessions } = await supabase
        .from('task_times')
        .select('id, started_at')
        .eq('task_id', taskId)
        .eq('user_id', user.id)
        .is('ended_at', null)
        .order('started_at', { ascending: false })
        .limit(1);

      // If there's an existing session, use it instead of creating a new one
      if (existingSessions && existingSessions.length > 0) {
        console.log(`Resuming existing session for task ${taskId}: ${existingSessions[0].id}`);
        taskTimeEntryRef.current = existingSessions[0].id;
        const startTime = new Date(existingSessions[0].started_at).getTime();
        startTimeRef.current = startTime;
        
        // Calculate elapsed time since the session was started
        const currentElapsed = Math.floor((Date.now() - startTime) / 1000);
        setElapsedTime(currentElapsed);
      } else {
        console.log(`Starting new time tracking for task ${taskId}`);
        
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
        setElapsedTime(0);
      }
      
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
    console.log('Stopping tracking, isTracking:', isTracking, 'taskTimeEntryRef:', taskTimeEntryRef.current);
    
    if (!isTracking || !taskTimeEntryRef.current) return;

    try {
      console.log(`Stopping time tracking for task ${taskId}, entry ${taskTimeEntryRef.current}`);
      
      // Clear interval
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      // Calculate duration in seconds
      const seconds = elapsedTime > 0 ? elapsedTime : 
        (startTimeRef.current ? Math.floor((Date.now() - startTimeRef.current) / 1000) : 0);
      
      // Only save if duration is greater than 0
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
        
        // Clean up zero-duration sessions
        const { error } = await supabase
          .from('task_times')
          .delete()
          .eq('id', taskTimeEntryRef.current);
          
        if (error) {
          console.error('Error deleting zero-duration entry:', error);
        }
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

  // Effect for handling page unload/navigation events
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (isTracking && taskTimeEntryRef.current) {
        // Synchronous DB update not possible in beforeunload
        // Instead, store the fact that we need to close this session
        // A cleanup function will handle it on next visit
        localStorage.setItem(`task_timer_${taskId}_${taskTimeEntryRef.current}`, 
          JSON.stringify({
            entryId: taskTimeEntryRef.current,
            endTime: new Date().toISOString(),
            duration: elapsedTime
          })
        );
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isTracking, taskId, taskTimeEntryRef.current, elapsedTime]);

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
      console.log('Timer effect cleanup triggered');
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
