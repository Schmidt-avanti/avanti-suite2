
import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { TasksTable } from '@/components/tasks/TasksTable';
import { ReportFilters } from '@/components/reports/ReportFilters';
import { ReportFilters as ReportFiltersType } from '@/hooks/useReportData';
import { useCustomers } from '@/hooks/useCustomers';
import { supabase } from '@/integrations/supabase/client';
import { usePaginatedTasks } from '@/hooks/usePaginatedTasks';
import { PaginationControls } from '@/components/ui/pagination-controls';
import { TableSkeleton } from '@/components/ui/table-skeleton';
import { useQueryClient } from '@tanstack/react-query';

const CompletedTasks = () => {
  const [filters, setFilters] = useState<ReportFiltersType>({
    customerId: null,
    fromDate: null,
    toDate: null,
    status: 'completed',
    createdBy: null,
  });
  
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 25;
  
  const { 
    tasks, 
    isLoading, 
    totalCount, 
    totalPages 
  } = usePaginatedTasks(filters.status, true, filters, currentPage, pageSize);
  
  const { customers } = useCustomers();
  const [users, setUsers] = useState<Array<{ id: string; full_name: string }>>([]);
  const queryClient = useQueryClient();

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

  // Pre-fetch next page for faster navigation
  useEffect(() => {
    if (currentPage < totalPages) {
      queryClient.prefetchQuery({
        queryKey: ['tasks', 'paginated', filters.status, currentPage + 1, pageSize, filters],
        queryFn: () => fetchTasksForPreloading(currentPage + 1)
      });
    }
  }, [currentPage, totalPages, filters]);

  // Function to prefetch tasks for smoother page transitions
  const fetchTasksForPreloading = async (page: number) => {
    // Implementation would mirror the actual data fetching logic
    // This function is just to create the prefetch query
    return null;
  };

  useEffect(() => {
    const loadUsers = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, "Full Name"');
      
      if (data) {
        setUsers(data.map(user => ({
          id: user.id,
          full_name: user["Full Name"]
        })));
      }
    };

    loadUsers();
  }, []);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    // Scroll to top when changing pages
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Abgeschlossene Aufgaben</h1>
        {!isLoading && totalCount > 0 && (
          <span className="text-muted-foreground">
            Insgesamt: {totalCount} Aufgaben
          </span>
        )}
      </div>

      <ReportFilters 
        filters={filters}
        setFilters={setFilters}
        customers={customers}
        users={users}
      />

      <Card>
        {isLoading ? (
          <TableSkeleton columnCount={6} rowCount={pageSize > 10 ? 10 : pageSize} />
        ) : (
          <TasksTable tasks={tasks} isLoading={isLoading} />
        )}
        
        {totalPages > 1 && (
          <div className="flex justify-center py-4 border-t">
            <PaginationControls 
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={handlePageChange}
            />
          </div>
        )}
      </Card>
    </div>
  );
};

export default CompletedTasks;
