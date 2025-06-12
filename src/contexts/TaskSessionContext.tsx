import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';
import { toast } from 'sonner';

// Temporary workaround for Supabase types until migration is applied
import { Database } from '@/integrations/supabase/types';
type Tables = Database['public']['Tables'];
declare module '@supabase/supabase-js' {
  interface SupabaseClient {
    from<T extends string>(table: T): any;
  }
}

// Interface for a task session
export interface TaskSession {
  id: string;
  task_id: string;
  user_id: string;
  start_time: string;
  end_time?: string | null;
  duration_seconds?: number | null;
  created_at: string;
}

// Interface for task time tracking
export interface TaskTime {
  id: string;
  task_id: string;
  user_id: string;
  start_time: string;
  end_time?: string | null;
  duration_seconds?: number | null;
  created_at: string;
}

// Interface for the context value
interface TaskSessionContextValue {
  activeTaskId: string | null;
  activeSessionId: string | null;
  sessionsCache: Record<string, TaskSession[]>;
  startSession: (taskId: string) => Promise<string | null>;
  endSession: (sessionId: string, taskId?: string) => Promise<void>;
  getTaskTotalTime: (taskId: string) => Promise<number>;
  formatTime: (seconds: number) => string;
  isSessionActive: (taskId: string) => boolean;
  refreshTaskSessions: (taskId: string) => Promise<void>;
  setIsInTaskDetail: (isIn: boolean, taskId?: string) => void;
  isInTaskDetail: boolean;
}

// Create the context
export const TaskSessionContext = createContext<TaskSessionContextValue | undefined>(undefined);

// Props for the provider component
interface TaskSessionProviderProps {
  children: ReactNode;
}

