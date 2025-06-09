
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
      
      // Create a copy of the to date and set it to the end of the day
      const toDateEnd = new Date(to);
      toDateEnd.setHours(23, 59, 59, 999);
      
      console.log('Date range:', from.toISOString(), 'to', toDateEnd.toISOString());
      
      if (!customerId || !from || !to) {
        console.error('Missing required parameters');
        return [] as DailyMinutesRecord[];
      }

      try {
        // First, let's run a debug query to check if there's any data
        const { data: debugData, error: debugError } = await supabase.rpc(
          'debug_customer_times',
          {
            customer_id_param: customerId,
            from_date_param: from.toISOString(),
            to_date_param: toDateEnd.toISOString()
          }
        );

        if (debugError) {
          console.error('Error running debug query:', debugError);
        } else {
          console.log('Debug data (raw task times):', debugData);
        }

        // Direct query to validate customer's tasks
        const { data: taskData, error: taskError } = await supabase
          .from('tasks')
          .select('id, title, customer_id')
          .eq('customer_id', customerId)
          .order('created_at', { ascending: false })
          .limit(5);

        if (taskError) {
          console.error('Error fetching tasks for customer:', taskError);
        } else {
          console.log(`Found ${taskData?.length || 0} tasks for customer:`, taskData);
        }

        // Task timer validation has been removed
        if (taskData && taskData.length > 0) {
          console.log(`Found ${taskData.length} tasks for customer`);
        }

        // Then fetch the actual daily summary data
        const { data, error } = await supabase.rpc(
          'calculate_completed_times_for_customer',
          {
            customer_id_param: customerId,
            from_date_param: from.toISOString(),
            to_date_param: toDateEnd.toISOString()
          }
        );

        if (error) {
          console.error('Error fetching task times:', error);
          toast.error('Fehler beim Laden der Zeitdaten');
          throw error;
        }

        console.log('Daily time data from database:', data);

        // If no data was returned, return an empty array
        if (!data || data.length === 0) {
          console.log('No time data found for this customer in the date range');
          return [] as DailyMinutesRecord[];
        }

        // Data should already come back in the correct format
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
