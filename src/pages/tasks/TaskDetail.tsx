
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { useAuth } from '@/contexts/AuthContext';
import { useTaskDetail } from '@/hooks/useTaskDetail';
import { useEmailThreads } from '@/hooks/useEmailThreads';
import { Card } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { TaskDetailHeader } from '@/components/tasks/TaskDetailHeader';
import { TaskDetailInfo } from '@/components/tasks/TaskDetailInfo';
import { TaskChat } from '@/components/tasks/TaskChat';
import { EmailThreadHistory } from '@/components/tasks/EmailThreadHistory';
import { EmailReplyDialog } from '@/components/tasks/EmailReplyDialog';
import { EmailToCustomerDialog } from '@/components/tasks/EmailToCustomerDialog';
import { AssignTaskDialog } from '@/components/tasks/AssignTaskDialog';
import { CloseTaskDialog } from '@/components/tasks/CloseTaskDialog';
import { FollowUpDialog } from '@/components/tasks/FollowUpDialog';
import { supabase } from '@/integrations/supabase/client';
import { useTaskActivity } from '@/hooks/useTaskActivity';
import { useTaskTimer } from '@/hooks/useTaskTimer';
import { TaskStatus, EmailThread } from '@/types';
import { useToast } from '@/components/ui/use-toast';

