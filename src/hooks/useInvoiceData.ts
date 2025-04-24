
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
        // Direkte und optimierte Abfrage auf task_times mit JOIN zu tasks
        const { data: rawData, error } = await supabase
          .from('task_times')
          .select('duration_seconds, started_at, task_id, tasks!inner(customer_id)')
          .eq('tasks.customer_id', customerId)
          .gte('started_at', fromDate.toISOString())
          .lte('started_at', toDate.toISOString());
        
        if (error) {
          console.error('Error fetching task times:', error);
          throw error;
        }

        console.log('Raw time data found:', rawData?.length, 'records');
        console.log('First few records:', rawData?.slice(0, 3));
        
        if (!rawData || rawData.length === 0) {
          console.log('No task times found for this customer in the selected period');
          return [] as DailyMinutesRecord[];
        }

        // Gruppieren nach Datum und Minuten berechnen
        const dailyMinutes = rawData.reduce<Record<string, number>>((acc, entry) => {
          if (!entry.duration_seconds) return acc;
          
          const date = entry.started_at.split('T')[0];
          const minutes = Math.round(entry.duration_seconds / 60);
          
          acc[date] = (acc[date] || 0) + minutes;
          return acc;
        }, {});

        console.log('Grouped daily minutes:', dailyMinutes);

        // Konvertieren zu Array von Objekten für die Rückgabe
        const result = Object.entries(dailyMinutes)
          .map(([date, minutes]) => ({ 
            date, 
            minutes
          })) as DailyMinutesRecord[];
          
        console.log('Final processed records:', result);
        return result;
      } catch (error) {
        console.error('Error in useInvoiceData:', error);
        throw error;
      }
    },
    enabled: Boolean(customerId && from && to)
  });
};
