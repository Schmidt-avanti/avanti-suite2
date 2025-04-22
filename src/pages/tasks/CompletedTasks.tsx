
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { TasksTable } from '@/components/tasks/TasksTable';
import { useTasks } from '@/hooks/useTasks';

const CompletedTasks = () => {
  const { tasks, isLoading } = useTasks('completed');

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
