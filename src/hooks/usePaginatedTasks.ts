
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Task, TaskStatus } from '@/types';
import { ReportFilters } from '@/hooks/useReportData';

// Helper function to validate task status
const validateTaskStatus = (status: string): TaskStatus => {
  const validStatuses: TaskStatus[] = ['new', 'in_progress', 'followup', 'completed'];
  
  if (validStatuses.includes(status as TaskStatus)) {
    return status as TaskStatus;
  }
  
  console.warn(`Invalid task status: "${status}", defaulting to "new"`);
  return 'new';
};

// Main hook for fetching and transforming tasks with pagination
export const usePaginatedTasks = (
  statusFilter: string | null = null, 
  includeAll: boolean = false, 
  filters?: ReportFilters, 
  page: number = 1, 
  pageSize: number = 10
) => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    const fetchTasks = async () => {
      if (!user) {
        console.log('No user found, skipping task fetch');
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        console.log(`Fetching tasks with statusFilter=${statusFilter}, includeAll=${includeAll}, page=${page}, filters=`, filters);

        // Calculate pagination ranges
        const from = (page - 1) * pageSize;
        const to = from + pageSize - 1;

        // First, get the count for pagination
        let countQuery = supabase
          .from('tasks')
          .select('id', { count: 'exact', head: true });

        // Apply status filter
        if (statusFilter && statusFilter !== 'all') {
          countQuery = countQuery.eq('status', statusFilter);
        } else if (!includeAll) {
          countQuery = countQuery.neq('status', 'completed');
        }

        // Apply additional filters
        if (filters) {
          countQuery = applyFiltersToQuery(countQuery, filters);
        }

        // Apply user role-based filtering
        countQuery = await applyRoleBasedFiltering(countQuery, user);
        
        const { count, error: countError } = await countQuery;
        
        if (countError) {
          console.error('Error counting tasks:', countError);
          setTotalCount(0);
          setTotalPages(1);
        } else {
          setTotalCount(count || 0);
          setTotalPages(Math.ceil((count || 0) / pageSize));
        }

        // Now fetch the actual data with pagination
        let query = supabase
          .from('tasks')
          .select(`
            id,
            title,
            status,
            source,
            readable_id,
            endkunde_id,
            endkunde_email,
            attachments, 
            created_at,
            created_by,
            customer_id,
            customer:customer_id(id, name),
            creator:created_by(id, "Full Name")
          `)
          .order('created_at', { ascending: false })
          .range(from, to);

        // Apply status filter
        if (statusFilter && statusFilter !== 'all') {
          query = query.eq('status', statusFilter);
        } else if (!includeAll) {
          query = query.neq('status', 'completed');
        }

        // Apply additional filters
        if (filters) {
          query = applyFiltersToQuery(query, filters);
        }

        // Apply user role-based filtering
        query = await applyRoleBasedFiltering(query, user);

        // Execute the query
        const { data, error } = await query;

        if (error) {
          console.error('Error fetching tasks:', error);
          setTasks([]);
          setIsLoading(false);
          return;
        }
        
        console.log('Raw tasks data:', data);
        
        if (!data || data.length === 0) {
          console.log('No tasks found');
          setTasks([]);
          setIsLoading(false);
          return;
        }
        
        // Transform the data with proper type safety
        const transformedTasks: Task[] = data.map((rawTask: any): Task => {
          return {
            id: rawTask.id,
            title: rawTask.title,
            status: validateTaskStatus(rawTask.status),
            created_at: rawTask.created_at,
            source: rawTask.source,
            readable_id: rawTask.readable_id,
            endkunde_id: rawTask.endkunde_id,
            endkunde_email: rawTask.endkunde_email,
            from_email: rawTask.from_email,
            customer: rawTask.customer,
            creator: rawTask.creator, 
            attachments: rawTask.attachments,
            description: rawTask.description,
            matched_use_case_id: rawTask.matched_use_case_id,
            // Add these required fields to fix TypeScript errors
            customer_id: rawTask.customer_id,
            created_by: rawTask.created_by,
            assigned_to: rawTask.assigned_to,
            closing_comment: rawTask.closing_comment
          };
        });
        
        console.log('Transformed tasks:', transformedTasks);
        setTasks(transformedTasks);
      } catch (error) {
        console.error('Error in usePaginatedTasks hook:', error);
        setTasks([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTasks();
  }, [user, statusFilter, includeAll, filters, page, pageSize]);

  // Helper function to apply filters to query
  const applyFiltersToQuery = (query: any, filters: ReportFilters) => {
    let modifiedQuery = query;
    
    if (filters.customerId) {
      modifiedQuery = modifiedQuery.eq('customer_id', filters.customerId);
    }
    
    if (filters.createdBy) {
      modifiedQuery = modifiedQuery.eq('created_by', filters.createdBy);
    }
    
    if (filters.fromDate) {
      modifiedQuery = modifiedQuery.gte('created_at', filters.fromDate.toISOString());
    }
    
    if (filters.toDate) {
      // Set the date to the end of the day for the "to" filter
      const endOfDay = new Date(filters.toDate);
      endOfDay.setHours(23, 59, 59, 999);
      modifiedQuery = modifiedQuery.lte('created_at', endOfDay.toISOString());
    }
    
    return modifiedQuery;
  };

  // Helper function to apply role-based filtering
  const applyRoleBasedFiltering = async (query: any, user: any) => {
    let modifiedQuery = query;
    
    if (user.role === 'agent') {
      const { data: assignedCustomers } = await supabase
        .from('user_customer_assignments')
        .select('customer_id')
        .eq('user_id', user.id);

      console.log('Agent assigned customers:', assignedCustomers);

      if (assignedCustomers && assignedCustomers.length > 0) {
        const customerIds = assignedCustomers.map(ac => ac.customer_id);
        modifiedQuery = modifiedQuery.in('customer_id', customerIds);
      }
    } else if (user.role === 'client') {
      const { data: userAssignment } = await supabase
        .from('user_customer_assignments')
        .select('customer_id')
        .eq('user_id', user.id)
        .maybeSingle();
        
      console.log('Client customer assignment:', userAssignment);

      if (userAssignment) {
        modifiedQuery = modifiedQuery.eq('customer_id', userAssignment.customer_id);
      }
    }
    
    return modifiedQuery;
  };

  return { 
    tasks, 
    isLoading, 
    totalCount,
    totalPages,
    currentPage: page
  };
};
