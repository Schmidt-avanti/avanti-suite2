
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { PlusIcon } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TasksTable } from '@/components/tasks/TasksTable';
import { useTasks } from '@/hooks/useTasks';
import type { TaskStatus } from '@/types';

const Tasks = () => {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<TaskStatus | null>(null);
  // Holen nur die aktiven (nicht abgeschlossenen) Aufgaben
  const { tasks, isLoading } = useTasks(statusFilter, false);

  // Handler function für den Status-Filter
  const handleStatusChange = (value: string) => {
    setStatusFilter(value === 'all' ? null : value as TaskStatus);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Aufgaben</h1>
        <div className="flex space-x-2">
          <div className="flex items-center">
            <Select
              value={statusFilter || 'all'}
              onValueChange={handleStatusChange}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Status filtern" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle Status</SelectItem>
                <SelectItem value="new">Neu</SelectItem>
                <SelectItem value="in_progress">In Bearbeitung</SelectItem>
                <SelectItem value="followup">Auf Wiedervorlage</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={() => navigate('/tasks/create')}>
            <PlusIcon className="w-4 h-4 mr-2" />
            Neue Aufgabe
          </Button>
        </div>
      </div>

      <Card>
        <TasksTable tasks={tasks} isLoading={isLoading} />
      </Card>
    </div>
  );
};

export default Tasks;
