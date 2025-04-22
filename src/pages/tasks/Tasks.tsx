
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { PlusIcon } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TasksTable } from '@/components/tasks/TasksTable';
import { useTasks } from '@/hooks/useTasks';

const Tasks = () => {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const { tasks, isLoading } = useTasks(statusFilter);

  // Handler function to convert 'all' to null
  const handleStatusChange = (value: string) => {
    setStatusFilter(value === 'all' ? null : value);
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
                <SelectItem value="completed">Abgeschlossen</SelectItem>
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
