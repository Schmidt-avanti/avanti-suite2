
import React from 'react';
import { Button } from "@/components/ui/button";
import { 
  ArrowLeft, Clock, CheckCircle, Calendar, Mail, 
  UserPlus, Forward, X, MoreHorizontal 
} from "lucide-react";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { TaskStatusBadge } from './TaskStatusBadge';
import { formatTimeElapsed } from '@/utils/timeUtils';
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
    <div className="bg-gradient-to-r from-blue-900 to-blue-800 p-4 rounded-t-2xl text-white shadow-md">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button 
            onClick={handleBack} 
            variant="ghost" 
            size="icon" 
            className="text-white hover:bg-blue-700/50 h-9 w-9"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          {/* Removed the task title here to avoid hiding buttons */}
          <TaskStatusBadge status={task.status as TaskStatus} className="ml-2" />
        </div>

        <div className="flex items-center space-x-2">
          <div className="flex items-center mr-4">
            <Clock className="h-4 w-4 mr-1 opacity-80" />
            <span className="text-sm font-medium">{formattedTime}</span>
          </div>
          
          {/* Assignment and Actions Buttons */}
          <div className="flex items-center space-x-2">
            {/* Email to customer button - making it ALWAYS visible */}
            <Button
              variant="ghost"
              size="sm"
              className="bg-blue-700/50 hover:bg-blue-700 text-white"
              onClick={() => setEmailToCustomerDialogOpen(true)}
            >
              <Mail className="h-4 w-4 mr-2" />
              E-Mail an Kunde
            </Button>
            
            {isUnassigned && user && (
              <Button
                variant="ghost"
                size="sm"
                className="bg-blue-700/50 hover:bg-blue-700 text-white"
                onClick={handleAssignToMe}
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Mir zuweisen
              </Button>
            )}
            
            {canAssignOrForward && (
              <>
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="bg-blue-700/50 hover:bg-blue-700 text-white"
                  onClick={() => setAssignTaskDialogOpen(true)}
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Zuweisen
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="bg-blue-700/50 hover:bg-blue-700 text-white"
                  onClick={() => setForwardTaskDialogOpen(true)}
                >
                  <Forward className="h-4 w-4 mr-2" />
                  Weiterleiten
                </Button>
              </>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="bg-blue-700/50 hover:bg-blue-700 text-white">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-white text-gray-800 shadow-md">
                <DropdownMenuItem 
                  className="hover:bg-blue-50 cursor-pointer"
                  onClick={() => setFollowUpDialogOpen(true)}
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  Wiedervorlage
                </DropdownMenuItem>
                <DropdownMenuItem 
                  className="hover:bg-blue-50 cursor-pointer"
                  onClick={() => setCloseTaskDialogOpen(true)}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Abschließen
                </DropdownMenuItem>
                <DropdownMenuItem 
                  className="hover:bg-red-50 text-red-600 cursor-pointer"
                  onClick={() => handleStatusChange('closed' as TaskStatus)}
                >
                  <X className="h-4 w-4 mr-2" />
                  Schließen ohne Ava
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </div>
  );
};
