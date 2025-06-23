import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { TaskStatus } from '@/types';
import { toast } from 'sonner';

interface TaskTimerOptions {
  taskId: string;
  isActive: boolean;
  status?: TaskStatus;
}

/**
 * A simple hook for tracking time spent on tasks
 * Tracks time while a task is viewed and accumulates the total
 */
export const useTaskTimer = ({ taskId, isActive, status = 'new' }: TaskTimerOptions) => {
  const { user } = useAuth();
  const [totalTime, setTotalTime] = useState(0); // Total accumulated time in seconds
  const [sessionTime, setSessionTime] = useState(0); // Current session time
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false); // Prevents multiple concurrent operations
  const sessionStartRef = useRef<Date | null>(null); // Current session start timestamp
  const intervalRef = useRef<NodeJS.Timeout | null>(null); // Timer interval reference
  
  // Determine if timer should be active
  const shouldBeActive = (): boolean => {
    const result = isActive && (status === 'new' || status === 'in_progress');
    return result;
  };
  
  // Load saved time on component mount and check for active sessions
  useEffect(() => {
    if (!taskId || !user) return;
    
    const fetchTaskTime = async () => {
      try {
        // Calculate from task_times sessions
        const { data: sessions, error } = await supabase
          .from('task_times')
          .select('duration_seconds')
          .eq('task_id', taskId)
          .not('duration_seconds', 'is', null);
        
        if (error) throw error;
        
        if (sessions?.length) {
          const total = sessions.reduce((sum, session) => 
            sum + (session.duration_seconds || 0), 0);
          setTotalTime(total);
        }

        // Check for any active sessions that weren't properly closed
        const { data: activeSession } = await supabase
          .from('task_times')
          .select('*')
          .eq('task_id', taskId)
          .eq('user_id', user.id)
          .is('ended_at', null)
          .single();
            
        if (activeSession) {
          // We found an active session
          const startTime = new Date(activeSession.started_at);
          const now = new Date();
              
          // If the session is from more than 30 minutes ago, close it
          if (now.getTime() - startTime.getTime() > 30 * 60 * 1000) {
            const duration = Math.floor((now.getTime() - startTime.getTime()) / 1000);
            await closeSession(activeSession.id, duration);
          } else if (shouldBeActive()) {
            // Resume the session
            sessionStartRef.current = startTime;
            setCurrentSessionId(activeSession.id);
            startTimer();
          } else {
            // End the orphaned session
            const duration = Math.floor((now.getTime() - startTime.getTime()) / 1000);
            await closeSession(activeSession.id, duration);
          }
        }
      } catch (err) {
        console.error('Error loading task time data:', err);
      }
    };
    
    fetchTaskTime();
    
    return () => {
      // Clean up timer on unmount
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      
      // End the active session when component unmounts
      if (sessionStartRef.current && currentSessionId) {
        const now = new Date();
        const sessionDuration = Math.floor((now.getTime() - sessionStartRef.current.getTime()) / 1000);
        if (sessionDuration > 1) { // Only save sessions longer than 1 second
          closeSession(currentSessionId, sessionDuration).catch(err => 
            console.error('Error closing session on unmount:', err)
          );
        }
      }
    };
  }, [taskId, user]);  // Added user dependency
  
  // Start or stop timer based on active status and task status
  useEffect(() => {
    if (shouldBeActive()) {
      startSession();
    } else {
      endCurrentSession();
    }
  }, [isActive, status]);
  
  // We don't need the updateTaskTotalTime function anymore since we're not caching in tasks table

  // Close a database session
  const closeSession = async (sessionId: string, duration: number): Promise<void> => {
    if (isUpdating) return;
    setIsUpdating(true);
    
    try {
      const now = new Date();
      
      // Update the session record
      await supabase
        .from('task_times')
        .update({
          ended_at: now.toISOString(),
          duration_seconds: duration
        })
        .eq('id', sessionId);
      
      // Update the total time
      const newTotal = totalTime + duration;
      setTotalTime(newTotal);
      
    } catch (err) {
      console.error(`Error closing session ${sessionId}:`, err);
    } finally {
      setIsUpdating(false);
    }
  };

  // Starts a new timer session
  const startSession = async () => {
    if (!taskId) { // Guard against empty taskId
      return;
    }
    if (!user || sessionStartRef.current || isUpdating) return;
    
    setIsUpdating(true);
    
    try {
      const now = new Date();
      
      // Create session in database
      const { data, error } = await supabase
        .from('task_times')
        .insert({
          task_id: taskId,
          user_id: user.id,
          started_at: now.toISOString()
        })
        .select('id')
        .single();
      
      if (error) throw error;
      
      // Set the session start time and ID
      sessionStartRef.current = now;
      setCurrentSessionId(data.id);
      
      // Start the timer to update UI
      startTimer();
      
      // Update task status to in_progress if it's new
      if (status === 'new') {
        await supabase
          .from('tasks')
          .update({ status: 'in_progress' })
          .eq('id', taskId);
      }
    } catch (err) {
      console.error(`Error starting session for task ${taskId}:`, err);
      toast.error('Fehler beim Starten des Aufgabentimers');
      sessionStartRef.current = null;
    } finally {
      setIsUpdating(false);
    }
  };
  
  // End current session if one exists
  const endCurrentSession = async () => {
    if (!sessionStartRef.current || !currentSessionId) return;
    
    const now = new Date();
    const duration = Math.floor((now.getTime() - sessionStartRef.current.getTime()) / 1000);
    
    // Only count sessions longer than 1 second
    if (duration > 1) {
      await closeSession(currentSessionId, duration);
      
      // Reset session tracking
      sessionStartRef.current = null;
      setCurrentSessionId(null);
      setSessionTime(0);
      
      // Stop the timer
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    } else {
      // Delete short sessions instead of closing them
      if (isUpdating) return;
      setIsUpdating(true);
      
      try {
        // Delete the session record
        await supabase
          .from('task_times')
          .delete()
          .eq('id', currentSessionId);
          
        // Reset session tracking
        sessionStartRef.current = null;
        setCurrentSessionId(null);
        setSessionTime(0);
        
        // Stop the timer
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      } catch (err) {
        console.error(`Error deleting short session ${currentSessionId}:`, err);
      } finally {
        setIsUpdating(false);
      }
    }
  };
  
  // Start the timer for UI updates
  const startTimer = () => {
    // Clear any existing interval first
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    
    // Create new interval to update UI every second
    intervalRef.current = setInterval(() => {
      if (!sessionStartRef.current) return;
      
      const now = new Date();
      const currentSessionTime = Math.floor((now.getTime() - sessionStartRef.current.getTime()) / 1000);
      setSessionTime(currentSessionTime);
    }, 1000);
  };

  // Format seconds into a readable time string (MM:SS or HH:MM:SS)
  const formatTime = (seconds: number): string => {
    if (seconds === 0) return '00:00';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;
    
    const pad = (num: number) => num.toString().padStart(2, '0');
    
    if (hours > 0) {
      return `${hours}:${pad(minutes)}:${pad(remainingSeconds)}`; // HH:MM:SS
    } else {
      return `${pad(minutes)}:${pad(remainingSeconds)}`; // MM:SS
    }
  };

  // Simple minute display for task list (e.g., "5 Minuten")
  const getMinuteDisplay = (): string => {
    const totalSeconds = totalTime + sessionTime;
    if (totalSeconds === 0) return '0 Minuten';
    
    const minutes = Math.ceil(totalSeconds / 60); // Round up to nearest minute
    return `${minutes} ${minutes === 1 ? 'Minute' : 'Minuten'}`;
  };
  
  // Calculate the total seconds (historical + current session)
  const getTotalSeconds = (): number => {
    return totalTime + sessionTime;
  };

  return {
    elapsedTime: getTotalSeconds(),
    formattedTime: formatTime(getTotalSeconds()),
    minuteDisplay: getMinuteDisplay(),
    isTracking: !!sessionStartRef.current,
    totalTimeSeconds: getTotalSeconds()
  };
};
