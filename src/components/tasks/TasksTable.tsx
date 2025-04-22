
import { useNavigate } from 'react-router-dom';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TaskStatusBadge } from './TaskStatusBadge';
import type { Task } from '@/types';

interface TasksTableProps {
  tasks: Task[];
  isLoading: boolean;
}

export const TasksTable = ({ tasks, isLoading }: TasksTableProps) => {
  const navigate = useNavigate();

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Titel</TableHead>
          <TableHead>Kunde</TableHead>
          <TableHead>Erstellt von</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Datum</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {isLoading ? (
          <TableRow>
            <TableCell colSpan={5} className="text-center">Lädt...</TableCell>
          </TableRow>
        ) : tasks.length === 0 ? (
          <TableRow>
            <TableCell colSpan={5} className="text-center">Keine Aufgaben gefunden</TableCell>
          </TableRow>
        ) : (
          tasks.map((task) => (
            <TableRow 
              key={task.id}
              className="cursor-pointer hover:bg-muted/50"
              onClick={() => navigate(`/tasks/${task.id}`)}
            >
              <TableCell>{task.title}</TableCell>
              <TableCell>{task.customer?.name || '-'}</TableCell>
              <TableCell>{task.creator?.["Full Name"] || '-'}</TableCell>
              <TableCell>
                <TaskStatusBadge status={task.status} />
              </TableCell>
              <TableCell>
                {new Date(task.created_at).toLocaleDateString('de-DE')}
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
};
