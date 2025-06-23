import React from 'react';
import { Badge } from '@/components/ui/badge';
import type { TaskStatus } from '@/types';

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
}

export const TaskStatusBadge: React.FC<TaskStatusBadgeProps> = ({ status, className }) => {
  const config = statusConfigMap[status] || { label: 'Unbekannt', variant: 'destructive' };

  return <Badge variant={config.variant} className={className}>{config.label}</Badge>;
};
