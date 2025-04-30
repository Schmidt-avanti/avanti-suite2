
import React from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  ChevronLeft, 
  Mail, 
  Clock, 
  Calendar, 
  CheckCircle, 
  UserPlus, 
  Share, 
  MoreVertical 
} from "lucide-react";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TaskStatusBadge } from './TaskStatusBadge';
import { TaskStatus } from '@/types';

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
  handleStatusChange,
}) => {
  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="p-4">
        <div className="flex flex-col md:flex-row justify-between gap-4">
          {/* Back button and title */}
          <div className="flex flex-col space-y-2">
            <Button
              variant="link"
              className="flex items-center pl-0 w-fit text-blue-500 hover:text-blue-600"
              onClick={handleBack}
            >
              <ChevronLeft className="mr-1 h-4 w-4" />
              Zurück zur Aufgabenliste
            </Button>
            <h1 className="text-xl font-semibold text-gray-900 leading-tight flex items-center">
              <span className="text-gray-500 font-normal mr-2">#{task.readable_id}</span>
              {task.title}
            </h1>
            <div className="flex items-center gap-2 flex-wrap text-sm text-gray-500">
              <div className="flex items-center">
                <Clock className="h-4 w-4 mr-1" />
                {formattedTime}
              </div>
              <div className="h-1 w-1 bg-gray-300 rounded-full mx-1"></div>
              <div>
                Kunde: <span className="font-medium text-gray-700">{task.customer?.name}</span>
              </div>
              <div className="h-1 w-1 bg-gray-300 rounded-full mx-1"></div>
              <TaskStatusBadge status={task.status} />
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap gap-2 items-center">
            {/* Email to customer button */}
            <Button
              variant="outline"
              onClick={() => setEmailToCustomerDialogOpen(true)}
              className="flex items-center"
            >
              <Mail className="h-4 w-4 mr-2" />
              E-Mail an Kunde
            </Button>

            {/* Assignment actions */}
            {isUnassigned ? (
              <Button
                onClick={handleAssignToMe}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Mir zuweisen
              </Button>
            ) : (
              canAssignOrForward && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline">
                      <Share className="h-4 w-4 mr-2" />
                      Weiterleiten
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setAssignTaskDialogOpen(true)}>
                      An Mitarbeiter zuweisen
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )
            )}

            {/* Status actions */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <MoreVertical className="h-4 w-4 mr-2" />
                  Aktionen
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {task.status !== 'completed' && (
                  <>
                    <DropdownMenuItem onClick={() => handleStatusChange('in progress')}>
                      In Bearbeitung setzen
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setFollowUpDialogOpen(true)}>
                      <Calendar className="h-4 w-4 mr-2" />
                      Wiedervorlage planen
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setCloseTaskDialogOpen(true)}>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Aufgabe abschließen
                    </DropdownMenuItem>
                  </>
                )}
                {task.status === 'completed' && (
                  <DropdownMenuItem onClick={() => handleStatusChange('in progress')}>
                    Aufgabe wieder öffnen
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
