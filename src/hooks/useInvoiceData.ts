
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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
      
      if (!customerId || !from || !to) {
        console.error('Missing required parameters');
        return [] as DailyMinutesRecord[];
      }

      try {
        const { data, error } = await supabase.rpc(
          'calculate_completed_times_for_customer',
          {
            customer_id_param: customerId,
            from_date_param: from.toISOString(),
            to_date_param: to.toISOString()
          }
        );

        if (error) {
          console.error('Error fetching task times:', error);
          toast.error('Fehler beim Laden der Zeitdaten');
          throw error;
        }

        console.log('Time data from database:', data);

        // Data comes back in the correct format now, just need to format the date
        const result = data.map((record: any) => ({
          date: record.date_day,
          minutes: record.total_minutes
        }));

        console.log('Processed daily records:', result);
        return result;
      } catch (error) {
        console.error('Error in useInvoiceData:', error);
        toast.error('Fehler beim Verarbeiten der Zeitdaten');
        throw error;
      }
    },
    enabled: Boolean(customerId && from && to)
  });
};