export const TaskSessionProvider: React.FC<TaskSessionProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [sessionsCache, setSessionsCache] = useState<Record<string, TaskSession[]>>({});
  const [isInTaskDetail, setIsInTaskDetail] = useState<boolean>(false);
  
  // Function to start a new session for a task
  const startSession = async (taskId: string): Promise<string | null> => {
    if (!user || !taskId) return null;
    
    try {
      // First, check if we already have an active session for this task in our state
      if (activeTaskId === taskId && activeSessionId) {
        console.log(`Task ${taskId} already has an active session ${activeSessionId} in state`);
        return activeSessionId;
      }
      
      // Next, check for sessions in the database that might not be properly closed
      // This handles cases where the browser crashed or user closed the tab without proper cleanup
      const { data: existingSessions, error: queryError } = await supabase
        .from('task_times')
        .select('id')
        .eq('task_id', taskId)
        .eq('user_id', user.id)
        .is('end_time', null);
        
      if (queryError) {
        console.warn('Error checking for existing sessions:', queryError);
      } else if (existingSessions && existingSessions.length > 0) {
        // Found orphaned sessions, use the most recent one
        const sessionId = existingSessions[0].id;
        console.log(`Found orphaned session ${sessionId} for task ${taskId}, reusing it`);
        setActiveTaskId(taskId);
        setActiveSessionId(sessionId);
        return sessionId;
      }
      
      // No active or orphaned sessions found, create a new one
      const { data: session, error } = await supabase
        .from('task_times')
        .insert({
          task_id: taskId,
          user_id: user.id,
          start_time: new Date().toISOString(),
        })
        .select()
        .single();
      
      if (error) {
        throw error;
      }
      
      if (session) {
        setActiveTaskId(taskId);
        setActiveSessionId(session.id);
        console.log(`Started new session ${session.id} for task ${taskId}`);
        return session.id;
      }
      
      return null;
    } catch (error) {
      console.error('Error starting task session:', error);
      toast.error('Failed to start task session');
      return null;
    }
  };
  
  // Function to end a session
  const endSession = async (sessionId: string, taskId: string): Promise<void> => {
    if (!sessionId || !taskId) return;
    
    try {
      const now = new Date();
      
      // Get the session to calculate duration
      const { data: session, error: fetchError } = await supabase
        .from('task_times')
        .select('*')
        .eq('id', sessionId)
        .single();
        
      if (fetchError) throw fetchError;
      
      // Calculate duration
      const startTime = new Date(session.start_time).getTime();
      const endTime = now.getTime();
      const durationSeconds = Math.round((endTime - startTime) / 1000);
      
      // Update the session
      const { error: updateError } = await supabase
        .from('task_times')
        .update({
          end_time: now.toISOString(),
          duration_seconds: durationSeconds > 0 ? durationSeconds : 0
        })
        .eq('id', sessionId);
        
      if (updateError) throw updateError;
      
      console.log(`Ended session ${sessionId} for task ${taskId} with duration ${durationSeconds}s`);
      
      // Update total duration in tasks table for efficiency
      const { data: taskData, error: taskFetchError } = await supabase
        .from('tasks')
        .select('total_duration_seconds')
        .eq('id', taskId)
        .single();
        
      if (!taskFetchError && taskData) {
        const currentTotal = taskData.total_duration_seconds || 0;
        const newTotal = currentTotal + durationSeconds;
        
        const { error: taskUpdateError } = await supabase
          .from('tasks')
          .update({
            total_duration_seconds: newTotal
          })
          .eq('id', taskId);
          
        if (taskUpdateError) {
          console.error('Error updating task total duration:', taskUpdateError);
        }
      }
      
      // Reset active session if this was the active one
      if (sessionId === activeSessionId) {
        setActiveTaskId(null);
        setActiveSessionId(null);
      }
      
      // Update cache
      await refreshTaskSessions(taskId);
    } catch (error) {
      console.error('Error ending task session:', error);
      toast.error('Fehler beim Beenden der Zeitmessung');
    }
  };
  
  // Function to get all sessions for a task
  const refreshTaskSessions = async (taskId: string): Promise<void> => {
    if (!taskId) return;
    
    try {
      const { data: sessions, error } = await supabase
        .from('task_times')
        .select('*')
        .eq('task_id', taskId)
        .order('start_time', { ascending: true });
        
      if (error) throw error;
      
      // Update cache
      setSessionsCache(prevCache => ({
        ...prevCache,
        [taskId]: sessions || []
      }));
    } catch (error) {
      console.error('Error refreshing task sessions:', error);
    }
  };
  
  // Get total time for a task from the tasks table, fallback to calculating from sessions if needed
  const getTaskTotalTime = async (taskId: string): Promise<number> => {
    if (!taskId) return 0;
    
    try {
      // First try to get the total_duration_seconds from the tasks table
      const { data: taskData, error: taskError } = await supabase
        .from('tasks')
        .select('total_duration_seconds')
        .eq('id', taskId)
        .single();
        
      if (taskError) {
        console.error('Error fetching task total duration:', taskError);
      } else if (taskData && taskData.total_duration_seconds !== null) {
        // If there's an active session, add its current duration too
        let activeSessionDuration = 0;
        if (activeTaskId === taskId && activeSessionId) {
          const { data: activeSession } = await supabase
            .from('task_sessions')
            .select('start_time')
            .eq('id', activeSessionId)
            .single();
            
          if (activeSession) {
            const startTime = new Date(activeSession.start_time).getTime();
            const currentTime = new Date().getTime();
            activeSessionDuration = Math.floor((currentTime - startTime) / 1000);
          }
        }
        
        return taskData.total_duration_seconds + (activeSessionDuration > 0 ? activeSessionDuration : 0);
      }
      
      // Fallback: Calculate from sessions if task data isn't available
      if (!sessionsCache[taskId]) {
        await refreshTaskSessions(taskId);
      }
      
      if (!sessionsCache[taskId]) return 0;
      
      const sessions = sessionsCache[taskId];
      let totalSeconds = 0;

      sessions.forEach(session => {
        // If session has a duration, add it
        if (session.duration_seconds) {
          totalSeconds += session.duration_seconds;
        }
        // If session is still active, calculate current duration
        else if (session.id === activeSessionId && !session.end_time) {
          const startTime = new Date(session.start_time).getTime();
          const currentTime = new Date().getTime();
          const currentDuration = Math.floor((currentTime - startTime) / 1000);
          totalSeconds += currentDuration > 0 ? currentDuration : 0;
        }
      });

      return totalSeconds;
    } catch (error) {
      console.error('Error in getTaskTotalTime:', error);
      return 0;
    }
  };
  
  // Format seconds to HH:MM:SS
  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  
  // Check if a task has an active session
  const isSessionActive = (taskId: string): boolean => {
    return activeTaskId === taskId && activeSessionId !== null;
  };
  
  // Handle window focus/blur events to pause/resume session tracking
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (!activeSessionId || !activeTaskId) return;
      
      if (document.visibilityState === 'hidden') {
        // Page is hidden, end current session
        console.log('Page hidden, ending active session');
        await endSession(activeSessionId, activeTaskId);
      } else if (document.visibilityState === 'visible' && activeTaskId) {
        // Page is visible again, start a new session for the previously active task
        console.log('Page visible, starting new session');
        await startSession(activeTaskId);
      }
    };
    
    // Listen for visibility changes
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [activeSessionId, activeTaskId]);
  
  // Handle cleanup on unmount
  useEffect(() => {
    return () => {
      if (activeSessionId && activeTaskId) {
        // End the active session when the component unmounts
        endSession(activeSessionId, activeTaskId);
      }
    };
  }, []);
  
  // Function to set whether we're currently in the TaskDetail component
  const handleIsInTaskDetail = (isIn: boolean, taskId?: string) => {
    console.log(`Setting isInTaskDetail to ${isIn}${taskId ? ` for task ${taskId}` : ''}`);
    setIsInTaskDetail(isIn);
    
    if (isIn && taskId) {
      // When entering TaskDetail, we can also set the active task ID
      setActiveTaskId(taskId);
    } else if (!isIn && activeTaskId) {
      // When leaving TaskDetail, we can end the current session
      if (activeSessionId) {
        endSession(activeSessionId, activeTaskId);
      }
      setActiveTaskId(null);
    }
  };

  const contextValue: TaskSessionContextValue = {
    activeTaskId,
    activeSessionId,
    sessionsCache,
    startSession,
    endSession,
    getTaskTotalTime,
    formatTime,
    isSessionActive,
    refreshTaskSessions,
    setIsInTaskDetail: handleIsInTaskDetail,
    isInTaskDetail
  };
  
  return (
    <TaskSessionContext.Provider value={contextValue}>
      {children}
    </TaskSessionContext.Provider>
  );
};

// Custom hook to use the TaskSession context
export const useTaskSessionContext = () => {
  const context = useContext(TaskSessionContext);
  
  if (context === undefined) {
    throw new Error('useTaskSessionContext must be used within a TaskSessionProvider');
  }
  
  return context;
};
