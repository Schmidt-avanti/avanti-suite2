import React, { memo, useState } from 'react';
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
import { StickyNote } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

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
  follow_up_date?: string; // Wiedervorlage-Datum hinzugefügt
  followup_note?: string; // Followup-Notiz hinzugefügt
}

interface TasksTableProps {
  tasks: Task[];
  isLoading: boolean;
  onStatusHeaderClick?: () => void;
  sortField?: string;
  sortOrder?: 'asc' | 'desc';
}

// Memoize individual rows for better performance with large datasets
const TaskRow = memo(({ task, isMobile, onRowClick }: { 
  task: Task, 
  isMobile: boolean,
  onRowClick: (id: string) => void 
}) => {
  const [isNoteDialogOpen, setIsNoteDialogOpen] = useState(false);
  
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

  const handleNoteClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent row click
    setIsNoteDialogOpen(true);
  };

  return (
    <TableRow 
      className="cursor-pointer hover:bg-muted/50 h-20" // Fixed height for consistent rows
      onClick={() => onRowClick(task.id)}
    >
      {!isMobile && (
        <TableCell className="font-mono text-xs align-middle">
          {task.readable_id || '-'}
        </TableCell>
      )}
      <TableCell className="font-medium align-middle">
        <div className="flex items-center gap-2">
          <span>{task.title}</span>
          {task.endkunde_id && (
            <Badge variant="outline" className="bg-blue-50 text-xs">Endkunde</Badge>
          )}
        </div>
      </TableCell>
      <TableCell className="align-middle">
        <div className="flex flex-col gap-1 items-center">
          <TaskStatusBadge status={task.status} follow_up_date={task.follow_up_date} />
          {task.followup_note && (
            <TooltipProvider>
              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <div className="flex items-center justify-center w-6 h-6 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors cursor-help">
                    <StickyNote className="h-4 w-4" />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs z-50">
                  <p className="text-xs whitespace-pre-wrap">{task.followup_note}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </TableCell>
      {!isMobile && (
        <TableCell className="align-middle">{task.customer?.name || 'Unbekannt'}</TableCell>
      )}
      {!isMobile && (
        <TableCell className="align-middle">{task.assignee?.["Full Name"] || 'Nicht zugewiesen'}</TableCell>
      )}
      <TableCell className="align-middle">
        {getSourceLabel(task.source)}
      </TableCell>
      <TableCell className="text-right text-muted-foreground text-sm align-middle">
        {formatDistanceToNow(new Date(task.created_at), { 
          addSuffix: true,
          locale: de 
        })}
      </TableCell>
    </TableRow>
  );
});

TaskRow.displayName = 'TaskRow';

export const TasksTable: React.FC<TasksTableProps> = ({ tasks, isLoading, onStatusHeaderClick, sortField, sortOrder }) => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const handleRowClick = (taskId: string) => {
    navigate(`/tasks/${taskId}`);
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
            <TableHead
              className="cursor-pointer select-none"
              onClick={onStatusHeaderClick}
              title="Nach Wiedervorlage sortieren"
            >
              Status
              {sortField === 'follow_up_date' && (
                <span className="ml-1 align-middle">
                  {sortOrder === 'asc' ? '▲' : '▼'}
                </span>
              )}
            </TableHead>
            {!isMobile && <TableHead>Kunde</TableHead>}
            {!isMobile && <TableHead>Agent</TableHead>}
            <TableHead>Quelle</TableHead>
            <TableHead className="text-right">Erstellt</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tasks.map((task) => (
            <TaskRow 
              key={task.id} 
              task={task} 
              isMobile={isMobile} 
              onRowClick={handleRowClick} 
            />
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
