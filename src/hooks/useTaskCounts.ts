
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';

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
      console.log('No user found, returning zero counts');
      return {
        new: 0,
        in_progress: 0,
        followup: 0,
        completed: 0,
        total: 0
      };
    }

    try {
      console.log(`Fetching task counts for user role: ${user.role}, id: ${user.id}`);
      
      // For role-based filtering, get the customer IDs first
      let customerFilter = {};
      
      if (user.role === 'agent') {
        const { data: assignedCustomers, error: assignmentError } = await supabase
          .from('user_customer_assignments')
          .select('customer_id')
          .eq('user_id', user.id);

        if (assignmentError) {
          console.error('Error fetching assigned customers:', assignmentError);
          throw assignmentError;
        }

        console.log('Agent assigned customers:', assignedCustomers);

        if (assignedCustomers && assignedCustomers.length > 0) {
          const customerIds = assignedCustomers.map(ac => ac.customer_id);
          // Use the 'in' filter with an array directly, not a joined string
          customerFilter = { customer_id: customerIds };
          console.log('Using customer filter:', customerFilter);
        } else {
          // No assigned customers, return empty counts
          console.log('No assigned customers for this agent');
          return {
            new: 0,
            in_progress: 0,
            followup: 0,
            completed: 0,
            total: 0
          };
        }
      } else if (user.role === 'client') {
        const { data: userAssignment, error: assignmentError } = await supabase
          .from('user_customer_assignments')
          .select('customer_id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (assignmentError) {
          console.error('Error fetching client assignment:', assignmentError);
          throw assignmentError;
        }

        console.log('Client assignment:', userAssignment);

        if (userAssignment) {
          customerFilter = { customer_id: userAssignment.customer_id };
        } else {
          // No customer assignment, return empty counts
          console.log('No customer assignment for this client');
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
      // Fix the 'in' filter application
      async function runQuery(status = null) {
        let query = supabase
          .from('tasks')
          .select('*', { count: 'exact', head: true });
        
        if (status) {
          query = query.eq('status', status);
        }
        
        // Apply the customer filter
        if (user.role === 'agent' && Array.isArray(customerFilter.customer_id)) {
          query = query.in('customer_id', customerFilter.customer_id);
        } else if ((user.role === 'client' || user.role === 'agent') && !Array.isArray(customerFilter.customer_id)) {
          query = query.eq('customer_id', customerFilter.customer_id);
        }
        
        return query;
      }
      
      const [
        newCountResult,
        inProgressCountResult,
        followupCountResult,
        completedCountResult,
        totalCountResult
      ] = await Promise.all([
        runQuery('new'),
        runQuery('in_progress'),
        runQuery('followup'),
        runQuery('completed'),
        runQuery()
      ]);
      
      // Log any errors
      [newCountResult, inProgressCountResult, followupCountResult, completedCountResult, totalCountResult].forEach(result => {
        if (result.error) console.error('Error fetching task count:', result.error);
      });

      const result = {
        new: newCountResult.count || 0,
        in_progress: inProgressCountResult.count || 0,
        followup: followupCountResult.count || 0,
        completed: completedCountResult.count || 0,
        total: totalCountResult.count || 0
      };
      
      console.log('Task counts result:', result);
      return result;
      
    } catch (error) {
      console.error('Error in useTaskCounts hook:', error);
      toast({
        title: "Fehler beim Laden der Aufgabenzahlen",
        description: "Es ist ein unerwarteter Fehler aufgetreten.",
        variant: "destructive"
      });
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
    queryKey: ['taskCounts', user?.id, user?.role],
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
