
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

export const useTaskCounts = () => {
  const { user } = useAuth();
  
  const fetchTaskCounts = async () => {
    if (!user) {
      return {
        new: 0,
        in_progress: 0,
        followup: 0,
        completed: 0,
        total: 0
      };
    }

    try {
      // Base query to apply common filters
      const createBaseQuery = () => {
        let query = supabase.from('tasks').select('*', { count: 'exact', head: true });
        
        // Apply user role-based filtering
        if (user.role === 'agent') {
          // For agents, we'll fetch the assigned customer IDs in the main function
          // and then filter based on those
        } else if (user.role === 'client') {
          // Similarly, for clients, we'll handle this in the main function
        }
        
        return query;
      };

      // For role-based filtering, get the customer IDs first
      let customerFilter = {};
      
      if (user.role === 'agent') {
        const { data: assignedCustomers } = await supabase
          .from('user_customer_assignments')
          .select('customer_id')
          .eq('user_id', user.id);

        if (assignedCustomers && assignedCustomers.length > 0) {
          const customerIds = assignedCustomers.map(ac => ac.customer_id);
          customerFilter = { customer_id: { in: customerIds.join(',') } };
        } else {
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
        const { data: userAssignment } = await supabase
          .from('user_customer_assignments')
          .select('customer_id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (userAssignment) {
          customerFilter = { customer_id: userAssignment.customer_id };
        } else {
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
