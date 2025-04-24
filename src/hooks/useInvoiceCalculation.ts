
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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

      if (!customerId || !from || !to) {
        console.error('Missing required parameters');
        return null;
      }

      try {
        const { data: totalSeconds, error } = await supabase.rpc(
          'calculate_total_time_for_customer',
          {
            customer_id_param: customerId,
            from_date_param: from.toISOString(),
            to_date_param: to.toISOString()
          }
        );

        if (error) {
          console.error('Error calculating total time:', error);
          toast.error('Fehler bei der Berechnung der Gesamtzeit');
          throw error;
        }

        console.log('Total seconds from database:', totalSeconds);
        
        // Convert seconds to minutes for calculations
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
        toast.error('Fehler bei der Rechnungsberechnung');
        throw error;
      }
    },
    enabled: Boolean(customerId && from && to)
  });
};
