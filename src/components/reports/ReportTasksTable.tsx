
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TaskStatusBadge } from '@/components/tasks/TaskStatusBadge';
import type { Task } from '@/types';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

interface ReportTasksTableProps {
  tasks: Task[];
  isLoading: boolean;
}

export const ReportTasksTable = ({ tasks, isLoading }: ReportTasksTableProps) => {
  const navigate = useNavigate();

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return format(date, 'dd.MM.yyyy HH:mm', { locale: de });
  };

  return (
    <div className="rounded-md border overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Titel</TableHead>
              <TableHead>Kunde</TableHead>
              <TableHead>Erstellt am</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Erstellt von</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  Lade Aufgaben...
                </TableCell>
              </TableRow>
            ) : tasks.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  Keine Aufgaben gefunden
                </TableCell>
              </TableRow>
            ) : (
              tasks.map((task) => (
                <TableRow 
                  key={task.id} 
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => navigate(`/tasks/${task.id}`)}
                >
                  <TableCell className="font-medium">{task.title}</TableCell>
                  <TableCell>{task.customer?.name || '-'}</TableCell>
                  <TableCell>{formatDateTime(task.created_at)}</TableCell>
                  <TableCell>
                    <TaskStatusBadge status={task.status} />
                  </TableCell>
                  <TableCell>{task.creator?.["Full Name"] || '-'}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
