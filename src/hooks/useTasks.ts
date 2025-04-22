import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Task, TaskStatus, SupabaseTaskResponse } from '@/types';

// Helper function to validate task status
const validateTaskStatus = (status: string): TaskStatus => {
  const validStatuses: TaskStatus[] = ['new', 'in_progress', 'followup', 'completed'];
  
  if (validStatuses.includes(status as TaskStatus)) {
    return status as TaskStatus;
  }
  
  console.warn(`Invalid task status: "${status}", defaulting to "new"`);
  return 'new';
};

// Helper function to safely transform creator data
const transformCreator = (creatorData: any): TaskCreator | null => {
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
export const useTasks = (statusFilter: string | null, includeCompleted: boolean = true) => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        let query = supabase
          .from('tasks')
          .select(`
            id,
            title,
            status,
            created_at,
            customer:customer_id(id, name),
            created_by(id, "Full Name")
          `)
          .order('created_at', { ascending: false });

        // Filter basierend auf Status
        if (statusFilter) {
          query = query.eq('status', statusFilter);
        } else if (!includeCompleted) {
          // Wenn includeCompleted false ist, alle Status außer 'completed' anzeigen
          query = query.neq('status', 'completed');
        } else if (includeCompleted === true) {
          // Wenn explizit nur completed Tasks angefordert werden
          query = query.eq('status', 'completed');
        }

        if (user?.role === 'agent') {
          const { data: assignedCustomers } = await supabase
            .from('user_customer_assignments')
            .select('customer_id')
            .eq('user_id', user.id);

          if (assignedCustomers && assignedCustomers.length > 0) {
            const customerIds = assignedCustomers.map(ac => ac.customer_id);
            query = query.in('customer_id', customerIds);
          }
        } else if (user?.role === 'client') {
          const { data: userAssignment } = await supabase
            .from('user_customer_assignments')
            .select('customer_id')
            .eq('user_id', user.id)
            .single();
            
          if (userAssignment) {
            query = query.eq('customer_id', userAssignment.customer_id);
          }
        }

        const { data, error } = await query;

        if (error) throw error;
        
        if (!data || data.length === 0) {
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
            customer: transformCustomer(rawTask.customer),
            creator: transformCreator(rawTask.created_by)
          };
        });
        
        setTasks(transformedTasks);
      } catch (error) {
        console.error('Error fetching tasks:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTasks();
  }, [user, statusFilter, includeCompleted]);

  return { tasks, isLoading };
};
