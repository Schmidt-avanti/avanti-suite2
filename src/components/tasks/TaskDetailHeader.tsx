
import React from 'react';
import { Button } from "@/components/ui/button";
import { 
  ArrowLeft, Clock, CheckCircle, Calendar, Mail, 
  UserPlus, Forward, X
} from "lucide-react";
import { TaskStatusBadge } from './TaskStatusBadge';
import type { TaskStatus } from '@/types';
import { cn } from "@/lib/utils";

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
  const isEmailTask = task.source === 'email';
  
  return (
    <div className="bg-blue-50 p-4 rounded-t-xl flex flex-col gap-2">
      <div className="flex items-center justify-between">
        {/* Left section with back button, status and timer */}
        <div className="flex items-center">
          <Button
            onClick={handleBack}
            variant="ghost"
            className="text-gray-600 hover:bg-gray-100 mr-2"
          >
            <ArrowLeft className="h-5 w-5 mr-1" />
            Zurück zur Übersicht
          </Button>
          
          <div className="flex items-center text-gray-500 ml-4">
            <Clock className="h-4 w-4 mr-1" />
            <span className="text-sm font-medium">{formattedTime}</span>
          </div>
          
          <TaskStatusBadge status={task.status as TaskStatus} className="ml-4" />
        </div>
        
        {/* Right section with forward button */}
        {canAssignOrForward && (
          <Button
            variant="outline"
            className="bg-white text-blue-600 border-blue-200 hover:bg-blue-50"
            onClick={() => setForwardTaskDialogOpen(true)}
          >
            <Forward className="h-4 w-4 mr-2" />
            Weiterleiten
          </Button>
        )}
      </div>
      
      {/* Action buttons row */}
      <div className="flex flex-wrap gap-2 mt-1">
        {/* Follow up button */}
        <Button 
          variant="outline" 
          className="bg-purple-100 text-purple-700 border-purple-200 hover:bg-purple-200"
          onClick={() => setFollowUpDialogOpen(true)}
        >
          <Calendar className="h-4 w-4 mr-2" />
          Wiedervorlage
        </Button>
        
        {/* Beenden ohne Ava button - Marks task as completed */}
        <Button 
          variant="outline" 
          className="bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200"
          onClick={() => handleStatusChange('closed' as TaskStatus)}
        >
          <X className="h-4 w-4 mr-2" />
          Beenden ohne Ava
        </Button>
        
        {/* Aufgabe abschließen button - Opens the dialog */}
        <Button 
          variant="outline" 
          className="bg-green-100 text-green-700 border-green-200 hover:bg-green-200"
          onClick={() => setCloseTaskDialogOpen(true)}
        >
          <CheckCircle className="h-4 w-4 mr-2" />
          Aufgabe abschließen
        </Button>
        
        {/* Email buttons - only show for email tasks */}
        {isEmailTask && (
          <Button
            variant="outline"
            className="bg-white text-blue-600 border-blue-200 hover:bg-blue-50"
            onClick={() => setEmailToCustomerDialogOpen(true)}
          >
            <Mail className="h-4 w-4 mr-2" />
            E-Mail an Kunde
          </Button>
        )}
        
        {/* Assignment buttons - only show for email tasks */}
        {isEmailTask && isUnassigned && user && (
          <Button
            variant="outline"
            className="bg-white text-green-600 border-green-200 hover:bg-green-50"
            onClick={handleAssignToMe}
          >
            <UserPlus className="h-4 w-4 mr-2" />
            Mir zuweisen
          </Button>
        )}
        
        {/* Assign button - only show for email tasks */}
        {isEmailTask && canAssignOrForward && (
          <Button 
            variant="outline" 
            className="bg-white text-blue-600 border-blue-200 hover:bg-blue-50"
            onClick={() => setAssignTaskDialogOpen(true)}
          >
            <UserPlus className="h-4 w-4 mr-2" />
            Zuweisen
          </Button>
        )}
      </div>
    </div>
  );
};
