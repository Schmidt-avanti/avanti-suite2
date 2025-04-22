
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Task } from '@/types';

export const useTasks = (statusFilter: string | null) => {
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
            creator:created_by(id, "Full Name")
          `)
          .order('created_at', { ascending: false });

        if (statusFilter) {
          query = query.eq('status', statusFilter);
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
        
        // Transform the data to match our Task interface with proper type safety
        const transformedData = data?.map(task => {
          // Safely check and transform creator data
          const creatorData = task.creator && typeof task.creator === 'object' 
            ? {
                id: task.creator.id as string,
                "Full Name": task.creator["Full Name"] as string
              }
            : null;
          
          // Transform task data ensuring all required fields are present
          return {
            id: task.id,
            title: task.title,
            status: task.status,
            created_at: task.created_at,
            customer: task.customer ? {
              id: task.customer.id,
              name: task.customer.name
            } : undefined,
            creator: creatorData
          } satisfies Task;
        }) || [];
        
        setTasks(transformedData);
      } catch (error) {
        console.error('Error fetching tasks:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTasks();
  }, [user, statusFilter]);

  return { tasks, isLoading };
};
