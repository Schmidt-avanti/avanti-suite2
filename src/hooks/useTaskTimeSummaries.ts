
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { TaskTimeSummary } from '@/types';
import { toast } from 'sonner';

export const useTaskTimeSummaries = (taskIds: string[]) => {
  const { data: taskTimeSummaries, isLoading, error } = useQuery({
    queryKey: ['taskTimeSummaries', taskIds],
    queryFn: async () => {
      if (!taskIds.length) return [];
      
      console.log('Fetching time summaries for task IDs:', taskIds);
      
      try {
        // Direct query to the task_times table to calculate summaries
        const { data: timeEntries, error: timeError } = await supabase
          .from('task_times')
          .select('task_id, user_id, duration_seconds, started_at, ended_at')
          .in('task_id', taskIds);
          
        if (timeError) {
          throw timeError;
        }
        
        console.log('Raw time entries returned:', timeEntries);
        
        if (!timeEntries || timeEntries.length === 0) {
          console.log('No time entries found for the selected tasks');
          return [];
        }
        
        // Process raw time entries to calculate summaries
        const taskSummaries: Record<string, TaskTimeSummary> = {};
        
        timeEntries.forEach(entry => {
          if (!entry.task_id) return;
          
          if (!taskSummaries[entry.task_id]) {
            taskSummaries[entry.task_id] = {
              task_id: entry.task_id,
              user_id: entry.user_id,
              session_count: 0,
              total_seconds: 0,
              total_hours: 0
            };
          }
          
          const summary = taskSummaries[entry.task_id];
          summary.session_count++;
          
          // Calculate duration if not available
          let duration = entry.duration_seconds;
          if (!duration && entry.ended_at && entry.started_at) {
            const start = new Date(entry.started_at).getTime();
            const end = new Date(entry.ended_at).getTime();
            duration = Math.round((end - start) / 1000);
          }
          
          if (duration && duration > 0) {
            summary.total_seconds += duration;
            summary.total_hours = Number((summary.total_seconds / 3600).toFixed(2));
          }
        });
        
        const result = Object.values(taskSummaries);
        console.log('Calculated task time summaries:', result);
        
        return result;
      } catch (error) {
        console.error('Error calculating task time summaries:', error);
        toast.error('Fehler beim Laden der Bearbeitungszeiten');
        throw error;
      }
    },
    enabled: taskIds.length > 0
  });
  
  return {
    taskTimeSummaries: taskTimeSummaries || [],
    isLoading,
    error
  };
};
