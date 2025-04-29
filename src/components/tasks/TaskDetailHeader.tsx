
import React from 'react';
import { Button } from "@/components/ui/button";
import { 
  ArrowLeft, Clock, CheckCircle, Calendar, Mail, 
  UserPlus, Forward, X
} from "lucide-react";
import { TaskStatusBadge } from './TaskStatusBadge';
import type { TaskStatus } from '@/types';
import { cn } from "@/lib/utils";

interface TaskStatusBadgeProps {
  status: TaskStatus;
  className?: string;
}

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
  setEmailToCustomerDialogOpen: (open: boolean) => void;
  handleStatusChange: (status: TaskStatus) => void;
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
  setEmailToCustomerDialogOpen,
  handleStatusChange
}) => {
  return (
    <div className="bg-white border-b border-gray-200 p-4 rounded-t-2xl shadow-sm flex flex-col gap-2">
      <div className="flex items-center justify-between">
        {/* Left section with back button, status and timer */}
        <div className="flex items-center space-x-4">
          <Button 
            onClick={handleBack} 
            variant="ghost" 
            size="icon" 
            className="text-gray-600 hover:bg-gray-100 h-9 w-9"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <TaskStatusBadge status={task.status as TaskStatus} className="ml-2" />
          
          <div className="flex items-center ml-4 text-gray-500">
            <Clock className="h-4 w-4 mr-1" />
            <span className="text-sm font-medium">{formattedTime}</span>
          </div>
        </div>
      </div>
      
      {/* Action buttons row - all visible at once */}
      <div className="flex flex-wrap gap-2 mt-1">
        {/* Email to customer button - always visible */}
        <Button
          variant="outline"
          size="sm"
          className="text-blue-600 border-blue-200 hover:bg-blue-50"
          onClick={() => setEmailToCustomerDialogOpen(true)}
        >
          <Mail className="h-4 w-4 mr-2" />
          E-Mail an Kunde
        </Button>
        
        {/* Assign to me button - conditional */}
        {isUnassigned && user && (
          <Button
            variant="outline"
            size="sm"
            className="text-green-600 border-green-200 hover:bg-green-50"
            onClick={handleAssignToMe}
          >
            <UserPlus className="h-4 w-4 mr-2" />
            Mir zuweisen
          </Button>
        )}
        
        {/* Assign and Forward buttons - conditional */}
        {canAssignOrForward && (
          <>
            <Button 
              variant="outline" 
              size="sm"
              className="text-blue-600 border-blue-200 hover:bg-blue-50"
              onClick={() => setAssignTaskDialogOpen(true)}
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Zuweisen
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              className="text-purple-600 border-purple-200 hover:bg-purple-50"
              onClick={() => setForwardTaskDialogOpen(true)}
            >
              <Forward className="h-4 w-4 mr-2" />
              Weiterleiten
            </Button>
          </>
        )}
        
        {/* Follow up button */}
        <Button 
          variant="outline" 
          size="sm"
          className="text-amber-600 border-amber-200 hover:bg-amber-50"
          onClick={() => setFollowUpDialogOpen(true)}
        >
          <Calendar className="h-4 w-4 mr-2" />
          Wiedervorlage
        </Button>
        
        {/* Close with Ava button */}
        <Button 
          variant="outline" 
          size="sm"
          className="text-green-600 border-green-200 hover:bg-green-50"
          onClick={() => setCloseTaskDialogOpen(true)}
        >
          <CheckCircle className="h-4 w-4 mr-2" />
          Abschließen
        </Button>
        
        {/* Close without Ava button */}
        <Button 
          variant="outline" 
          size="sm"
          className="text-red-600 border-red-200 hover:bg-red-50"
          onClick={() => handleStatusChange('closed' as TaskStatus)}
        >
          <X className="h-4 w-4 mr-2" />
          Schließen ohne Ava
        </Button>
      </div>
    </div>
  );
};
