
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { 
  ArrowLeft, Clock, CheckCircle, Calendar, Mail, 
  UserPlus, Forward, X, PhoneIcon, RefreshCw, AlertTriangle,
  History
} from "lucide-react";
import { TaskStatusBadge } from './TaskStatusBadge';
import type { TaskStatus } from '@/types';
import { cn } from "@/lib/utils";
import { Dialog, DialogContent } from '@/components/ui/dialog';
import PhoneInterface from '@/components/call-center/PhoneInterface';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface TaskDetailHeaderProps {
  task: any;
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
  formattedTotalTime?: string;
  lastUpdateTime?: string;
}

export const TaskDetailHeader: React.FC<TaskDetailHeaderProps> = ({
  task,
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
  formattedTotalTime
}) => {
  const isEmailTask = task.source === 'email';
  const isCompleted = task.status === 'completed';
  const [phoneDialogOpen, setPhoneDialogOpen] = useState(false);
  
  // Extract phone number from endkunde data if available
  const getPhoneNumber = () => {
    if (task.endkunde_id) {
      // Try to extract phone from endkunde info
      if (task.endkunde && task.endkunde.Adresse) {
        return task.endkunde.Adresse;
      }
    }
    
    // Fallback to customer phone if available
    if (task.customer && task.customer.phone) {
      return task.customer.phone;
    }
    
    return '';
  };

  const getCustomerName = () => {
    if (task.endkunde_id && task.endkunde) {
      return `${task.endkunde.Vorname || ''} ${task.endkunde.Nachname || ''}`.trim();
    }
    
    if (task.customer) {
      return task.customer.name;
    }
    
    return '';
  };
  
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
          
          {/* Task timer display with tooltip */}
          {formattedTotalTime && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center text-gray-500 ml-4 mr-2 cursor-help">
                    <Clock className="h-4 w-4 mr-1" />
                    <span className="text-sm font-medium">{formattedTotalTime}</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="p-3 max-w-sm">
                  <div className="flex flex-col gap-2">
                    <div className="font-medium text-sm">Gesamtzeit für diese Aufgabe</div>
                    <div className="flex items-center text-xs text-gray-500">
                      <History className="h-3 w-3 mr-1" />
                      <span>Automatisch aktualisiert aus der Datenbank</span>
                    </div>
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          
          <TaskStatusBadge status={task.status as TaskStatus} className="ml-4" />
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
        {!task.matched_use_case_id && setNoUseCaseDialogOpen && (
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
        
        {/* "Beenden ohne Ava" button */}
        <Button 
          variant="outline" 
          className="bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200"
          onClick={handleCloseWithoutAvaClick}
          disabled={isCompleted}
        >
          <X className="h-4 w-4 mr-2" />
          Beenden ohne Ava
        </Button>
        
        {/* "Aufgabe abschließen" button - only hidden for completed tasks */}
        {!isCompleted && (
          <Button 
            variant="outline" 
            className="bg-green-100 text-green-700 border-green-200 hover:bg-green-200"
            onClick={handleCloseWithAvaClick}
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Aufgabe abschließen
          </Button>
        )}
        
        {/* Call button - new addition */}
        <Button
          variant="outline"
          className="bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-200"
          onClick={() => setPhoneDialogOpen(true)}
          disabled={isCompleted}
        >
          <PhoneIcon className="h-4 w-4 mr-2" />
          Anrufen
        </Button>
        
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
      
      {/* Phone dialog */}
      <Dialog open={phoneDialogOpen} onOpenChange={setPhoneDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <PhoneInterface 
            onClose={() => setPhoneDialogOpen(false)}
            initialPhoneNumber={getPhoneNumber()}
            customerName={getCustomerName()}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};
