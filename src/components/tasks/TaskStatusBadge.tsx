
import { TaskStatus } from '@/types';

interface TaskStatusBadgeProps {
  status: TaskStatus;
}

export const TaskStatusBadge = ({ status }: TaskStatusBadgeProps) => {
  const getStatusLabel = (status: TaskStatus) => {
    switch (status) {
      case 'new': return 'Neu';
      case 'in_progress': return 'In Bearbeitung';
      case 'followup': return 'Auf Wiedervorlage';
      case 'completed': return 'Abgeschlossen';
      default: return status;
    }
  };

  const getStatusClass = (status: TaskStatus) => {
    switch (status) {
      case 'new': return 'bg-blue-100 text-blue-800';
      case 'in_progress': return 'bg-yellow-100 text-yellow-800';
      case 'followup': return 'bg-purple-100 text-purple-800';
      case 'completed': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <span className={`px-2 py-1 rounded-full text-xs ${getStatusClass(status)}`}>
      {getStatusLabel(status)}
    </span>
  );
};
