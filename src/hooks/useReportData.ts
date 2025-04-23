
import { useState, useMemo } from 'react';
import { format, subDays, parseISO, isAfter, isBefore, isEqual } from 'date-fns';
import { useTasks } from './useTasks';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import type { Task, TaskStatus } from '@/types';

export interface ReportFilters {
  customerId: string | null;
  fromDate: Date | null;
  toDate: Date | null;
  status: string | null;
  createdBy: string | null;
}

interface ChartData {
  name: string;
  value: number;
}

export const useReportData = () => {
  const { user } = useAuth();
  const [filters, setFilters] = useState<ReportFilters>({
    customerId: null,
    fromDate: subDays(new Date(), 30),
    toDate: new Date(),
    status: null,
    createdBy: null,
  });

  const [customers, setCustomers] = useState<Array<{ id: string; name: string }>>([]);
  const [users, setUsers] = useState<Array<{ id: string; full_name: string }>>([]);
  const [isLoading, setIsLoading] = useState(true);

  const { tasks, isLoading: isTasksLoading } = useTasks(null, true);
  
  // Fetch customers
  useMemo(() => {
    const fetchCustomers = async () => {
      try {
        let query = supabase.from('customers').select('id, name').order('name');
        
        if (user?.role === 'agent') {
          const { data: assignedCustomers } = await supabase
            .from('user_customer_assignments')
            .select('customer_id')
            .eq('user_id', user.id);

          if (assignedCustomers && assignedCustomers.length > 0) {
            const customerIds = assignedCustomers.map(ac => ac.customer_id);
            query = query.in('id', customerIds);
          }
        } else if (user?.role === 'client') {
          const { data: userAssignment } = await supabase
            .from('user_customer_assignments')
            .select('customer_id')
            .eq('user_id', user.id)
            .single();
            
          if (userAssignment) {
            query = query.eq('id', userAssignment.customer_id);
          }
        }

        const { data, error } = await query;
        if (error) throw error;
        
        setCustomers(data || []);
      } catch (error) {
        console.error('Error fetching customers:', error);
      }
    };

    fetchCustomers();
  }, [user]);

  // Fetch users
  useMemo(() => {
    const fetchUsers = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, "Full Name"');

        if (error) throw error;
        
        const formattedUsers = data ? data.map(user => ({
          id: user.id,
          full_name: user["Full Name"]
        })) : [];
        
        setUsers(formattedUsers);
      } catch (error) {
        console.error('Error fetching users:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUsers();
  }, []);

  // Filter tasks based on current filters
  const filteredTasks = useMemo(() => {
    if (isTasksLoading) return [];
    
    return tasks.filter((task: Task) => {
      // Filter by customer
      if (filters.customerId && (!task.customer || task.customer.id !== filters.customerId)) {
        return false;
      }

      // Filter by date range
      if (filters.fromDate || filters.toDate) {
        const taskDate = parseISO(task.created_at);
        
        if (filters.fromDate && isBefore(taskDate, filters.fromDate) && !isEqual(taskDate, filters.fromDate)) {
          return false;
        }
        
        if (filters.toDate && isAfter(taskDate, filters.toDate) && !isEqual(taskDate, filters.toDate)) {
          return false;
        }
      }

      // Filter by status
      if (filters.status && task.status !== filters.status) {
        return false;
      }

      // Filter by created by
      if (filters.createdBy && (!task.creator || task.creator.id !== filters.createdBy)) {
        return false;
      }

      return true;
    });
  }, [tasks, filters, isTasksLoading]);

  // Calculate weekly task distribution (for bar chart)
  const weekdayDistribution = useMemo(() => {
    const days = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
    const distribution = days.map(day => ({ name: day, value: 0 }));
    
    filteredTasks.forEach((task: Task) => {
      const date = parseISO(task.created_at);
      const dayIndex = date.getDay(); // 0 = Sunday, 1 = Monday, etc.
      distribution[dayIndex].value += 1;
    });
    
    // Reorder to start with Monday
    const mondayToSunday = [...distribution.slice(1), distribution[0]];
    return mondayToSunday;
  }, [filteredTasks]);

  // Calculate tasks by week (for line chart)
  const tasksByWeek = useMemo(() => {
    const weeks: Record<string, number> = {};
    const sortedWeeks: ChartData[] = [];
    const weekKeys: string[] = [];
    
    filteredTasks.forEach((task: Task) => {
      const date = parseISO(task.created_at);
      // Format as YYYY-WW (year and week number)
      const weekKey = format(date, 'yyyy-w');
      const weekLabel = `KW ${format(date, 'w')}`;
      
      if (!weeks[weekKey]) {
        weeks[weekKey] = 0;
        sortedWeeks.push({ name: weekLabel, value: 0 });
        weekKeys.push(weekKey);
      }
      
      weeks[weekKey] += 1;
    });
    
    // Update values in sorted weeks array
    sortedWeeks.forEach((week, index) => {
      week.value = weeks[weekKeys[index]];
    });
    
    // Sort by week key
    return sortedWeeks.sort((a, b) => {
      const indexA = weekKeys.findIndex(key => weeks[key] === a.value);
      const indexB = weekKeys.findIndex(key => weeks[key] === b.value);
      return weekKeys[indexA].localeCompare(weekKeys[indexB]);
    });
  }, [filteredTasks]);

  // Calculate KPI data
  const kpiData = useMemo(() => {
    const totalTasks = filteredTasks.length;
    
    const newTasks = filteredTasks.filter(task => task.status === 'new').length;
    
    const completedTasks = filteredTasks.filter(task => task.status === 'completed').length;
    
    // Get unique customers from filtered tasks
    const uniqueCustomers = new Set();
    filteredTasks.forEach(task => {
      if (task.customer) {
        uniqueCustomers.add(task.customer.id);
      }
    });

    return {
      totalTasks,
      newTasks,
      completedTasks,
      activeCustomers: uniqueCustomers.size
    };
  }, [filteredTasks]);

  return {
    filters,
    setFilters,
    tasks: filteredTasks,
    customers,
    users,
    isLoading: isLoading || isTasksLoading,
    weekdayDistribution,
    tasksByWeek,
    kpiData
  };
};
