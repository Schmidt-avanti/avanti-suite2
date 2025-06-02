
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useSearch } from '@/contexts/SearchContext';
import { Card } from '@/components/ui/card';
import { PlusIcon } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TasksTable } from '@/components/tasks/TasksTable';
import { useTaskCounts } from '@/hooks/useTaskCounts';
import type { TaskStatus } from '@/types';
import { useIsMobile } from '@/hooks/use-mobile';
import { useQueryClient } from '@tanstack/react-query';
import { TableSkeleton } from '@/components/ui/table-skeleton';
import { usePaginatedTasks } from '@/hooks/usePaginatedTasks';
import { PaginationControls } from '@/components/ui/pagination-controls';

const Tasks = () => {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<TaskStatus | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const { searchQuery } = useSearch();
  const pageSize = 10;
  
  // Use the paginated tasks hook instead of useTasks
  const { tasks, isLoading, totalPages } = usePaginatedTasks(
    statusFilter, 
    false, 
    undefined, 
    currentPage, 
    pageSize,
    searchQuery
  );
  
  const { counts } = useTaskCounts();
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();

  // Reset to page 1 when status filter or search query changes
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, searchQuery]);

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
    
    // Prefetch next page for smoother navigation
    if (currentPage < totalPages) {
      queryClient.prefetchQuery({
        queryKey: ['tasks', 'paginated', statusFilter, currentPage + 1, pageSize, searchQuery],
        staleTime: 30000
      });
    }
  }, [queryClient, statusFilter, currentPage, totalPages, pageSize]);

  // Handler function for the status filter
  const handleStatusChange = (value: string) => {
    setStatusFilter(value === 'all' ? null : value as TaskStatus);
  };
  
  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    // Scroll to top when changing pages
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
          <>
            <TasksTable tasks={tasks} isLoading={isLoading} />
            
            {totalPages > 1 && (
              <div className="flex justify-center py-4 border-t">
                <PaginationControls 
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={handlePageChange}
                />
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
};

export default Tasks;
