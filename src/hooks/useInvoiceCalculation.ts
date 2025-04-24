
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const PRICE_PER_MINUTE = 0.75;
const FREE_MINUTES = 1000;
const VAT_RATE = 0.19;

export interface InvoiceCalculation {
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
        // Summe der Zeiten direkt über einen SQL-Join ermitteln
        const { data, error } = await supabase
          .from('task_times')
          .select('duration_seconds, tasks!inner(customer_id)')
          .eq('tasks.customer_id', customerId)
          .gte('started_at', fromDate.toISOString())
          .lte('started_at', toDate.toISOString());
        
        if (error) {
          console.error('Error fetching task times:', error);
          throw error;
        }

        console.log('Raw time data found:', data?.length, 'records');
        console.log('Sample data:', data?.slice(0, 3));
        
        // Berechne die Gesamtzeit manuell aus den Rohdaten
        let totalSeconds = 0;
        if (data && data.length > 0) {
          totalSeconds = data.reduce((sum, entry) => {
            const duration = entry.duration_seconds || 0;
            console.log('Adding duration:', duration, 'seconds');
            return sum + duration;
          }, 0);
        }
        
        console.log('Total seconds calculated:', totalSeconds);
        
        // Umrechnung von Sekunden in Minuten
        const totalMinutes = Math.round(totalSeconds / 60);
        console.log('Total minutes calculated:', totalMinutes);
        
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
        console.error('Error in useInvoiceCalculation:', error);
        throw error;
      }
    },
    enabled: Boolean(customerId && from && to)
  });
};
