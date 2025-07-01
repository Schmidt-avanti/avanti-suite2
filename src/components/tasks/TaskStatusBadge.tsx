import React from 'react';
import { Badge } from '@/components/ui/badge';
import type { TaskStatus } from '@/types';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

interface StatusConfig {
  label: string;
  variant: 'default' | 'secondary' | 'destructive' | 'outline' | 'success';
}

const statusConfigMap: Record<TaskStatus, StatusConfig> = {
  new: { label: 'Neu', variant: 'default' },
  in_progress: { label: 'In Bearbeitung', variant: 'secondary' },
  followup: { label: 'Follow-Up', variant: 'outline' },
  completed: { label: 'Abgeschlossen', variant: 'success' },
  cancelled: { label: 'Storniert', variant: 'destructive' },
  forwarded: { label: 'Weitergeleitet', variant: 'outline' },
  waiting_for_customer: { label: 'Wartet auf Kunde', variant: 'secondary' },
};

interface TaskStatusBadgeProps {
  status: TaskStatus;
  className?: string;
  follow_up_date?: string;
}

export const TaskStatusBadge: React.FC<TaskStatusBadgeProps> = ({ status, className, follow_up_date }) => {
  const config = statusConfigMap[status] || { label: 'Unbekannt', variant: 'destructive' };

  // Format date for display if status is followup and we have a date
  const showFollowUpDate = status === 'followup' && follow_up_date;
  const formattedDate = showFollowUpDate ? 
    format(new Date(follow_up_date as string), 'dd.MM.yyyy HH:mm', { locale: de }) : 
    null;

  return (
    <div className="flex flex-col items-center">
      <Badge variant={config.variant} className={className}>{config.label}</Badge>
      {showFollowUpDate && (
        <div className="text-xs text-gray-500 mt-1 font-medium">{formattedDate}</div>
      )}
    </div>
  );
};
