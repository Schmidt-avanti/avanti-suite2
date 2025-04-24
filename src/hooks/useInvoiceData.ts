
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface DailyMinutesRecord {
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
        // Direkt auf task_times zugreifen mit JOIN auf tasks um die Kundenfilterung zu ermöglichen
        const { data: taskTimesData, error: taskTimesError } = await supabase
          .from('task_times')
          .select(`
            id,
            duration_seconds,
            started_at,
            tasks(
              id,
              customer_id
            )
          `)
          .eq('tasks.customer_id', customerId)
          .gte('started_at', fromDate.toISOString())
          .lte('started_at', toDate.toISOString());
        
        if (taskTimesError) {
          console.error('Error fetching task times:', taskTimesError);
          throw taskTimesError;
        }

        console.log('Task times data:', taskTimesData);
        
        if (!taskTimesData || taskTimesData.length === 0) {
          console.log('No task times found for this customer in the selected period');
          return [] as DailyMinutesRecord[];
        }

        // Gruppieren nach Datum und Minuten berechnen
        const dailyMinutes = taskTimesData.reduce<Record<string, number>>((acc, entry) => {
          if (!entry.duration_seconds) return acc;
          
          const date = entry.started_at.split('T')[0];
          const minutes = Math.round(entry.duration_seconds / 60);
          
          acc[date] = (acc[date] || 0) + minutes;
          return acc;
        }, {});

        console.log('Grouped daily minutes:', dailyMinutes);

        // Konvertieren zu Array von Objekten für die Rückgabe
        return Object.entries(dailyMinutes)
          .map(([date, minutes]) => ({ 
            date, 
            minutes: minutes as number 
          })) as DailyMinutesRecord[];
      } catch (error) {
        console.error('Error in useInvoiceData:', error);
        throw error;
      }
    },
    enabled: Boolean(customerId && from && to)
  });
};
