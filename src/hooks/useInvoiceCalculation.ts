
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
        // Direkte und optimierte Abfrage mit Aggregation der Gesamtzeit
        const { data, error } = await supabase
          .rpc('calculate_total_time_for_customer', { 
            customer_id_param: customerId,
            from_date_param: fromDate.toISOString(),
            to_date_param: toDate.toISOString()
          });
        
        if (error) {
          console.error('Error calculating from task_times using RPC:', error);
          
          // Fallback zur direkten Abfrage, falls die RPC-Funktion nicht verfügbar ist
          const { data: rawData, error: fallbackError } = await supabase
            .from('task_times')
            .select('duration_seconds, tasks!inner(customer_id)')
            .eq('tasks.customer_id', customerId)
            .gte('started_at', fromDate.toISOString())
            .lte('started_at', toDate.toISOString());
            
          if (fallbackError) {
            console.error('Fallback query also failed:', fallbackError);
            throw fallbackError;
          }
          
          // Berechne die Gesamtzeit manuell aus den Rohdaten
          let totalSeconds = 0;
          if (rawData && rawData.length > 0) {
            totalSeconds = rawData.reduce((sum, entry) => {
              return sum + (entry.duration_seconds || 0);
            }, 0);
          }
          
          console.log('Fallback calculation: Total seconds from direct query:', totalSeconds);
          
          const totalMinutes = Math.round(totalSeconds / 60);
          const billableMinutes = Math.max(0, totalMinutes - FREE_MINUTES);
          const netAmount = billableMinutes * PRICE_PER_MINUTE;
          const vat = netAmount * VAT_RATE;
          const totalAmount = netAmount + vat;

          console.log('Final calculation from fallback:', {
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
        }
        
        // Wenn die RPC erfolgreich war, verwende die zurückgegebenen Daten
        const totalSeconds = data || 0;
        console.log('Total seconds from RPC:', totalSeconds);
        
        const totalMinutes = Math.round(totalSeconds / 60);
        const billableMinutes = Math.max(0, totalMinutes - FREE_MINUTES);
        const netAmount = billableMinutes * PRICE_PER_MINUTE;
        const vat = netAmount * VAT_RATE;
        const totalAmount = netAmount + vat;

        console.log('Final calculation from RPC:', {
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
