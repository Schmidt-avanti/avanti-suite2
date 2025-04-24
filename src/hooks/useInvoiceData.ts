
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

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
        // Zuerst direkt auf task_times zugreifen (da die Daten hier definitiv sein sollten)
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
          // Versuchen wir es mit einer alternativen Abfrage über die Tasks selbst
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
          
          // Flache Liste aller Zeiteinträge erstellen
          let allTimes: any[] = [];
          taskData?.forEach(task => {
            if (task.task_times && task.task_times.length > 0) {
              allTimes = [...allTimes, ...task.task_times];
            }
          });
          
          if (allTimes.length === 0) {
            return [];
          }
          
          // Gruppieren nach Datum und Minuten berechnen
          const dailyMinutes = allTimes.reduce((acc, entry) => {
            if (!entry.duration_seconds) return acc;
            
            const date = entry.started_at.split('T')[0];
            const minutes = Math.round(entry.duration_seconds / 60);
            
            acc[date] = (acc[date] || 0) + minutes;
            return acc;
          }, {} as Record<string, number>);
          
          return Object.entries(dailyMinutes)
            .map(([date, minutes]) => ({ date, minutes }))
            .sort((a, b) => a.date.localeCompare(b.date));
        }
        
        // Gruppieren der Rohdaten nach Datum
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
      } catch (error) {
        console.error('Error in useInvoiceData:', error);
        throw error;
      }
    },
    enabled: Boolean(customerId && from && to)
  });
};
