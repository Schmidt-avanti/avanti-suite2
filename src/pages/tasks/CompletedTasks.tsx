
import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { TasksTable } from '@/components/tasks/TasksTable';
import { useTasks } from '@/hooks/useTasks';
import { ReportFilters } from '@/components/reports/ReportFilters';
import { ReportFilters as ReportFiltersType } from '@/hooks/useReportData';
import { useCustomers } from '@/hooks/useCustomers';
import { supabase } from '@/integrations/supabase/client';

const CompletedTasks = () => {
  const [filters, setFilters] = useState<ReportFiltersType>({
    customerId: null,
    fromDate: null,
    toDate: null,
    status: 'completed',
    createdBy: null,
  });

  const { tasks, isLoading } = useTasks('completed', true, filters);
  const { customers } = useCustomers();
  const [users, setUsers] = useState<Array<{ id: string; full_name: string }>>([]);

  // Benutzer laden
  React.useEffect(() => {
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

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Abgeschlossene Aufgaben</h1>
      </div>

      <ReportFilters
        filters={filters}
        setFilters={setFilters}
        customers={customers}
        users={users}
      />

      <Card>
        <TasksTable tasks={tasks} isLoading={isLoading} />
      </Card>
    </div>
  );
};

export default CompletedTasks;
