
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useInvoiceData = (customerId: string, from: Date, to: Date) => {
  return useQuery({
    queryKey: ['invoice-data', customerId, from, to],
    queryFn: async () => {
      console.log('Fetching invoice data for customer:', customerId);
      console.log('Date range:', from.toISOString(), 'to', to.toISOString());
      
      // Zuerst prüfen wir direkt mit task_time_summary View (enthält aggregierte Daten)
      const { data: summaryData, error: summaryError } = await supabase
        .from('task_time_summary')
        .select(`
          task_id,
          total_seconds,
          tasks!inner(customer_id, created_at)
        `)
        .eq('tasks.customer_id', customerId)
        .gte('tasks.created_at', from.toISOString())
        .lte('tasks.created_at', to.toISOString());
      
      if (summaryError) {
        console.error('Error fetching task time summary:', summaryError);
        throw summaryError;
      }
      
      console.log('Summary data results:', summaryData?.length);
      
      if (!summaryData || summaryData.length === 0) {
        // Wenn keine Daten in der Zusammenfassung, versuchen wir direkt auf task_times
        const { data: rawData, error: rawError } = await supabase
          .from('task_times')
          .select(`
            duration_seconds,
            started_at,
            tasks!inner(id, customer_id)
          `)
          .eq('tasks.customer_id', customerId)
          .gte('started_at', from.toISOString())
          .lte('started_at', to.toISOString());
          
        if (rawError) {
          console.error('Error fetching task times directly:', rawError);
          throw rawError;
        }

        console.log('Raw data results:', rawData?.length);
        
        // Gruppieren nach Datum und Minuten berechnen
        const dailyMinutes = rawData.reduce((acc, entry) => {
          if (!entry.duration_seconds) return acc;
          
          const date = entry.started_at.split('T')[0];
          const minutes = Math.round(entry.duration_seconds / 60);
          
          acc[date] = (acc[date] || 0) + minutes;
          return acc;
        }, {} as Record<string, number>);

        return Object.entries(dailyMinutes)
          .map(([date, minutes]) => ({ date, minutes }))
          .sort((a, b) => a.date.localeCompare(b.date));
      } else {
        // Gruppieren der Zusammenfassungsdaten nach Datum
        const taskTimesByDate: Record<string, number> = {};
        
        for (const record of summaryData) {
          if (!record.total_seconds) continue;
          
          // Extrahiere das Datum aus dem task erstellt am
          const taskDate = record.tasks.created_at.split('T')[0];
          const minutes = Math.round(record.total_seconds / 60);
          
          taskTimesByDate[taskDate] = (taskTimesByDate[taskDate] || 0) + minutes;
        }
        
        return Object.entries(taskTimesByDate)
          .map(([date, minutes]) => ({ date, minutes }))
          .sort((a, b) => a.date.localeCompare(b.date));
      }
    },
    enabled: Boolean(customerId && from && to)
  });
};
