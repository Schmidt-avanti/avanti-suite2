import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Task, TaskStatus } from '@/types';
import { ReportFilters } from '@/hooks/useReportData';

// Helper function to validate task status
const validateTaskStatus = (status: string): TaskStatus => {
  const validStatuses: TaskStatus[] = ['new', 'in progress', 'followup', 'completed', 'blocked'];
  
  if (validStatuses.includes(status as TaskStatus)) {
    return status as TaskStatus;
  }
  
  // Handle the case where we might get 'in_progress' from the database
  if (status === 'in_progress') {
    return 'in progress';
  }
  
  console.warn(`Invalid task status: "${status}", defaulting to "new"`);
  return 'new';
};

// Helper function to safely transform creator data
const transformCreator = (creatorData: any) => {
  if (!creatorData || typeof creatorData !== 'object') {
    return null;
  }
  
  if (!creatorData.id || !creatorData["Full Name"]) {
    console.warn('Incomplete creator data:', creatorData);
    return null;
  }
  
  return {
    id: creatorData.id,
    "Full Name": creatorData["Full Name"]
  };
};

// Helper function to safely transform customer data
const transformCustomer = (customerData: any) => {
  if (!customerData || typeof customerData !== 'object') {
    return undefined;
  }
  
  if (!customerData.id || !customerData.name) {
    console.warn('Incomplete customer data:', customerData);
    return undefined;
  }
  
  return {
    id: customerData.id,
    name: customerData.name
  };
};

// Main hook for fetching and transforming tasks
export const useTasks = (statusFilter: string | null = null, includeAll: boolean = false, filters?: ReportFilters) => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchTasks = async () => {
      if (!user) {
        console.log('No user found, skipping task fetch');
        setIsLoading(false);
        return;
      }

      try {
        console.log(`Fetching tasks with statusFilter=${statusFilter}, includeAll=${includeAll}, filters=`, filters);

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
            customer:customer_id(id, name)
          `)
          .order('created_at', { ascending: false });

        // Status Filter
        if (statusFilter && statusFilter !== 'all') {
          query = query.eq('status', statusFilter);
        } else if (!includeAll) {
          query = query.neq('status', 'completed');
        }

        // Zusätzliche Filter
        if (filters) {
          if (filters.customerId) {
            query = query.eq('customer_id', filters.customerId);
          }
          
          if (filters.createdBy) {
            query = query.eq('created_by', filters.createdBy);
          }
          
          if (filters.fromDate) {
            query = query.gte('created_at', filters.fromDate.toISOString());
          }
          
          if (filters.toDate) {
            // Setze das Datum auf Ende des Tages für den "bis" Filter
            const endOfDay = new Date(filters.toDate);
            endOfDay.setHours(23, 59, 59, 999);
            query = query.lte('created_at', endOfDay.toISOString());
          }
        }

        // Apply user role-based filtering
        if (user.role === 'agent') {
          const { data: assignedCustomers } = await supabase
            .from('user_customer_assignments')
            .select('customer_id')
            .eq('user_id', user.id);

          console.log('Agent assigned customers:', assignedCustomers);

          if (assignedCustomers && assignedCustomers.length > 0) {
            const customerIds = assignedCustomers.map(ac => ac.customer_id);
            query = query.in('customer_id', customerIds);
          }
        } else if (user.role === 'client') {
          const { data: userAssignment } = await supabase
            .from('user_customer_assignments')
            .select('customer_id')
            .eq('user_id', user.id)
            .maybeSingle();
            
          console.log('Client customer assignment:', userAssignment);

          if (userAssignment) {
            query = query.eq('customer_id', userAssignment.customer_id);
          }
        }

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
        
        // Now separately fetch creator information for each task
        const tasksWithCreator = await Promise.all(data.map(async (task: any) => {
          try {
            // Fetch the creator profile if created_by exists
            if (task.created_by) {
              const { data: creatorData, error: creatorError } = await supabase
                .from('profiles')
                .select('id, "Full Name"')
                .eq('id', task.created_by)
                .maybeSingle();
              
              if (creatorError) {
                console.warn('Error fetching creator:', creatorError);
                return { ...task, creator: null };
              }
              
              return {
                ...task,
                creator: creatorData ? transformCreator(creatorData) : null
              };
            }
            return { ...task, creator: null };
          } catch (err) {
            console.error('Error processing task creator:', err);
            return { ...task, creator: null };
          }
        }));
        
        // Transform the data with proper type safety
        const transformedTasks: Task[] = tasksWithCreator.map((rawTask: any): Task => {
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
            customer: transformCustomer(rawTask.customer),
            creator: rawTask.creator, 
            attachments: rawTask.attachments,
            description: rawTask.description,
            matched_use_case_id: rawTask.matched_use_case_id,
            customer_id: rawTask.customer_id,
            created_by: rawTask.created_by,
            assigned_to: rawTask.assigned_to || ""
          };
        });
        
        console.log('Transformed tasks:', transformedTasks);
        setTasks(transformedTasks);
      } catch (error) {
        console.error('Error in useTasks hook:', error);
        setTasks([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTasks();
  }, [user, statusFilter, includeAll, filters]);

  return { tasks, isLoading };
};
