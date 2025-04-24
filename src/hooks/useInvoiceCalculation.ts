
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const PRICE_PER_MINUTE = 0.75;
const FREE_MINUTES = 1000;
const VAT_RATE = 0.19;

export const useInvoiceCalculation = (customerId: string, from: Date, to: Date) => {
  return useQuery({
    queryKey: ['invoice-calculation', customerId, from, to],
    queryFn: async () => {
      console.log('Calculating invoice for customer:', customerId);
      console.log('Date range:', from.toISOString(), 'to', to.toISOString());

      // Zuerst versuchen wir, die aggregierten Daten zu verwenden
      let totalSeconds = 0;
      
      const { data: summaryData, error: summaryError } = await supabase
        .from('task_time_summary')
        .select(`
          total_seconds,
          tasks!inner(customer_id, created_at)
        `)
        .eq('tasks.customer_id', customerId)
        .gte('tasks.created_at', from.toISOString())
        .lte('tasks.created_at', to.toISOString());
      
      if (summaryError) {
        console.error('Error calculating from summary:', summaryError);
      } else if (summaryData && summaryData.length > 0) {
        // Berechne Gesamtzeit aus den Zusammenfassungsdaten
        console.log('Summary data found:', summaryData.length, 'records');
        totalSeconds = summaryData.reduce((sum, entry) => sum + (entry.total_seconds || 0), 0);
      } else {
        console.log('No summary data found, trying raw task times');
        // Wenn keine Zusammenfassungsdaten, versuche die Rohdaten
        const { data: rawData, error: rawError } = await supabase
          .from('task_times')
          .select(`
            duration_seconds,
            tasks!inner(customer_id)
          `)
          .eq('tasks.customer_id', customerId)
          .gte('started_at', from.toISOString())
          .lte('started_at', to.toISOString());

        if (rawError) {
          console.error('Error calculating from raw data:', rawError);
          throw rawError;
        }
        
        console.log('Raw data found:', rawData?.length, 'records');
        totalSeconds = rawData.reduce((sum, entry) => sum + (entry.duration_seconds || 0), 0);
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
      };
    },
    enabled: Boolean(customerId && from && to)
  });
};
