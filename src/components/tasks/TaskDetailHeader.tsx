
import React from 'react';
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  UserCheck,
  Clock,
  Calendar,
  Check,
  XCircle,
  UserPlus,
  Forward
} from "lucide-react";
import { TaskStatusBadge } from "@/components/tasks/TaskStatusBadge";

interface TaskDetailHeaderProps {
  task: any;
  formattedTime: string;
  isUnassigned: boolean;
  user: any;
  canAssignOrForward: boolean;
  handleBack: () => void;
  handleAssignToMe: () => void;
  setAssignTaskDialogOpen: (open: boolean) => void;
  setForwardTaskDialogOpen: (open: boolean) => void;
  setFollowUpDialogOpen: (open: boolean) => void;
  setCloseTaskDialogOpen: (open: boolean) => void;
  handleStatusChange: (status: string) => void;
}

export const TaskDetailHeader: React.FC<TaskDetailHeaderProps> = ({
  task,
  formattedTime,
  isUnassigned,
  user,
  canAssignOrForward,
  handleBack,
  handleAssignToMe,
  setAssignTaskDialogOpen,
  setForwardTaskDialogOpen,
  setFollowUpDialogOpen,
  setCloseTaskDialogOpen,
  handleStatusChange
}) => {
  const formattedFollowUpDate = task.follow_up_date 
    ? format(new Date(task.follow_up_date), 'PPpp', { locale: de })
    : null;

  return (
    <div className="flex flex-wrap items-center px-6 pt-6 pb-3 border-b bg-gradient-to-r from-avanti-100 to-avanti-200 rounded-t-2xl gap-2">
      <Button 
        variant="ghost" 
        onClick={handleBack}
      >
        <ChevronLeft className="h-4 w-4 mr-2" />
        Zurück zur Übersicht
      </Button>
      <div className="flex-1" />
      
      <div className="text-sm font-medium bg-white/20 rounded-full px-4 py-1 flex items-center mr-4">
        <Clock className="h-4 w-4 mr-2" />
        {formattedTime}
      </div>
      
      {task.status === 'followup' && formattedFollowUpDate && (
        <div className="text-sm font-medium bg-purple-100 text-purple-800 rounded-full px-4 py-1 flex items-center mr-4">
          <Calendar className="h-4 w-4 mr-2" />
          {formattedFollowUpDate}
        </div>
      )}

      {isUnassigned && user && (
        <Button 
          onClick={handleAssignToMe}
          variant="secondary"
          className="mr-2 bg-blue-100 text-blue-700 hover:bg-blue-200"
        >
          <UserCheck className="h-4 w-4 mr-2" />
          Mir zuweisen
        </Button>
      )}

      {canAssignOrForward && (
        <>
          {!task.assigned_to ? (
            <Button 
              onClick={() => setAssignTaskDialogOpen(true)}
              variant="secondary"
              className="mr-2 bg-white/80 hover:bg-white"
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Zuweisen
            </Button>
          ) : (
            <Button 
              onClick={() => setForwardTaskDialogOpen(true)}
              variant="secondary"
              className="mr-2 bg-white/80 hover:bg-white"
            >
              <Forward className="h-4 w-4 mr-2" />
              Weiterleiten
            </Button>
          )}
        </>
      )}

      {task.status !== 'followup' && task.status !== 'completed' && (
        <Button 
          onClick={() => setFollowUpDialogOpen(true)}
          variant="secondary"
          className="mr-2 bg-purple-100 text-purple-700 hover:bg-purple-200"
        >
          <Calendar className="h-4 w-4 mr-2" />
          Wiedervorlage
        </Button>
      )}

      {task.status !== 'completed' && (
        <Button 
          onClick={() => setCloseTaskDialogOpen(true)}
          variant="secondary"
          className="mr-2 bg-slate-100 text-slate-700 hover:bg-slate-200"
        >
          <XCircle className="h-4 w-4 mr-2" />
          Beenden ohne Ava
        </Button>
      )}
      
      {task.status !== 'completed' && (
        <Button 
          onClick={() => handleStatusChange('completed')}
          variant="secondary"
          className="mr-4 bg-green-100 text-green-700 hover:bg-green-200"
        >
          <Check className="h-4 w-4 mr-2" />
          Aufgabe abschließen
        </Button>
      )}
      
      <TaskStatusBadge status={task.status || 'new'} />
    </div>
  );
};
