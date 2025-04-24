
import React from 'react';
import { Card } from '@/components/ui/card';
import { TasksTable } from '@/components/tasks/TasksTable';
import { useTasks } from '@/hooks/useTasks';

const CompletedTasks = () => {
  // Explizit 'completed' als String übergeben, nicht als UUID
  const { tasks, isLoading } = useTasks('completed', true);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Abgeschlossene Aufgaben</h1>
      </div>

      <Card>
        <TasksTable tasks={tasks} isLoading={isLoading} />
      </Card>
    </div>
  );
};

export default CompletedTasks;