const TaskDetail = () => {
  const { taskId } = useParams<{ taskId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { 
    task, 
    isLoading: taskLoading, 
    fetchTaskDetails 
  } = useTaskDetail(taskId, user);
  const { 
    startTimer: startTaskTimer, 
    endTimer: endTaskTimer 
  } = useTaskTimer();
  const { logTaskStatusChange, logTaskClose } = useTaskActivity();
  const { toast } = useToast();
  
  // Add state for email-related functionality
  const [selectedEmailThread, setSelectedEmailThread] = useState<EmailThread | null>(null);
  const [emailReplyDialogOpen, setEmailReplyDialogOpen] = useState(false);
  const [emailToCustomerDialogOpen, setEmailToCustomerDialogOpen] = useState(false);
  
  // Get email threads for this task
  const { threads, loading: threadsLoading, refreshThreads } = useEmailThreads(taskId);
  
  const [assignTaskDialogOpen, setAssignTaskDialogOpen] = useState(false);
  const [closeTaskDialogOpen, setCloseTaskDialogOpen] = useState(false);
  const [forwardTaskDialogOpen, setForwardTaskDialogOpen] = useState(false);
  const [followUpDialogOpen, setFollowUpDialogOpen] = useState(false);

  useEffect(() => {
    if (taskId && user) {
      startTaskTimer(taskId, user.id);
    }
    
    return () => {
      if (taskId && user?.id) endTaskTimer(taskId, user.id);
    };
  }, [taskId, user, startTaskTimer, endTaskTimer]);

  const handleBack = () => {
    navigate('/tasks');
  };

  const formattedTime = task?.created_at 
    ? format(new Date(task.created_at), 'dd. MMMM yyyy, HH:mm', { locale: de }) 
    : '';

  const isUnassigned = !task?.assigned_to;
  const canAssignOrForward = user && (!task?.assigned_to || task?.assigned_to === user.id);

  const handleAssignToMe = async () => {
    if (!taskId || !user) return;
    
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ assigned_to: user.id })
        .eq('id', taskId);

      if (error) throw error;
      
      // Log activity - we'll update this
      const { error: activityError } = await supabase
        .from('task_activities')
        .insert({
          task_id: taskId,
          user_id: user.id,
          action: 'assign',
          status_from: task?.status || 'new',
          status_to: task?.status || 'new'
        });
        
      if (activityError) console.error("Failed to log activity:", activityError);
      
      toast({
        title: "Aufgabe zugewiesen",
        description: "Die Aufgabe wurde Ihnen zugewiesen.",
      });
      
      fetchTaskDetails();
    } catch (error) {
      console.error("Error assigning task:", error);
      toast({
        variant: "destructive",
        title: "Fehler",
        description: "Die Aufgabe konnte nicht zugewiesen werden.",
      });
    }
  };

  const handleStatusChange = async (status: TaskStatus) => {
    if (!taskId) return;
    
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ status })
        .eq('id', taskId);

      if (error) throw error;
      
      if (status === 'completed') {
        await logTaskClose(taskId);
        toast({
          title: "Aufgabe abgeschlossen",
          description: "Die Aufgabe wurde erfolgreich abgeschlossen.",
        });
      } else {
        toast({
          title: "Status geändert",
          description: `Der Status wurde zu "${status}" geändert.`,
        });
      }
      
      fetchTaskDetails();
    } catch (error) {
      console.error("Error changing status:", error);
      toast({
        variant: "destructive",
        title: "Fehler",
        description: "Der Status konnte nicht geändert werden.",
      });
    }
  };
  
  // Handler for email reply button clicks
  const handleEmailReplyClick = (thread: EmailThread) => {
    setSelectedEmailThread(thread);
    setEmailReplyDialogOpen(true);
  };
  
  // Handler for when an email is sent
  const handleEmailSent = () => {
    console.log('Email sent, refreshing data...');
    refreshThreads();
    fetchTaskDetails();
  };

  if (taskLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!task) {
    return (
      <Card className="p-6">
        <div className="text-center text-gray-500">
          Aufgabe nicht gefunden
        </div>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-4 mb-20">
        {/* Task Header */}
        <TaskDetailHeader
          task={task}
          formattedTime={formattedTime}
          isUnassigned={isUnassigned}
          user={user}
          canAssignOrForward={canAssignOrForward}
          handleBack={handleBack}
          handleAssignToMe={handleAssignToMe}
          setAssignTaskDialogOpen={setAssignTaskDialogOpen}
          setForwardTaskDialogOpen={setForwardTaskDialogOpen}
          setFollowUpDialogOpen={setFollowUpDialogOpen}
          setCloseTaskDialogOpen={setCloseTaskDialogOpen}
          setEmailToCustomerDialogOpen={setEmailToCustomerDialogOpen}
          handleStatusChange={handleStatusChange}
        />
        
        {/* Main content area */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Left side: Task info and Email History */}
          <div className="md:col-span-4 space-y-6">
            <TaskDetailInfo task={task} />
            
            {/* Email Thread History */}
            {!threadsLoading && threads && threads.length > 0 && (
              <div className="mt-6">
                <EmailThreadHistory 
                  threads={threads} 
                  onReplyClick={handleEmailReplyClick} 
                />
              </div>
            )}
          </div>
          
          {/* Right side: Task chat */}
          <div className="md:col-span-8">
            <TaskChat taskId={taskId} />
          </div>
        </div>
      </div>

      {/* Email Reply Dialog */}
      {taskId && (
        <EmailReplyDialog
          open={emailReplyDialogOpen}
          onOpenChange={setEmailReplyDialogOpen}
          taskId={taskId}
          thread={selectedEmailThread}
          onEmailSent={handleEmailSent}
        />
      )}
      
      {/* Email to Customer Dialog */}
      {taskId && task && (
        <EmailToCustomerDialog
          open={emailToCustomerDialogOpen}
          onOpenChange={setEmailToCustomerDialogOpen}
          taskId={taskId}
          customerName={task?.customer?.name}
          endkundeEmail={task?.endkunde_email}
          onEmailSent={handleEmailSent}
        />
      )}

      {/* Assignment, Forward, Close, and Follow-Up Dialogs */}
      <AssignTaskDialog
        open={assignTaskDialogOpen}
        onOpenChange={setAssignTaskDialogOpen}
        onAssign={(userId: string, note: string) => {
          // Handle assignment
          console.log(`Assigning task ${taskId} to user ${userId} with note: ${note}`);
          fetchTaskDetails();
        }}
        currentAssignee={task?.assigned_to}
      />
      
      <CloseTaskDialog
        open={closeTaskDialogOpen}
        onOpenChange={setCloseTaskDialogOpen}
        onClose={(comment: string) => {
          // Handle close
          console.log(`Closing task ${taskId} with comment: ${comment}`);
          fetchTaskDetails();
          navigate('/tasks');
        }}
      />
      
      <FollowUpDialog
        open={followUpDialogOpen}
        onOpenChange={setFollowUpDialogOpen}
        onSchedule={(date: Date) => {
          console.log(`Scheduling follow-up for task ${taskId} on ${date}`);
          fetchTaskDetails();
        }}
      />
    </>
  );
};

export default TaskDetail;
