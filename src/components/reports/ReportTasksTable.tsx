
import React from 'react';
import { format, parseISO } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { TaskStatusBadge } from '@/components/tasks/TaskStatusBadge';
import type { Task } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ReportTasksTableProps {
  tasks: Task[];
}

const ReportTasksTable: React.FC<ReportTasksTableProps> = ({ tasks }) => {
  const navigate = useNavigate();
  console.log('ReportTasksTable - tasks received:', tasks);

  const handleRowClick = (taskId: string) => {
    navigate(`/tasks/${taskId}`);
  };

  return (
    <Card className="mt-6 shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg">Aufgabenliste</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Titel</TableHead>
                <TableHead>Kunde</TableHead>
                <TableHead>Erstellungsdatum</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Erstellt von</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tasks && tasks.length > 0 ? (
                tasks.map((task) => (
                  <TableRow 
                    key={task.id}
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => handleRowClick(task.id)}
                  >
                    <TableCell className="font-medium">{task.title}</TableCell>
                    <TableCell>{task.customer?.name || '-'}</TableCell>
                    <TableCell>
                      {format(parseISO(task.created_at), 'dd.MM.yyyy HH:mm')}
                    </TableCell>
                    <TableCell>
                      <TaskStatusBadge status={task.status} />
                    </TableCell>
                    <TableCell>{task.creator?.["Full Name"] || '-'}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-4">
                    Keine Aufgaben gefunden
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default ReportTasksTable;
