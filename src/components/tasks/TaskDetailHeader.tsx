import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { 
  ArrowLeft, Clock, CheckCircle, Calendar, Mail, 
  UserPlus, Forward, X, RefreshCw, AlertTriangle, Loader2
} from "lucide-react";
import { TaskStatusBadge } from './TaskStatusBadge';
import type { DetailedTask, TaskStatus } from '@/types';
import { cn } from "@/lib/utils";
import { Dialog, DialogContent } from '@/components/ui/dialog';

interface TaskDetailHeaderProps {
  task: DetailedTask;
  formattedTime: string;
  isUnassigned: boolean;
  user: any;
  canAssignOrForward: boolean;
  handleBack: () => void;
  handleAssignToMe: () => void;
  setAssignTaskDialogOpen: (open: boolean) => void;
  setForwardTaskDialogOpen: (open: boolean) => void;
  setFollowUpDialogOpen: (open: boolean) => void;
  handleCloseWithoutAvaClick: () => void;
  handleCloseWithAvaClick: () => void;
  setEmailToCustomerDialogOpen: (open: boolean) => void;
  handleStatusChange: (status: TaskStatus) => void;
  handleReopenTask: () => Promise<void>;
  setNoUseCaseDialogOpen?: (open: boolean) => void;
  isCompleted: boolean;
  isLoadingSummary?: boolean;
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
  handleCloseWithoutAvaClick,
  handleCloseWithAvaClick,
  setEmailToCustomerDialogOpen,
  handleStatusChange,
  handleReopenTask,
  setNoUseCaseDialogOpen,
  isCompleted,
  isLoadingSummary
}) => {
  const detailedTask = task as DetailedTask; // Explicit type assertion
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
          
          <TaskStatusBadge status={detailedTask.status as TaskStatus} className="ml-4" />
          {isCompleted && (
            <div className="flex items-center text-green-600 bg-green-100 px-3 py-1 rounded-full text-sm font-semibold ml-4">
              <CheckCircle className="h-5 w-5 mr-2" />
              Abgeschlossen {detailedTask.updated_at ? `am ${new Date(detailedTask.updated_at).toLocaleDateString('de-DE')}` : ''}
            </div>
          )}
        </div>
      </div>
      
      {/* Action buttons row - all in one row */}
      <div className="flex flex-wrap gap-2 mt-1 justify-end">
        {/* Re-open Task button - only show for completed tasks */}
        {isCompleted && (
          <Button 
            variant="outline" 
            className="bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-200"
            onClick={handleReopenTask}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Aufgabe wieder öffnen
          </Button>
        )}
        
        {/* No Use Case Actions button - only show for tasks without a use case */}
        {!detailedTask.matched_use_case_id && setNoUseCaseDialogOpen && (
          <Button 
            variant="outline" 
            className="bg-yellow-100 text-yellow-700 border-yellow-200 hover:bg-yellow-200"
            onClick={() => setNoUseCaseDialogOpen(true)}
            disabled={isCompleted}
          >
            <AlertTriangle className="h-4 w-4 mr-2" />
            Keine Use Case Aktionen
          </Button>
        )}
        {/* Follow up button */}
        <Button 
          variant="outline" 
          className="bg-purple-100 text-purple-700 border-purple-200 hover:bg-purple-200"
          onClick={() => setFollowUpDialogOpen(true)}
          disabled={isCompleted}
        >
          <Calendar className="h-4 w-4 mr-2" />
          Wiedervorlage
        </Button>
        
        {/* "Aufgabe abschließen" button - only hidden for completed tasks */}
        {!isCompleted && (
          <Button 
            variant="outline" 
            className="bg-green-100 text-green-700 border-green-200 hover:bg-green-200"
            onClick={handleCloseWithAvaClick}
            disabled={isLoadingSummary}
          >
            {isLoadingSummary ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Bitte warten...</>
            ) : (
              <><CheckCircle className="h-4 w-4 mr-2" /> Aufgabe abschließen</>
            )}
          </Button>
        )}
        

        
        {/* Email button */}
        <Button
          variant="outline"
          className="bg-white text-blue-600 border-blue-200 hover:bg-blue-50"
          onClick={() => setEmailToCustomerDialogOpen(true)}
          disabled={isCompleted}
        >
          <Mail className="h-4 w-4 mr-2" />
          E-Mail an Kunde
        </Button>
        
        {/* Assignment buttons - only show for email tasks and non-completed tasks */}
        {isEmailTask && isUnassigned && user && !isCompleted && (
          <Button
            variant="outline"
            className="bg-white text-green-600 border-green-200 hover:bg-green-50"
            onClick={handleAssignToMe}
          >
            <UserPlus className="h-4 w-4 mr-2" />
            Mir zuweisen
          </Button>
        )}
        
        {/* Forward button - moved here to be in the same line */}
        {canAssignOrForward && (
          <Button
            variant="outline"
            className="bg-white text-blue-600 border-blue-200 hover:bg-blue-50"
            onClick={() => setForwardTaskDialogOpen(true)}
            disabled={isCompleted}
          >
            <Forward className="h-4 w-4 mr-2" />
            Weiterleiten
          </Button>
        )}
        
        {/* Assign button - only show for email tasks and non-completed tasks */}
        {isEmailTask && canAssignOrForward && !isCompleted && (
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
