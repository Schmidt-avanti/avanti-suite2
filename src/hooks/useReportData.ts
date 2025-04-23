
import { useMemo } from 'react';
import type { Task, TaskStatus, TaskCreator } from '@/types';

interface UseReportDataProps {
  tasks: Task[];
  dateRange: {
    from: Date | undefined;
    to: Date | undefined;
  };
  customerId: string | null;
  creatorId: string | null;
  statusFilter: TaskStatus | null;
}

interface KpiData {
  totalTasks: number;
  newTasks: number;
  completedTasks: number;
  activeCustomers: number;
}

interface WeekdayData {
  name: string;
  value: number;
}

interface TrendData {
  date: string;
  count: number;
}

export const useReportData = ({
  tasks,
  dateRange,
  customerId,
  creatorId,
  statusFilter
}: UseReportDataProps) => {
  
  // Apply all filters to tasks
  const filteredTasks = useMemo(() => {
    if (!tasks.length) return [];
    
    return tasks.filter(task => {
      // Apply date range filter if set
      if (dateRange.from || dateRange.to) {
        const taskDate = new Date(task.created_at);
        
        if (dateRange.from && taskDate < dateRange.from) {
          return false;
        }
        
        if (dateRange.to) {
          // Add one day to include the end date fully
          const endDate = new Date(dateRange.to);
          endDate.setDate(endDate.getDate() + 1);
          
          if (taskDate > endDate) {
            return false;
          }
        }
      }
      
      // Apply customer filter if set
      if (customerId && task.customer?.id !== customerId) {
        return false;
      }
      
      // Apply creator filter if set
      if (creatorId && task.creator?.id !== creatorId) {
        return false;
      }
      
      // Status filter is already applied in the useTasks hook
      return true;
    });
  }, [tasks, dateRange, customerId, creatorId, statusFilter]);
  
  // Extract unique creators for the filter dropdown
  const creators = useMemo(() => {
    if (!tasks.length) return [];
    
    const uniqueCreators = new Map<string, TaskCreator>();
    
    tasks.forEach(task => {
      if (task.creator && task.creator.id) {
        uniqueCreators.set(task.creator.id, task.creator);
      }
    });
    
    return Array.from(uniqueCreators.values());
  }, [tasks]);
  
  // Calculate KPI data
  const kpiData = useMemo((): KpiData => {
    if (!filteredTasks.length) {
      return {
        totalTasks: 0,
        newTasks: 0,
        completedTasks: 0,
        activeCustomers: 0
      };
    }
    
    const newTasks = filteredTasks.filter(task => task.status === 'new').length;
    const completedTasks = filteredTasks.filter(task => task.status === 'completed').length;
    
    // Count unique active customers
    const uniqueCustomers = new Set<string>();
    filteredTasks.forEach(task => {
      if (task.customer?.id) {
        uniqueCustomers.add(task.customer.id);
      }
    });
    
    return {
      totalTasks: filteredTasks.length,
      newTasks,
      completedTasks,
      activeCustomers: uniqueCustomers.size
    };
  }, [filteredTasks]);
  
  // Calculate tasks by weekday
  const tasksByWeekday = useMemo((): WeekdayData[] => {
    if (!filteredTasks.length) {
      // Return empty data structure for the chart
      return [
        { name: 'Mo', value: 0 },
        { name: 'Di', value: 0 },
        { name: 'Mi', value: 0 },
        { name: 'Do', value: 0 },
        { name: 'Fr', value: 0 },
        { name: 'Sa', value: 0 },
        { name: 'So', value: 0 }
      ];
    }
    
    // Count tasks by weekday
    const weekdayCounts = [0, 0, 0, 0, 0, 0, 0]; // Mon-Sun
    
    filteredTasks.forEach(task => {
      const date = new Date(task.created_at);
      const weekday = date.getDay(); // 0 = Sunday, 1 = Monday, ...
      
      // Adjust to have Monday as first day (0 = Monday, ..., 6 = Sunday)
      const adjustedWeekday = weekday === 0 ? 6 : weekday - 1;
      weekdayCounts[adjustedWeekday]++;
    });
    
    // Map counts to named weekday data
    const weekdayNames = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
    return weekdayNames.map((name, index) => ({
      name,
      value: weekdayCounts[index]
    }));
  }, [filteredTasks]);
  
  // Calculate task activity trend (by week)
  const taskActivityTrend = useMemo((): TrendData[] => {
    if (!filteredTasks.length) {
      // Return at least a few empty points
      const result: TrendData[] = [];
      const now = new Date();
      
      for (let i = 4; i >= 0; i--) {
        const date = new Date();
        date.setDate(now.getDate() - (i * 7));
        result.push({
          date: `${date.getDate()}.${date.getMonth() + 1}`,
          count: 0
        });
      }
      
      return result;
    }
    
    // Group tasks by week
    const weekMap = new Map<string, number>();
    
    // Sort tasks by date
    const sortedTasks = [...filteredTasks].sort((a, b) => 
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
    
    if (!sortedTasks.length) return [];
    
    // Determine date range from tasks or use the past 5 weeks
    let startDate = new Date(sortedTasks[0].created_at);
    const endDate = new Date(sortedTasks[sortedTasks.length - 1].created_at);
    
    // Ensure at least 5 weeks of data or use all available data
    const minStartDate = new Date(endDate);
    minStartDate.setDate(minStartDate.getDate() - 35); // 5 weeks
    
    if (startDate > minStartDate) {
      startDate = minStartDate;
    }
    
    // Populate weeks map
    const weekKeys: string[] = [];
    let currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      const weekKey = `${currentDate.getDate()}.${currentDate.getMonth() + 1}`;
      weekMap.set(weekKey, 0);
      weekKeys.push(weekKey);
      
      // Move to next week
      currentDate.setDate(currentDate.getDate() + 7);
    }
    
    // Count tasks by week
    sortedTasks.forEach(task => {
      const taskDate = new Date(task.created_at);
      
      // Find the closest week key
      let closestWeekKey = weekKeys[0];
      let minDiff = Math.abs(taskDate.getTime() - new Date(startDate).getTime());
      
      for (let i = 1; i < weekKeys.length; i++) {
        const weekDate = new Date(startDate);
        weekDate.setDate(weekDate.getDate() + (i * 7));
        
        const diff = Math.abs(taskDate.getTime() - weekDate.getTime());
        if (diff < minDiff) {
          minDiff = diff;
          closestWeekKey = weekKeys[i];
        }
      }
      
      // Increment count for the week
      weekMap.set(closestWeekKey, (weekMap.get(closestWeekKey) || 0) + 1);
    });
    
    // Convert map to array for the chart
    return weekKeys.map(date => ({
      date,
      count: weekMap.get(date) || 0
    }));
  }, [filteredTasks]);
  
  return {
    filteredTasks,
    kpiData,
    creators,
    tasksByWeekday,
    taskActivityTrend
  };
};
