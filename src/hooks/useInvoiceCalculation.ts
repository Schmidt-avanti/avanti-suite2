
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const PRICE_PER_MINUTE = 0.75;
const FREE_MINUTES = 1000;
const VAT_RATE = 0.19;

interface InvoiceCalculation {
  totalMinutes: number;
  billableMinutes: number;
  netAmount: number;
  vat: number;
  totalAmount: number;
}

export const useInvoiceCalculation = (customerId: string, from: Date, to: Date) => {
  return useQuery({
    queryKey: ['invoice-calculation', customerId, from, to],
    queryFn: async () => {
      console.log('Calculating invoice for customer:', customerId);
      console.log('Date range:', from.toISOString(), 'to', to.toISOString());

      // Sicherstellen, dass wir volles Datum für die Vergleiche haben (Ende des Tages für "to")
      const fromDate = new Date(from);
      const toDate = new Date(to);
      toDate.setHours(23, 59, 59, 999); // Set to end of day
      
      console.log('Adjusted date range:', fromDate.toISOString(), 'to', toDate.toISOString());
      
      try {
        // Try first getting the summarized data from task_time_summary
        const { data: summaryData, error: summaryError } = await supabase
          .from('task_time_summary')
          .select(`
            total_seconds
          `)
          .eq('user_id', customerId);
          
        if (summaryError) {
          console.error('Error getting summary data:', summaryError);
          // Fall back to task_times
        } else if (summaryData && summaryData.length > 0) {
          console.log('Found summary data:', summaryData);
          
          // Calculate total seconds from all tasks matching this customer
          const totalSeconds = summaryData.reduce((sum, entry) => {
            return sum + (entry.total_seconds || 0);
          }, 0);
          
          console.log('Total seconds from summary:', totalSeconds);
          
          const totalMinutes = Math.round(totalSeconds / 60);
          const billableMinutes = Math.max(0, totalMinutes - FREE_MINUTES);
          const netAmount = billableMinutes * PRICE_PER_MINUTE;
          const vat = netAmount * VAT_RATE;
          const totalAmount = netAmount + vat;

          return {
            totalMinutes,
            billableMinutes,
            netAmount,
            vat,
            totalAmount
          } as InvoiceCalculation;
        }
      
        // If we reach here, summary data failed or was empty, use task_times directly
        const { data: timesData, error: timesError } = await supabase
          .from('task_times')
          .select(`
            duration_seconds,
            tasks!inner(customer_id)
          `)
          .eq('tasks.customer_id', customerId)
          .gte('started_at', fromDate.toISOString())
          .lte('started_at', toDate.toISOString());
        
        if (timesError) {
          console.error('Error calculating from task_times:', timesError);
          throw timesError;
        }
        
        console.log('Times data found:', timesData?.length, 'records');
        
        let totalSeconds = 0;
        
        if (timesData && timesData.length > 0) {
          totalSeconds = timesData.reduce((sum, entry) => sum + (entry.duration_seconds || 0), 0);
        } else {
          // Alternative Abfrage über Tasks, falls keine direkten Zeiteinträge gefunden wurden
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
          
          // Alle Zeiteinträge sammeln und summieren
          taskData?.forEach(task => {
            if (task.task_times && task.task_times.length > 0) {
              const taskSeconds = task.task_times.reduce((sum: number, timeEntry: any) => 
                sum + (timeEntry.duration_seconds || 0), 0);
              totalSeconds += taskSeconds;
            }
          });
        }

        console.log('Total seconds calculated:', totalSeconds);
        
        const totalMinutes = Math.round(totalSeconds / 60);
        const billableMinutes = Math.max(0, totalMinutes - FREE_MINUTES);
        const netAmount = billableMinutes * PRICE_PER_MINUTE;
        const vat = netAmount * VAT_RATE;
        const totalAmount = netAmount + vat;

        console.log('Final calculation:', {
          totalMinutes,
          billableMinutes,
          netAmount,
          vat,
          totalAmount
        });

        return {
          totalMinutes,
          billableMinutes,
          netAmount,
          vat,
          totalAmount
        } as InvoiceCalculation;
      } catch (error) {
        console.error('Fatal error in useInvoiceCalculation:', error);
        throw error;
      }
    },
    enabled: Boolean(customerId && from && to)
  });
};
