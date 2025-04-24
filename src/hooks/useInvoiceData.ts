
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useInvoiceData = (customerId: string, from: Date, to: Date) => {
  return useQuery({
    queryKey: ['invoice-data', customerId, from, to],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('task_times')
        .select(`
          duration_seconds,
          started_at,
          tasks!inner(customer_id)
        `)
        .eq('tasks.customer_id', customerId)
        .gte('started_at', from.toISOString())
        .lte('started_at', to.toISOString());

      if (error) throw error;

      // Group by date and calculate total minutes
      const dailyMinutes = data.reduce((acc, entry) => {
        const date = entry.started_at.split('T')[0];
        const minutes = Math.round(entry.duration_seconds / 60);
        
        acc[date] = (acc[date] || 0) + minutes;
        return acc;
      }, {} as Record<string, number>);

      return Object.entries(dailyMinutes)
        .map(([date, minutes]) => ({ date, minutes }))
        .sort((a, b) => a.date.localeCompare(b.date));
    },
    enabled: Boolean(customerId && from && to)
  });
};
