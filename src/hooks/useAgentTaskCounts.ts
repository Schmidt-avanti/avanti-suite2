import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { startOfDay, endOfDay, startOfMonth, endOfMonth, subMonths, subDays } from 'date-fns';

export type DateFilter = 'current_month' | 'last_month' | 'yesterday' | 'custom';

interface AgentTaskCounts {
  completedTasks: number;
  followupTasks: number;
  currentTasks: any[];
}

interface UseAgentTaskCountsProps {
  dateFilter: DateFilter;
  customStartDate?: Date;
  customEndDate?: Date;
}

export const useAgentTaskCounts = ({ dateFilter, customStartDate, customEndDate }: UseAgentTaskCountsProps) => {
  const { user } = useAuth();

  const getDateRange = () => {
    const now = new Date();
    
    switch (dateFilter) {
      case 'current_month':
        return {
          start: startOfMonth(now),
          end: endOfMonth(now)
        };
      case 'last_month':
        const lastMonth = subMonths(now, 1);
        return {
          start: startOfMonth(lastMonth),
          end: endOfMonth(lastMonth)
        };
      case 'yesterday':
        const yesterday = subDays(now, 1);
        return {
          start: startOfDay(yesterday),
          end: endOfDay(yesterday)
        };
      case 'custom':
        return {
          start: customStartDate ? startOfDay(customStartDate) : startOfDay(now),
          end: customEndDate ? endOfDay(customEndDate) : endOfDay(now)
        };
      default:
        return {
          start: startOfMonth(now),
          end: endOfMonth(now)
        };
    }
  };

  const fetchAgentTaskCounts = async (): Promise<AgentTaskCounts> => {
    if (!user?.id) {
      return {
        completedTasks: 0,
        followupTasks: 0,
        currentTasks: []
      };
    }

    try {
      const { start, end } = getDateRange();

      // 1. Get completed tasks count for the current user within date range
      const { count: completedCount, error: completedError } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'completed')
        .eq('assigned_to', user.id)
        .gte('updated_at', start.toISOString())
        .lte('updated_at', end.toISOString());

      if (completedError) {
        console.error('Error fetching completed tasks:', completedError);
      }

      // 2. Get followup tasks count for the current user (no date filter)
      const { count: followupCount, error: followupError } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'followup')
        .eq('assigned_to', user.id);

      if (followupError) {
        console.error('Error fetching followup tasks:', followupError);
      }

      // 3. Get current tasks (in_progress and followup assigned to user + new tasks for user's customers)
      
      // First, get user's assigned customers
      const { data: assignedCustomers, error: customersError } = await supabase
        .from('user_customer_assignments')
        .select('customer_id')
        .eq('user_id', user.id);

      if (customersError) {
        console.error('Error fetching assigned customers:', customersError);
      }

      const customerIds = assignedCustomers?.map(ac => ac.customer_id) || [];

      // Get tasks assigned to user (in_progress or followup)
      const { data: userTasks, error: userTasksError } = await supabase
        .from('tasks')
        .select(`
          id,
          title,
          status,
          created_at,
          updated_at,
          readable_id,
          customer:customer_id(name)
        `)
        .eq('assigned_to', user.id)
        .in('status', ['in_progress', 'followup'])
        .order('updated_at', { ascending: false });

      if (userTasksError) {
        console.error('Error fetching user tasks:', userTasksError);
      }

      // Get new tasks for user's customers
      let customerTasks: any[] = [];
      if (customerIds.length > 0) {
        const { data: newCustomerTasks, error: customerTasksError } = await supabase
          .from('tasks')
          .select(`
            id,
            title,
            status,
            created_at,
            updated_at,
            readable_id,
            customer:customer_id(name)
          `)
          .eq('status', 'new')
          .in('customer_id', customerIds)
          .order('updated_at', { ascending: false });

        if (customerTasksError) {
          console.error('Error fetching customer tasks:', customerTasksError);
        } else {
          customerTasks = newCustomerTasks || [];
        }
      }

      // Combine and sort all current tasks
      const allCurrentTasks = [...(userTasks || []), ...customerTasks]
        .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());

      return {
        completedTasks: completedCount || 0,
        followupTasks: followupCount || 0,
        currentTasks: allCurrentTasks
      };

    } catch (error) {
      console.error('Error in useAgentTaskCounts:', error);
      return {
        completedTasks: 0,
        followupTasks: 0,
        currentTasks: []
      };
    }
  };

  return useQuery({
    queryKey: ['agentTaskCounts', user?.id, dateFilter, customStartDate, customEndDate],
    queryFn: fetchAgentTaskCounts,
    enabled: !!user?.id,
    staleTime: 30000, // 30 seconds
    gcTime: 300000, // 5 minutes
  });
};
