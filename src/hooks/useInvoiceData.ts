
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface DailyMinutesRecord {
  date: string;
  minutes: number;
}

export const useInvoiceData = (customerId: string, from: Date, to: Date) => {
  return useQuery({
    queryKey: ['invoice-data', customerId, from, to],
    queryFn: async () => {
      console.log('Fetching invoice data for customer:', customerId);
      console.log('Date range:', from.toISOString(), 'to', to.toISOString());
      
      // Sicherstellen, dass wir volles Datum für die Vergleiche haben (Ende des Tages für "to")
      const fromDate = new Date(from);
      const toDate = new Date(to);
      toDate.setHours(23, 59, 59, 999); // Set to end of day
      
      console.log('Adjusted date range:', fromDate.toISOString(), 'to', toDate.toISOString());
      
      try {
        // First get eligible tasks for this customer and time period
        const { data: taskIds, error: taskError } = await supabase
          .from('tasks')
          .select('id')
          .eq('customer_id', customerId)
          .gte('created_at', fromDate.toISOString())
          .lte('created_at', toDate.toISOString());
        
        if (taskError) {
          console.error('Error fetching task IDs:', taskError);
          throw taskError;
        }

        // Extract just the IDs into an array
        const eligibleTaskIds = taskIds?.map(task => task.id) || [];
        console.log('Eligible task IDs:', eligibleTaskIds);
        
        // Only proceed with summary query if we have eligible tasks
        if (eligibleTaskIds.length > 0) {
          // Try to get summary data for these task IDs
          const { data: summaryData, error: summaryError } = await supabase
            .from('task_time_summary')
            .select(`
              task_id,
              total_seconds
            `)
            .eq('user_id', customerId)
            .in('task_id', eligibleTaskIds);

          if (summaryError) {
            console.error('Error fetching from task_time_summary:', summaryError);
            throw summaryError;
          }

          if (summaryData && summaryData.length > 0) {
            console.log('Found data in task_time_summary:', summaryData.length);
            // Directly access task_times (since the data should definitely be there)
            const { data: rawData, error: rawError } = await supabase
              .from('task_times')
              .select(`
                duration_seconds,
                started_at,
                tasks!inner(id, customer_id, created_at)
              `)
              .eq('tasks.customer_id', customerId)
              .gte('started_at', fromDate.toISOString())
              .lte('started_at', toDate.toISOString());
              
            if (rawError) {
              console.error('Error fetching task times directly:', rawError);
              throw rawError;
            }

            console.log('Raw data results:', rawData?.length);
            
            if (!rawData || rawData.length === 0) {
              // Try alternative query via Tasks if no direct time entries found
              const { data: taskData, error: taskError } = await supabase
                .from('tasks')
                .select(`
                  id, 
                  created_at,
                  task_times(duration_seconds, started_at)
                `)
                .eq('customer_id', customerId)
                .gte('created_at', fromDate.toISOString())
                .lte('created_at', toDate.toISOString());
              
              if (taskError) {
                console.error('Error fetching tasks with times:', taskError);
                throw taskError;
              }
              
              console.log('Task data with times:', taskData?.length);
              
              // Create flat list of all time entries
              let allTimes: any[] = [];
              taskData?.forEach(task => {
                if (task.task_times && task.task_times.length > 0) {
                  allTimes = [...allTimes, ...task.task_times];
                }
              });
              
              if (allTimes.length === 0) {
                return [] as DailyMinutesRecord[];
              }
              
              // Group by date and calculate minutes
              const dailyMinutes = allTimes.reduce((acc, entry) => {
                if (!entry.duration_seconds) return acc;
                
                const date = entry.started_at.split('T')[0];
                const minutes = Math.round(entry.duration_seconds / 60);
                
                acc[date] = (acc[date] || 0) + minutes;
                return acc;
              }, {} as Record<string, number>);
              
              return Object.entries(dailyMinutes)
                .map(([date, minutes]) => ({ date, minutes })) as DailyMinutesRecord[];
            }
            
            // Group raw data by date
            const dailyMinutes = rawData.reduce((acc, entry) => {
              if (!entry.duration_seconds) return acc;
              
              const date = entry.started_at.split('T')[0];
              const minutes = Math.round(entry.duration_seconds / 60);
              
              acc[date] = (acc[date] || 0) + minutes;
              return acc;
            }, {} as Record<string, number>);

            return Object.entries(dailyMinutes)
              .map(([date, minutes]) => ({ date, minutes })) as DailyMinutesRecord[];
          }
        }

        // If we reach here, either no eligible tasks or no summary data
        console.log('No summary data found or no eligible tasks, trying direct task_times query');
        
        // Direct query to task_times
        const { data: rawData, error: rawError } = await supabase
          .from('task_times')
          .select(`
            duration_seconds,
            started_at,
            tasks!inner(id, customer_id, created_at)
          `)
          .eq('tasks.customer_id', customerId)
          .gte('started_at', fromDate.toISOString())
          .lte('started_at', toDate.toISOString());
          
        if (rawError) {
          console.error('Error fetching task times directly:', rawError);
          throw rawError;
        }

        console.log('Raw data results:', rawData?.length);
        
        if (!rawData || rawData.length === 0) {
          return [] as DailyMinutesRecord[];
        }
        
        // Group raw data by date
        const dailyMinutes = rawData.reduce((acc, entry) => {
          if (!entry.duration_seconds) return acc;
          
          const date = entry.started_at.split('T')[0];
          const minutes = Math.round(entry.duration_seconds / 60);
          
          acc[date] = (acc[date] || 0) + minutes;
          return acc;
        }, {} as Record<string, number>);

        return Object.entries(dailyMinutes)
          .map(([date, minutes]) => ({ date, minutes })) as DailyMinutesRecord[];
      } catch (error) {
        console.error('Error in useInvoiceData:', error);
        throw error;
      }
    },
    enabled: Boolean(customerId && from && to)
  });
};
