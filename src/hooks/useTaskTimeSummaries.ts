
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { TaskTimeSummary } from '@/types';

export const useTaskTimeSummaries = (taskIds: string[]) => {
  const { data: taskTimeSummaries, isLoading } = useQuery({
    queryKey: ['taskTimeSummaries', taskIds],
    queryFn: async () => {
      if (!taskIds.length) return [];
      
      // Debug log to check taskIds being passed
      console.log('Fetching time summaries for task IDs:', taskIds);
      
      const { data, error } = await supabase
        .from('task_time_summary')
        .select('*')
        .in('task_id', taskIds);
        
      if (error) {
        console.error('Error fetching task time summaries:', error);
        throw error;
      }
      
      // Debug log to inspect returned data
      console.log('Task time summaries returned:', data);
      
      return data as TaskTimeSummary[];
    },
    enabled: taskIds.length > 0
  });
  
  // Additional log to verify what's being returned from the hook
  console.log('useTaskTimeSummaries returning:', taskTimeSummaries);

  return {
    taskTimeSummaries: taskTimeSummaries || [],
    isLoading
  };
};
