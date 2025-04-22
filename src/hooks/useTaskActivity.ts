
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { TaskStatus } from '@/types';

export const useTaskActivity = () => {
  const { user } = useAuth();

  const logTaskOpen = async (taskId: string) => {
    if (!user) return;
    
    try {
      await supabase
        .from('task_activities')
        .insert({
          task_id: taskId,
          action: 'open',
          user_id: user.id,
        });
    } catch (error) {
      console.error('Error logging task open:', error);
    }
  };

  const logTaskClose = async (taskId: string) => {
    if (!user) return;
    
    try {
      await supabase
        .from('task_activities')
        .insert({
          task_id: taskId,
          action: 'close',
          user_id: user.id,
        });
    } catch (error) {
      console.error('Error logging task close:', error);
    }
  };

  const logTaskStatusChange = async (
    taskId: string,
    fromStatus: TaskStatus,
    toStatus: TaskStatus
  ) => {
    if (!user) return;
    
    try {
      await supabase
        .from('task_activities')
        .insert({
          task_id: taskId,
          action: 'status_change',
          status_from: fromStatus,
          status_to: toStatus,
          user_id: user.id,
        });
    } catch (error) {
      console.error('Error logging status change:', error);
    }
  };

  return {
    logTaskOpen,
    logTaskClose,
    logTaskStatusChange
  };
};
