
import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { TaskStatusBadge } from './TaskStatusBadge';
import { formatDistanceToNow } from 'date-fns';
import { de } from 'date-fns/locale';
import type { Task } from '@/types';
import { useIsMobile } from '@/hooks/use-mobile';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';

interface TasksTableProps {
  tasks: Task[];
  isLoading?: boolean;
}

export const TasksTable: React.FC<TasksTableProps> = ({ tasks, isLoading = false }) => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const handleRowClick = (taskId: string) => {
    navigate(`/tasks/${taskId}`);
  };

  if (isLoading) {
    return (
      <div className="w-full py-8">
        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-900"></div>
        </div>
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">Keine Aufgaben gefunden</p>
      </div>
    );
  }

  // Mobile card view
  if (isMobile) {
    return (
      <div className="space-y-4">
        {tasks.map((task) => (
          <Card 
            key={task.id} 
            className="hover:bg-gray-50 cursor-pointer" 
            onClick={() => handleRowClick(task.id)}
          >
            <CardContent className="p-4">
              <div className="flex justify-between items-start mb-3">
                <div className="font-medium truncate max-w-[70%]">{task.title}</div>
                <TaskStatusBadge status={task.status} />
              </div>
              
              <div className="text-sm text-gray-500 mb-2 line-clamp-2">
                {task.description || 'Keine Beschreibung'}
              </div>
              
              <div className="flex justify-between items-center text-xs text-gray-500 mt-2">
                <div>
                  {task.created_at && formatDistanceToNow(new Date(task.created_at), { addSuffix: true, locale: de })}
                </div>
                <div>
                  {task.customer?.name || 'Kein Kunde'}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // Desktop table view
  return (
    <ScrollArea className="w-full">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Titel</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Quelle</TableHead>
            <TableHead>Kunde</TableHead>
            <TableHead>Erstellt am</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tasks.map((task) => (
            <TableRow 
              key={task.id}
              onClick={() => handleRowClick(task.id)}
              className="cursor-pointer hover:bg-gray-50 transition-colors"
            >
              <TableCell className="font-medium">{task.title}</TableCell>
              <TableCell className="max-w-xs truncate">{task.status}</TableCell>
              <TableCell>
                <TaskStatusBadge status={task.source} />
              </TableCell>
              <TableCell>{task.customer?.name || '-'}</TableCell>
              <TableCell>
                {task.created_at && formatDistanceToNow(new Date(task.created_at), { addSuffix: true, locale: de })}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </ScrollArea>
  );
};
