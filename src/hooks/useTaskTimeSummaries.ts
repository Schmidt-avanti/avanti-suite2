
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { TaskTimeSummary } from '@/types';

export const useTaskTimeSummaries = (taskIds: string[]) => {
  const { data: taskTimeSummaries, isLoading } = useQuery({
    queryKey: ['taskTimeSummaries', taskIds],
    queryFn: async () => {
      if (!taskIds.length) return [];
      
      const { data, error } = await supabase
        .from('task_time_summary')
        .select('*')
        .in('task_id', taskIds);
        
      if (error) {
        console.error('Error fetching task time summaries:', error);
        return [];
      }
      
      return data as TaskTimeSummary[];
    },
    enabled: taskIds.length > 0
  });

  return {
    taskTimeSummaries,
    isLoading
  };
};
