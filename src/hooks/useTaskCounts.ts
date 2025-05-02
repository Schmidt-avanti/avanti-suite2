
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';

interface TaskCounts {
  new: number;
  in_progress: number;
  followup: number;
  completed: number;
  total: number;
  isLoading: boolean;
}

// Update the interface to include an index signature to satisfy Record<string, unknown>
interface CustomerFilter {
  [key: string]: string | { in: string } | undefined;
  customer_id?: string | { in: string };
}

export const useTaskCounts = () => {
  const { user } = useAuth();
  
  const fetchTaskCounts = async () => {
    if (!user) {
      console.log('No user found in useTaskCounts');
      return {
        new: 0,
        in_progress: 0,
        followup: 0,
        completed: 0,
        total: 0
      };
    }

    try {
      console.log('Fetching task counts for user:', user.id, 'with role:', user.role);
      
      // Base query to apply common filters
      const createBaseQuery = () => {
        let query = supabase.from('tasks').select('*', { count: 'exact', head: true });
        return query;
      };

      // For role-based filtering, get the customer IDs first
      let customerFilter = {};
      
      if (user.role === 'agent') {
        console.log('User is agent, fetching assigned customers');
        const { data: assignedCustomers, error: assignmentError } = await supabase
          .from('user_customer_assignments')
          .select('customer_id')
          .eq('user_id', user.id);

        if (assignmentError) {
          console.error('Error fetching assigned customers:', assignmentError);
        }

        console.log('Assigned customers data:', assignedCustomers);

        if (assignedCustomers && assignedCustomers.length > 0) {
          const customerIds = assignedCustomers.map(ac => ac.customer_id);
          console.log('Customer IDs to filter by:', customerIds);
          customerFilter = { customer_id: { in: customerIds.join(',') } };
        } else {
          console.log('No assigned customers found for this agent');
          // No assigned customers, return empty counts
          return {
            new: 0,
            in_progress: 0,
            followup: 0,
            completed: 0,
            total: 0
          };
        }
      } else if (user.role === 'client') {
        console.log('User is client, fetching customer assignment');
        const { data: userAssignment, error: assignmentError } = await supabase
          .from('user_customer_assignments')
          .select('customer_id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (assignmentError) {
          console.error('Error fetching client customer assignment:', assignmentError);
        }

        console.log('Client assignment data:', userAssignment);

        if (userAssignment) {
          customerFilter = { customer_id: userAssignment.customer_id };
        } else {
          console.log('No customer assignment found for this client');
          // No customer assignment, return empty counts
          return {
            new: 0,
            in_progress: 0,
            followup: 0,
            completed: 0,
            total: 0
          };
        }
      }

      console.log('Final customer filter:', customerFilter);

      // Run count queries in parallel for better performance
      const [
        { count: newCount, error: newError },
        { count: inProgressCount, error: inProgressError },
        { count: followupCount, error: followupError },
        { count: completedCount, error: completedError },
        { count: totalCount, error: totalError }
      ] = await Promise.all([
        // New tasks
        supabase
          .from('tasks')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'new')
          .match(customerFilter),
        
        // In progress tasks
        supabase
          .from('tasks')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'in_progress')
          .match(customerFilter),
        
        // Follow-up tasks
        supabase
          .from('tasks')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'followup')
          .match(customerFilter),
        
        // Completed tasks
        supabase
          .from('tasks')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'completed')
          .match(customerFilter),
        
        // Total tasks
        supabase
          .from('tasks')
          .select('*', { count: 'exact', head: true })
          .match(customerFilter)
      ]);

      // Log results for debugging
      console.log('Task counts results:', {
        new: newCount,
        in_progress: inProgressCount,
        followup: followupCount,
        completed: completedCount,
        total: totalCount
      });

      // Log any errors
      [newError, inProgressError, followupError, completedError, totalError].forEach(error => {
        if (error) console.error('Error fetching task counts:', error);
      });

      return {
        new: newCount || 0,
        in_progress: inProgressCount || 0,
        followup: followupCount || 0,
        completed: completedCount || 0,
        total: totalCount || 0
      };
    } catch (error) {
      console.error('Error in useTaskCounts hook:', error);
      return {
        new: 0,
        in_progress: 0,
        followup: 0,
        completed: 0,
        total: 0
      };
    }
  };

  // Use React Query for efficient caching and background updates
  const { data, isLoading } = useQuery({
    queryKey: ['taskCounts', user?.id],
    queryFn: fetchTaskCounts,
    staleTime: 60000, // 1 minute
    gcTime: 300000, // 5 minutes - Updated from cacheTime to gcTime which is the modern equivalent
  });

  return {
    counts: data || {
      new: 0,
      in_progress: 0,
      followup: 0,
      completed: 0,
      total: 0
    },
    isLoading
  };
};
