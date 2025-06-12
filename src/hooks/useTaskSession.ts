import { useState, useEffect, useCallback } from 'react';
import { useTaskSessionContext } from '@/contexts/TaskSessionContext';

interface TaskSessionResult {
  totalTimeSeconds: number;
  formattedTotalTime: string;
  isTracking: boolean;
  startTracking: () => Promise<void>;
  stopTracking: () => Promise<void>;
  refreshSessions: () => Promise<void>;
  setIsInTaskDetail: (isIn: boolean, taskId?: string) => void;
  lastUpdateTime: string;
}

export const useTaskSession = (taskId?: string): TaskSessionResult => {
  const {
    startSession,
    endSession,
    getTaskTotalTime,
    formatTime,
    isSessionActive,
    activeSessionId,
    refreshTaskSessions,
    setIsInTaskDetail
  } = useTaskSessionContext();
  
  const [totalTimeSeconds, setTotalTimeSeconds] = useState<number>(0);
  const [formattedTotalTime, setFormattedTotalTime] = useState<string>('00:00:00');
  const [isTracking, setIsTracking] = useState<boolean>(false);
  const [lastUpdateTime, setLastUpdateTime] = useState<string>('');
  const [sessionCount, setSessionCount] = useState<number>(0);
  
  // Start tracking time for the task
  const startTracking = useCallback(async () => {
    if (!taskId) return;
    
    // Check if already tracking this task
    if (isTracking || isSessionActive(taskId)) {
      console.log(`Already tracking task ${taskId}, skipping session creation`);
      setIsTracking(true);
      return;
    }
    
    console.log(`Creating new session for task ${taskId}`);
    const sessionId = await startSession(taskId);
    if (sessionId) {
      setIsTracking(true);
    }
  }, [taskId, startSession, isSessionActive, isTracking]);
  
  // Stop tracking time for the task
  const stopTracking = useCallback(async () => {
    if (!taskId || !activeSessionId) return;
    
    await endSession(activeSessionId, taskId);
    setIsTracking(false);
  }, [taskId, activeSessionId, endSession]);
  
  // Refresh sessions for the task
  const refreshSessions = useCallback(async () => {
    if (!taskId) return;
    await refreshTaskSessions(taskId);
  }, [taskId, refreshTaskSessions]);
  
  // Update total time when task data changes or every 10 seconds if tracking
  useEffect(() => {
    if (!taskId) return;
    
    // Function to update the time display
    const updateTimeDisplay = async () => {
      try {
        const seconds = await getTaskTotalTime(taskId);
        setTotalTimeSeconds(seconds);
        setFormattedTotalTime(formatTime(seconds));
        setLastUpdateTime(new Date().toLocaleTimeString());
      } catch (error) {
        console.error('Error updating task time:', error);
      }
    };
    
    // Initial update
    updateTimeDisplay();
    
    // If we're tracking, update every second to make timer feel more responsive
    // This ensures the timer display is always up-to-date
    let intervalId: NodeJS.Timeout | null = null;
    if (isTracking) {
      intervalId = setInterval(() => {
        updateTimeDisplay();
      }, 1000);
    }
    
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [taskId, isTracking, getTaskTotalTime, formatTime]);
  
  // Check if there's already an active session for this task
  useEffect(() => {
    if (taskId) {
      setIsTracking(isSessionActive(taskId));
      refreshSessions();
    }
  }, [taskId, isSessionActive, refreshSessions]);
  
  return {
    totalTimeSeconds,
    formattedTotalTime,
    isTracking,
    startTracking,
    stopTracking,
    refreshSessions,
    setIsInTaskDetail,
    lastUpdateTime
  };
};
