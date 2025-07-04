import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { SessionManager } from '@/utils/SessionManager';

// Define context types
export interface TaskSessionContextType {
  // Time tracking data
  getTaskTotalDuration: (taskId: string) => Promise<number>;
  getFormattedTime: (taskId: string) => string;
  
  // Active task tracking
  isTaskActive: (taskId: string) => boolean;
  activeTaskId: string | null;
}

// Create context
const TaskSessionContext = createContext<TaskSessionContextType | undefined>(undefined);

// Provider props
interface TaskSessionProviderProps {
  children: ReactNode;
}

// Format seconds into "Zeit: MM:SS" or "Zeit: HH:MM:SS" format
export const formatDuration = (seconds: number): string => {
  if (seconds === 0) return 'Zeit: 00:00';
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;
  
  const pad = (num: number) => num.toString().padStart(2, '0');
  
  if (hours > 0) {
    return `Zeit: ${hours}:${pad(minutes)}:${pad(remainingSeconds)}`; // HH:MM:SS
  } else {
    return `Zeit: ${pad(minutes)}:${pad(remainingSeconds)}`; // MM:SS
  }
};

export const TaskSessionProvider: React.FC<TaskSessionProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const [sessionManager] = useState(() => new SessionManager());
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [taskDurations, setTaskDurations] = useState<Record<string, number>>({});
  
  // Set up real-time listeners for task duration updates
  useEffect(() => {
    // Subscribe to task_sessions table for new/updated sessions
    const channel = supabase
      .channel('task_sessions_updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'task_sessions'
        },
        async (payload) => {
          // When a session is updated/created/deleted, refresh the task's duration
          const newData = payload.new as { task_id?: string } | null;
          if (newData && newData.task_id) {
            const taskId = newData.task_id;
            
            try {
              // Call RPC to recalculate total duration
              const { data, error } = await supabase
                .rpc('calculate_task_total_duration', { task_id: taskId });
                
              if (!error && data !== null) {
                // Update local state with new duration
                setTaskDurations(prev => ({
                  ...prev,
                  [taskId]: data
                }));
                
                // Log success for debugging
                console.log(`Updated task ${taskId} duration to ${data} seconds`);
              } else if (error) {
                console.error('Error calculating task duration via RPC:', error);
                
                // Fallback: fetch task duration directly
                fetchTaskDuration(taskId);
              }
            } catch (err) {
              console.error('Error updating task duration:', err);
              // Fallback: fetch task duration directly
              fetchTaskDuration(taskId);
            }
          }
        }
      )
      .subscribe();
    
    // Subscribe to tasks table for direct updates to total_duration_seconds
    const tasksChannel = supabase
      .channel('task_duration_updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'tasks',
          filter: 'total_duration_seconds=neq.null'
        },
        async (payload) => {
          const newData = payload.new as any;
          
          if (newData?.id && newData?.total_duration_seconds !== undefined) {
            setTaskDurations(prev => ({
              ...prev,
              [newData.id]: newData.total_duration_seconds
            }));
            console.log(`Received task duration update for ${newData.id}: ${newData.total_duration_seconds} seconds`);
          }
        }
      )
      .subscribe();
      
    return () => {
      // Clean up subscriptions
      supabase.removeChannel(channel);
      supabase.removeChannel(tasksChannel);
    };
  }, []);
  
  // Set up API endpoint for session termination
  useEffect(() => {
    // Create an API endpoint for synchronous XMLHttpRequest calls during page unload
    const createApiEndpoint = async () => {
      try {
        // Check if we need to create the API endpoint (only in browser)
        if (typeof window !== 'undefined' && !window.customEndSessionApiCreated) {
          const endSessionHandler = async (req: Request) => {
            if (req.method === 'POST') {
              try {
                const body = await req.json();
                const { sessionId, taskId, endTime, durationSeconds } = body;
                
                if (sessionId && taskId && endTime && durationSeconds) {
                  // Update the session with end time and duration
                  await supabase
                    .from('task_sessions')
                    .update({
                      end_time: endTime,
                      duration_seconds: durationSeconds
                    })
                    .eq('id', sessionId);
                    
                  // Update task's total_duration_seconds using RPC
                  await supabase
                    .rpc('calculate_task_total_duration', { task_id: taskId });
                    
                  return new Response(JSON.stringify({ success: true }), { 
                    status: 200,
                    headers: { 'Content-Type': 'application/json' }
                  });
                }
              } catch (error) {
                console.error('Error processing end-session request:', error);
              }
            }
            
            return new Response(JSON.stringify({ success: false }), { 
              status: 400,
              headers: { 'Content-Type': 'application/json' }
            });
          };
          
          // Register API route handler if using Next.js API routes
          if (typeof window !== 'undefined' && !window.customEndSessionApiCreated) {
            window.customEndSessionApiCreated = true;
            
            // Mock endpoint for XMLHttpRequest during unload
            // This will be replaced with proper Next.js API route
            const originalOpen = XMLHttpRequest.prototype.open;
            XMLHttpRequest.prototype.open = function(method, url, ...args) {
              if (url === `${window.location.origin}/api/end-session` && method === 'POST') {
                // Intercept the XMLHttpRequest and mock the API endpoint
                this.customEndpointMock = true;
                originalOpen.call(this, method, url, ...args);
              } else {
                originalOpen.call(this, method, url, ...args);
              }
            };
            
            const originalSend = XMLHttpRequest.prototype.send;
            XMLHttpRequest.prototype.send = function(body) {
              if (this.customEndpointMock) {
                // Mock the response for the end-session API
                setTimeout(() => {
                  try {
                    // Parse the request body
                    const parsedBody = typeof body === 'string' ? JSON.parse(body) : null;
                    if (!parsedBody) {
                      throw new Error('Invalid body format');
                    }
                    
                    const { sessionId, taskId, endTime, durationSeconds } = parsedBody;
                    
                    // Update the session in Supabase
                    supabase
                      .from('task_sessions')
                      .update({
                        end_time: endTime,
                        duration_seconds: durationSeconds
                      })
                      .eq('id', sessionId)
                      .then(() => {
                        // Update task's total_duration_seconds
                        return supabase
                          .rpc('calculate_task_total_duration', { task_id: taskId });
                      })
                      .then(null, err => console.error('Error in mocked end-session:', err));
                    
                    this.status = 200;
                    this.readyState = 4;
                    this.responseText = JSON.stringify({ success: true });
                    if (typeof this.onreadystatechange === 'function') {
                      this.onreadystatechange();
                    }
                  } catch (err) {
                    console.error('Error processing mocked end-session:', err);
                    this.status = 400;
                    this.readyState = 4;
                    this.responseText = JSON.stringify({ success: false });
                    if (typeof this.onreadystatechange === 'function') {
                      this.onreadystatechange();
                    }
                  }
                }, 0);
              } else {
                originalSend.call(this, body);
              }
            };
          }
        }
      } catch (err) {
        console.error('Error creating API endpoint:', err);
      }
    };
    
    createApiEndpoint();
  }, []);
  
  // Fetch task duration directly from the tasks table
  const fetchTaskDuration = async (taskId: string): Promise<number> => {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('total_duration_seconds')
        .eq('id', taskId)
        .single();
        
      if (error) throw error;
      
      const duration = data?.total_duration_seconds || 0;
      
      // Update cache
      setTaskDurations(prev => ({
        ...prev,
        [taskId]: duration
      }));
      
      return duration;
    } catch (err) {
      console.error('Error fetching task duration directly:', err);
      return 0;
    }
  };
  
  // Get total duration for a task
  const getTaskTotalDuration = async (taskId: string): Promise<number> => {
    if (taskDurations[taskId] !== undefined) {
      return taskDurations[taskId];
    }
    
    try {
      // First try to use the RPC function
      const { data, error } = await supabase
        .rpc('calculate_task_total_duration', { task_id: taskId });
        
      if (!error && data !== null) {
        // Update cache
        setTaskDurations(prev => ({
          ...prev,
          [taskId]: data
        }));
        
        return data;
      }
      
      // If RPC fails, fall back to direct query
      return await fetchTaskDuration(taskId);
    } catch (err) {
      console.error('Error in getTaskTotalDuration:', err);
      // Fall back to SessionManager method as a last resort
      const duration = await sessionManager.getTaskTotalDuration(taskId);
      
      // Update cache
      setTaskDurations(prev => ({
        ...prev,
        [taskId]: duration
      }));
      
      return duration;
    }
  };
  
  // Format task duration as MM:SS or HH:MM:SS
  const getFormattedTime = (taskId: string): string => {
    const duration = taskDurations[taskId] || 0;
    return formatDuration(duration);
  };
  
  // Check if a task is currently active
  const isTaskActive = (taskId: string): boolean => {
    return activeTaskId === taskId;
  };
  
  // Set up task session when user opens a task
  const activateTask = async (taskId: string) => {
    if (!user || !taskId || activeTaskId === taskId) return;
    
    // If there's already an active task, deactivate it first
    if (activeTaskId) {
      await sessionManager.endSession();
    }
    
    // Start a new session
    const success = await sessionManager.startSession(taskId, user.id);
    
    if (success) {
      setActiveTaskId(taskId);
      
      // Prefetch the duration
      getTaskTotalDuration(taskId);
    }
  };
  
  // End task session when user navigates away
  const deactivateTask = async () => {
    if (!activeTaskId) return;
    
    await sessionManager.endSession();
    setActiveTaskId(null);
  };
  
  // Context value
  const value: TaskSessionContextType = {
    getTaskTotalDuration,
    getFormattedTime,
    isTaskActive,
    activeTaskId
  };
  
  return (
    <TaskSessionContext.Provider value={value}>
      {children}
    </TaskSessionContext.Provider>
  );
};

