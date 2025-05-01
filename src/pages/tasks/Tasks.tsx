
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { PlusIcon } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TasksTable } from '@/components/tasks/TasksTable';
import { useTasks } from '@/hooks/useTasks';
import { useTaskCounts } from '@/hooks/useTaskCounts';
import type { TaskStatus } from '@/types';
import { useIsMobile } from '@/hooks/use-mobile';
import { useQueryClient } from '@tanstack/react-query';
import { TableSkeleton } from '@/components/ui/table-skeleton';

const Tasks = () => {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<TaskStatus | null>(null);
  const { tasks, isLoading } = useTasks(statusFilter, false);
  const { counts } = useTaskCounts();
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();

  // Prefetch data when component loads
  useEffect(() => {
    // Prefetch task counts for dashboard
    queryClient.prefetchQuery({ queryKey: ['taskCounts'] });
    
    // Prefetch tasks with common filters
    ['new', 'in_progress', 'followup'].forEach(status => {
      queryClient.prefetchQuery({
        queryKey: ['tasks', status, false],
        staleTime: 30000 // 30 seconds
      });
    });
  }, [queryClient]);

  // Handler function for the status filter
  const handleStatusChange = (value: string) => {
    setStatusFilter(value === 'all' ? null : value as TaskStatus);
  };

  return (
    <div className="space-y-4">
      <div className={`flex ${isMobile ? 'flex-col space-y-3' : 'justify-between items-center'}`}>
        <h1 className="text-2xl font-bold">Aufgaben</h1>
        <div className={`flex ${isMobile ? 'flex-col space-y-2 w-full' : 'space-x-2'}`}>
          <div className={`flex items-center ${isMobile ? 'w-full' : ''}`}>
            <Select
              value={statusFilter || 'all'}
              onValueChange={handleStatusChange}
            >
              <SelectTrigger className={isMobile ? 'w-full' : 'w-[180px]'}>
                <SelectValue placeholder="Status filtern" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle Status ({counts.total - counts.completed})</SelectItem>
                <SelectItem value="new">Neu ({counts.new})</SelectItem>
                <SelectItem value="in_progress">In Bearbeitung ({counts.in_progress})</SelectItem>
                <SelectItem value="followup">Auf Wiedervorlage ({counts.followup})</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={() => navigate('/tasks/create')} className={isMobile ? 'w-full' : ''}>
            <PlusIcon className="w-4 h-4 mr-2" />
            Neue Aufgabe
          </Button>
        </div>
      </div>

      <Card>
        {isLoading ? (
          <TableSkeleton columnCount={6} rowCount={10} />
        ) : (
          <TasksTable tasks={tasks} isLoading={isLoading} />
        )}
      </Card>
    </div>
  );
};

export default Tasks;
