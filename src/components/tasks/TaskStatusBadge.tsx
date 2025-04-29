
import { TaskStatus } from '@/types';
import { cn } from '@/lib/utils';

interface TaskStatusBadgeProps {
  status: TaskStatus;
  className?: string;
}

export const TaskStatusBadge = ({ status, className }: TaskStatusBadgeProps) => {
  const getStatusLabel = (status: TaskStatus) => {
    switch (status) {
      case 'new': return 'Neu';
      case 'in_progress': return 'In Bearbeitung';
      case 'followup': return 'Wiedervorlage';
      case 'completed': return 'Abgeschlossen';
      case 'closed': return 'Beendet'; // Changed from "Geschlossen" to "Beendet"
      default: return status;
    }
  };

  const getStatusClass = (status: TaskStatus) => {
    switch (status) {
      case 'new': return 'bg-blue-100 text-blue-800';
      case 'in_progress': return 'bg-yellow-100 text-yellow-800';
      case 'followup': return 'bg-purple-100 text-purple-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'closed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <span className={cn(`px-2 py-1 rounded-full text-xs ${getStatusClass(status)}`, className)}>
      {getStatusLabel(status)}
    </span>
  );
};
