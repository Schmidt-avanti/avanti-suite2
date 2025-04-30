
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from 'date-fns';
import { de } from 'date-fns/locale';
import { TaskStatusBadge } from './TaskStatusBadge';
import type { TaskStatus } from '@/types';
import { useIsMobile } from '@/hooks/use-mobile';

interface Task {
  id: string;
  title: string;
  status: TaskStatus;
  created_at: string;
  customer?: {
    name: string;
  };
  assignee?: {
    "Full Name": string;
  };
  readable_id?: string;
  endkunde_id?: string;
  source?: string;
}

interface TasksTableProps {
  tasks: Task[];
  isLoading: boolean;
}

export const TasksTable: React.FC<TasksTableProps> = ({ tasks, isLoading }) => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const handleRowClick = (taskId: string) => {
    navigate(`/tasks/${taskId}`);
  };

  const getSourceLabel = (source?: string) => {
    if (!source) return 'Unbekannt';
    
    switch(source.toLowerCase()) {
      case 'email':
        return 'E-Mail';
      case 'manual':
        return 'Manuell';
      case 'form':
        return 'Formular';
      default:
        return source;
    }
  };

  if (isLoading) {
    return (
      <div className="p-4 text-center">
        <p>Lade Aufgaben...</p>
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground">Keine Aufgaben gefunden.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            {!isMobile && <TableHead className="w-[100px]">ID</TableHead>}
            <TableHead>Titel</TableHead>
            <TableHead>Status</TableHead>
            {!isMobile && <TableHead>Kunde</TableHead>}
            <TableHead>Quelle</TableHead>
            <TableHead className="text-right">Erstellt</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tasks.map((task) => (
            <TableRow 
              key={task.id} 
              className="cursor-pointer hover:bg-muted/50"
              onClick={() => handleRowClick(task.id)}
            >
              {!isMobile && (
                <TableCell className="font-mono text-xs">
                  {task.readable_id || '-'}
                </TableCell>
              )}
              <TableCell className="font-medium">
                {task.title}
                {task.endkunde_id && (
                  <Badge variant="outline" className="ml-2 bg-blue-50">Endkunde</Badge>
                )}
              </TableCell>
              <TableCell>
                <TaskStatusBadge status={task.status} />
              </TableCell>
              {!isMobile && (
                <TableCell>{task.customer?.name || 'Unbekannt'}</TableCell>
              )}
              <TableCell>
                {getSourceLabel(task.source)}
              </TableCell>
              <TableCell className="text-right text-muted-foreground text-sm">
                {formatDistanceToNow(new Date(task.created_at), { 
                  addSuffix: true,
                  locale: de 
                })}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
