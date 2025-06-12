import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface UseSimpleTaskTimeResult {
  totalFormattedTime: string;
  sessionId: string | null;
}

/**
 * Simple hook for tracking task time with sessions
 * - Starts a session when a task is opened
 * - Ends the session when leaving the page
 * - Calculates and displays total time across all sessions from all users
 */
export const useSimpleTaskTime = (taskId: string | null | undefined): UseSimpleTaskTimeResult => {
  const { user } = useAuth();
  const [totalFormattedTime, setTotalFormattedTime] = useState<string>('00:00');
  const [sessionId, setSessionId] = useState<string | null>(null);

  // Format seconds to MM:SS
  const formatTime = (totalSeconds: number): string => {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // Calculate total time from all sessions
  const calculateTotalTime = async () => {
    if (!taskId) return;

    try {
      // Get all sessions for this task (from all users)
      const { data, error } = await supabase
        .from('task_sessions')
        .select('duration_seconds')
        .eq('task_id', taskId)
        .not('duration_seconds', 'is', null);

      if (error) {
        console.error('Error fetching task sessions:', error);
        return;
      }

      // Calculate total seconds
      const totalSeconds = data.reduce((sum, session) => {
        return sum + (session.duration_seconds || 0);
      }, 0);

      // Format and update
      setTotalFormattedTime(formatTime(totalSeconds));
    } catch (error) {
      console.error('Error calculating total time:', error);
    }
  };

  // Start a session when opening the task
  const startSession = async () => {
    if (!taskId || !user?.id) return;

    try {
      // Create a new session
      const { data, error } = await supabase
        .from('task_sessions')
        .insert({
          task_id: taskId,
          user_id: user.id,
          start_time: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating task session:', error);
        return;
      }

      setSessionId(data.id);
    } catch (error) {
      console.error('Error starting session:', error);
    }
  };

  // End the session when leaving the page
  const endSession = async () => {
    if (!sessionId) return;

    try {
      // Get the session start time
      const { data: session, error: fetchError } = await supabase
        .from('task_sessions')
        .select('start_time')
        .eq('id', sessionId)
        .single();

      if (fetchError) {
        console.error('Error fetching session:', fetchError);
        return;
      }

      // Calculate duration
      const startTime = new Date(session.start_time).getTime();
      const endTime = new Date().getTime();
      const durationSeconds = Math.round((endTime - startTime) / 1000);

      // Update session with end time and duration
      const { error: updateError } = await supabase
        .from('task_sessions')
        .update({
          end_time: new Date().toISOString(),
          duration_seconds: durationSeconds > 0 ? durationSeconds : 0
        })
        .eq('id', sessionId);

      if (updateError) {
        console.error('Error updating session:', updateError);
      }
    } catch (error) {
      console.error('Error ending session:', error);
    }
  };

  // Start session when component mounts
  useEffect(() => {
    calculateTotalTime();
    startSession();

    // End session when component unmounts
    return () => {
      endSession();
    };
  }, [taskId, user?.id]);

  return {
    totalFormattedTime,
    sessionId
  };
};
