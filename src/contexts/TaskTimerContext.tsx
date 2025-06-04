import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

// Define types
export interface TaskTimeEntry {
  id: string;
  task_id: string;
  user_id: string;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
}

export interface TaskTimerContextType {
  // Get accumulated time for a task
  getTaskTime: (taskId: string | null) => number;
  
  // Time management functions
  startTimer: (taskId: string) => Promise<void>;
  stopTimer: (taskId: string) => Promise<void>;
  
  // Active task tracking
  isTimerActive: (taskId: string | null) => boolean;
  activeTaskId: string | null;
  
  // Cache management
  refreshTaskTime: (taskId: string) => Promise<number>;
}

// Create the context
const TaskTimerContext = createContext<TaskTimerContextType | undefined>(undefined);

// Provider props
interface TaskTimerProviderProps {
  children: ReactNode;
}

export const TaskTimerProvider: React.FC<TaskTimerProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [activeTimerEntryId, setActiveTimerEntryId] = useState<string | null>(null);
  const [timeCache, setTimeCache] = useState<Record<string, number>>({});
  
  // Initialize and check for any ongoing timer sessions
  useEffect(() => {
    if (!user) return;
    
    const checkForActiveTimers = async () => {
      try {
        // Look for any timer entries that haven't been ended for this user
        const { data, error } = await supabase
          .from('task_times')
          .select('id, task_id')
          .eq('user_id', user.id)
          .is('ended_at', null)
          .order('started_at', { ascending: false })
          .limit(1);
          
        if (error) throw error;
        
        if (data && data.length > 0) {
          // Found an active timer
          setActiveTaskId(data[0].task_id);
          setActiveTimerEntryId(data[0].id);
          console.log(`Restored active timer for task ${data[0].task_id}`);
        }
      } catch (err) {
        console.error('Error checking for active timers:', err);
      }
    };
    
    checkForActiveTimers();
  }, [user]);
  
  // Set up real-time subscription for task_times updates
  useEffect(() => {
    if (!user) return;
    
    // Create a channel to listen for changes to task_times
    const channel = supabase
      .channel('task_timer_updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'task_times'
        },
        async (payload) => {
          // When a task_time entry changes, refresh the cache for that task
          const taskId = payload.new?.task_id;
          if (taskId) {
            await calculateTotalTime(taskId);
          }
        }
      )
      .subscribe();
      
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);
  
  // Calculate total time for a task from all users and sessions
  const calculateTotalTime = async (taskId: string): Promise<number> => {
    try {
      // Get all completed time entries for this task
      const { data: entries, error } = await supabase
        .from('task_times')
        .select('duration_seconds')
        .eq('task_id', taskId)
        .not('duration_seconds', 'is', null);
        
      if (error) throw error;
      
      // Sum up all durations
      const totalSeconds = entries?.reduce((sum, entry) => 
        sum + (entry.duration_seconds || 0), 0) || 0;
      
      // Update the cache
      setTimeCache((prev) => ({
        ...prev,
        [taskId]: totalSeconds
      }));
      
      // Also update the tasks table with the cached time for efficiency
      await supabase
        .from('tasks')
        .update({ total_time_seconds: totalSeconds })
        .eq('id', taskId);
      
      return totalSeconds;
    } catch (err) {
      console.error(`Error calculating total time for task ${taskId}:`, err);
      return timeCache[taskId] || 0;
    }
  };
  
  // Get the accumulated time for a task
  const getTaskTime = (taskId: string | null): number => {
    if (!taskId) return 0;
    return timeCache[taskId] || 0;
  };
  
  // Refresh and return the task time
  const refreshTaskTime = async (taskId: string): Promise<number> => {
    return await calculateTotalTime(taskId);
  };
  
  // Check if a timer is active for a specific task
  const isTimerActive = (taskId: string | null): boolean => {
    return taskId !== null && activeTaskId === taskId;
  };
  
  // Start a timer for a task
  const startTimer = async (taskId: string): Promise<void> => {
    if (!user) {
      toast.error("Sie müssen angemeldet sein, um die Zeitmessung zu starten");
      return;
    }
    
    if (activeTaskId && activeTaskId !== taskId) {
      // Stop the current timer before starting a new one
      await stopTimer(activeTaskId);
    }
    
    try {
      // Create a new timer entry
      const { data, error } = await supabase
        .from('task_times')
        .insert({
          task_id: taskId,
          user_id: user.id,
          started_at: new Date().toISOString()
        })
        .select('id')
        .single();
      
      if (error) throw error;
      
      // Update the active task
      setActiveTaskId(taskId);
      setActiveTimerEntryId(data.id);
      
      // Update task status to 'in_progress' if it's not already
      await supabase
        .from('tasks')
        .update({ status: 'in_progress' })
        .eq('id', taskId)
        .eq('status', 'new');
        
    } catch (err) {
      console.error(`Error starting timer for task ${taskId}:`, err);
      toast.error("Fehler beim Starten der Zeitmessung");
    }
  };
  
  // Stop a timer for a task
  const stopTimer = async (taskId: string): Promise<void> => {
    if (!activeTimerEntryId || activeTaskId !== taskId) return;
    
    try {
      const now = new Date();
      
      // Get the current timer entry to calculate duration
      const { data: entry, error: fetchError } = await supabase
        .from('task_times')
        .select('started_at')
        .eq('id', activeTimerEntryId)
        .single();
      
      if (fetchError) throw fetchError;
      
      // Calculate duration in seconds
      const startTime = new Date(entry.started_at);
      const durationSeconds = Math.floor((now.getTime() - startTime.getTime()) / 1000);
      
      // Update the timer entry with end time and duration
      const { error: updateError } = await supabase
        .from('task_times')
        .update({
          ended_at: now.toISOString(),
          duration_seconds: durationSeconds
        })
        .eq('id', activeTimerEntryId);
        
      if (updateError) throw updateError;
      
      // Clear active timer state
      setActiveTaskId(null);
      setActiveTimerEntryId(null);
      
      // Refresh the total time for this task
      await calculateTotalTime(taskId);
      
    } catch (err) {
      console.error(`Error stopping timer for task ${taskId}:`, err);
      toast.error("Fehler beim Stoppen der Zeitmessung");
    }
  };
  
  // Context value
  const value: TaskTimerContextType = {
    getTaskTime,
    startTimer,
    stopTimer,
    isTimerActive,
    activeTaskId,
    refreshTaskTime
  };
  
  return (
    <TaskTimerContext.Provider value={value}>
      {children}
    </TaskTimerContext.Provider>
  );
};

// Hook to use the timer context
export const useTaskTimerContext = (): TaskTimerContextType => {
  const context = useContext(TaskTimerContext);
  
  if (context === undefined) {
    throw new Error('useTaskTimerContext must be used within a TaskTimerProvider');
  }
  
  return context;
};