// Define window type for custom properties
declare global {
  interface Window {
    customEndSessionApiCreated?: boolean;
  }
}

// Custom hook to use TaskSessionContext
export const useTaskSession = () => {
  const context = useContext(TaskSessionContext);
  
  if (context === undefined) {
    throw new Error('useTaskSession must be used within a TaskSessionProvider');
  }
  
  return context;
};

// Hook to track time for a specific task
export const useTaskSessionTracker = (taskId: string | null, isActive: boolean = true) => {
  const { user } = useAuth();
  const [sessionManager] = useState(() => new SessionManager());
  const [totalDuration, setTotalDuration] = useState(0);
  
  // Fetch task total duration directly from the database
  const fetchTotalDuration = useCallback(async (taskId: string) => {
    try {
      // Try to fetch from tasks table first (most reliable source of truth)
      const { data, error } = await supabase
        .from('tasks')
        .select('total_duration_seconds')
        .eq('id', taskId)
        .single();
      
      if (!error && data && data.total_duration_seconds !== null) {
        console.log(`Fetched total duration for task ${taskId}: ${data.total_duration_seconds}s`);
        setTotalDuration(data.total_duration_seconds);
        return;
      }
      
      // Fallback: Calculate using RPC function
      const { data: rpcData, error: rpcError } = await supabase
        .rpc('calculate_task_total_duration', { task_id: taskId });
      
      if (!rpcError && rpcData !== null) {
        console.log(`Calculated total duration for task ${taskId} via RPC: ${rpcData}s`);
        setTotalDuration(rpcData);
        return;
      }
      
      console.error('Error fetching task duration:', error || rpcError);
    } catch (err) {
      console.error('Exception in fetchTotalDuration:', err);
    }
  }, []);
  
  // Start/end session when task becomes active/inactive
  useEffect(() => {
    if (!user || !taskId) return;
    
    const handleTaskActivation = async () => {
      if (isActive) {
        // Start session when component mounts and task is active
        await sessionManager.startSession(taskId, user.id);
        
        // Always fetch total duration to ensure we're showing accumulated time from all users
        await fetchTotalDuration(taskId);
      }
    };
    
    handleTaskActivation();
    
    // Cleanup: end session when component unmounts or task becomes inactive
    return () => {
      if (sessionManager.isSessionActive() && sessionManager.getCurrentTaskId() === taskId) {
        sessionManager.endSession().then(async () => {
          // Update total duration after ending session
          if (taskId) {
            await fetchTotalDuration(taskId);
          }
        });
      }
    };
  }, [taskId, isActive, user, fetchTotalDuration, sessionManager]);
  
  // Listen for task_sessions table changes to update duration
  useEffect(() => {
    if (!taskId) return;
    
    // Set up initial duration
    fetchTotalDuration(taskId);
    
    const channel = supabase
      .channel(`task_session_${taskId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'task_sessions',
          filter: `task_id=eq.${taskId}`
        },
        async () => {
          // Refresh duration when ANY session changes for this task
          await fetchTotalDuration(taskId);
        }
      )
      .subscribe();
      
    // Also listen for task total_duration_seconds updates
    const tasksChannel = supabase
      .channel(`task_duration_${taskId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'tasks',
          filter: `id=eq.${taskId}`
        },
        async (payload) => {
          const newData = payload.new as { total_duration_seconds?: number } | null;
          
          if (newData?.total_duration_seconds !== undefined) {
            console.log(`Received task update for ${taskId}: ${newData.total_duration_seconds}s`);
            setTotalDuration(newData.total_duration_seconds);
          }
        }
      )
      .subscribe();
      
    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(tasksChannel);
    };
  }, [taskId, fetchTotalDuration]);
  
  // Format duration as MM:SS or HH:MM:SS
  const formattedTime = formatDuration(totalDuration);
  
  return {
    totalDuration,
    formattedTime,
    refreshDuration: () => taskId && fetchTotalDuration(taskId)
  };
};
