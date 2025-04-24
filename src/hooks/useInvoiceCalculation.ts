
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const PRICE_PER_MINUTE = 0.75;
const FREE_MINUTES = 1000;
const VAT_RATE = 0.19;

export const useInvoiceCalculation = (customerId: string, from: Date, to: Date) => {
  return useQuery({
    queryKey: ['invoice-calculation', customerId, from, to],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('task_times')
        .select(`
          duration_seconds,
          tasks!inner(customer_id)
        `)
        .eq('tasks.customer_id', customerId)
        .gte('started_at', from.toISOString())
        .lte('started_at', to.toISOString());

      if (error) throw error;

      const totalMinutes = data.reduce((sum, entry) => {
        return sum + Math.round(entry.duration_seconds / 60);
      }, 0);

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
      };
    },
    enabled: Boolean(customerId && from && to)
  });
};
