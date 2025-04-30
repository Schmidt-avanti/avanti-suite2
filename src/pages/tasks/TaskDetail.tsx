
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTaskTimer } from '@/hooks/useTaskTimer';
import { useAuth } from '@/contexts/AuthContext';
import { FollowUpDialog } from '@/components/tasks/FollowUpDialog';
import { CloseTaskDialog } from '@/components/tasks/CloseTaskDialog';
import { AssignTaskDialog } from '@/components/tasks/AssignTaskDialog';
import { EmailToCustomerDialog } from '@/components/tasks/EmailToCustomerDialog';
import { TaskChat } from "@/components/tasks/TaskChat";
import { TaskDetailHeader } from '@/components/tasks/TaskDetailHeader';
import { TaskDetailInfo } from '@/components/tasks/TaskDetailInfo';
import { EmailReplyPanel } from '@/components/tasks/EmailReplyPanel';
import { EmailThreadHistory } from '@/components/tasks/EmailThreadHistory';
import { useTaskDetail } from '@/hooks/useTaskDetail';
import { useTaskMessages } from '@/hooks/useTaskMessages';
import { useEmailThreads } from '@/hooks/useEmailThreads';
import { toast } from '@/components/ui/use-toast';
import { supabase } from "@/integrations/supabase/client";
import { ScrollArea } from '@/components/ui/scroll-area';

const TaskDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Task status dialogs
  const [followUpDialogOpen, setFollowUpDialogOpen] = useState(false);
  const [closeTaskDialogOpen, setCloseTaskDialogOpen] = useState(false);
  const [assignTaskDialogOpen, setAssignTaskDialogOpen] = useState(false);
  const [forwardTaskDialogOpen, setForwardTaskDialogOpen] = useState(false);
  const [emailToCustomerDialogOpen, setEmailToCustomerDialogOpen] = useState(false);
  
  const [isActive, setIsActive] = useState(true);
  const { formattedTime } = useTaskTimer({ taskId: id || '', isActive });
  
  const {
    task,
    isLoading,
    replyTo,
    setReplyTo,
    handleStatusChange,
    handleFollowUp,
    handleCloseWithoutAva,
    handleAssignToMe,
    handleAssignTask
  } = useTaskDetail(id, user);

  // Fetch task messages for chat history
  const { messages } = useTaskMessages(id || null);
  
  // Fetch email threads for this task
  const { threads: emailThreads } = useEmailThreads(id || null);

  const findNextTask = async () => {
    if (!user?.id) return null;
    
    try {
      // Find next 'new' task assigned to this user
      let query = supabase
        .from('tasks')
        .select('id')
        .eq('status', 'new')
        .eq('assigned_to', user.id)
        .order('created_at', { ascending: true })
        .limit(1);
        
      const { data: newTasks, error: newTasksError } = await query;
      
      if (newTasksError) throw newTasksError;
      
      if (newTasks && newTasks.length > 0) {
        return newTasks[0].id;
      }
      
      // If no 'new' tasks, look for 'in_progress' tasks
      const { data: inProgressTasks, error: inProgressTasksError } = await supabase
        .from('tasks')
        .select('id')
        .eq('status', 'in_progress')
        .eq('assigned_to', user.id)
        .order('created_at', { ascending: true })
        .limit(1);
        
      if (inProgressTasksError) throw inProgressTasksError;
      
      if (inProgressTasks && inProgressTasks.length > 0) {
        return inProgressTasks[0].id;
      }
      
      return null;
    } catch (error) {
      console.error('Error finding next task:', error);
      return null;
    }
  };

  const handleTaskClose = async (comment: string) => {
    await handleCloseWithoutAva(comment);
    
    // Find and navigate to next task
    const nextTaskId = await findNextTask();
    if (nextTaskId) {
      setIsActive(false);
      await new Promise(resolve => setTimeout(resolve, 100)); // Give time for timer to stop
      navigate(`/tasks/${nextTaskId}`);
      toast({
        title: "Nächste Aufgabe",
        description: "Sie wurden zur nächsten verfügbaren Aufgabe weitergeleitet.",
      });
    } else {
      setIsActive(false);
      await new Promise(resolve => setTimeout(resolve, 100));
      navigate('/tasks');
    }
  };

  useEffect(() => {
    return () => {
      console.log('TaskDetail unmounting, setting isActive to false');
      setIsActive(false);
    };
  }, []);

  const handleBack = async () => {
    setIsActive(false);
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Check if the task is completed and navigate accordingly
    if (task && task.status === 'completed') {
      navigate('/tasks/completed');
    } else {
      navigate('/tasks');
    }
  };

  const handleEmailSent = (emailDetails: { recipient: string, subject: string }) => {
    toast({
      title: "E-Mail gesendet",
      description: `E-Mail wurde erfolgreich an ${emailDetails.recipient} gesendet.`,
    });
  };

  if (isLoading) return <div className="text-center py-8">Lade Aufgabe...</div>;
  if (!task) return <div className="text-center py-8">Aufgabe nicht gefunden</div>;

  const canAssignOrForward = user?.role === 'admin' || user?.id === task.assigned_to;
  const isUnassigned = !task.assigned_to;

  return (
    <div className="max-w-screen-xl mx-auto w-full px-3 md:px-8 py-5">
      <div className="bg-white/95 rounded-2xl shadow-lg border border-gray-100 overflow-hidden p-0">
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-7 px-4 py-8">
          {/* Left column with scroll area */}
          <ScrollArea className="h-[calc(100vh-280px)] lg:max-h-[700px]">
            <div className="flex flex-col space-y-6 pr-4">
              <TaskDetailInfo task={task} />
              
              {/* Email Thread History Component */}
              {emailThreads && emailThreads.length > 0 && (
                <div className="bg-white/90 rounded-xl shadow-md border border-gray-100 p-4">
                  <EmailThreadHistory threads={emailThreads} />
                </div>
              )}
            </div>
          </ScrollArea>

          <div className="lg:col-span-2 flex w-full h-full min-h-[540px]">
            <div className="w-full h-full bg-gradient-to-br from-white via-blue-50/60 to-blue-100/50 rounded-2xl shadow-md border border-gray-100 flex flex-col justify-between overflow-hidden mb-8 p-6">
              {task.source === 'email' ? (
                <EmailReplyPanel
                  taskId={task.id}
                  replyTo={replyTo}
                  setReplyTo={setReplyTo}
                />
              ) : (
                <>
                  <CardHeader className="p-0 pb-2 flex flex-row items-center border-none">
                    <CardTitle className="text-xl font-semibold text-blue-900">
                      Bearbeitung der Aufgabe
                    </CardTitle>
                  </CardHeader>
                  <TaskChat taskId={task.id} useCaseId={task.matched_use_case_id} />
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <EmailToCustomerDialog
        open={emailToCustomerDialogOpen}
        onOpenChange={setEmailToCustomerDialogOpen}
        taskId={task.id}
        recipientEmail={task.customer?.email || task.endkunde_email}
        taskMessages={messages}
        onEmailSent={handleEmailSent}
      />

      <FollowUpDialog
        open={followUpDialogOpen}
        onOpenChange={setFollowUpDialogOpen}
        onSave={handleFollowUp}
      />

      <CloseTaskDialog
        open={closeTaskDialogOpen}
        onOpenChange={setCloseTaskDialogOpen}
        onClose={handleTaskClose}
      />

      <AssignTaskDialog
        open={assignTaskDialogOpen}
        onOpenChange={setAssignTaskDialogOpen}
        onAssign={handleAssignTask}
        currentAssignee={task.assigned_to}
      />

      <AssignTaskDialog
        open={forwardTaskDialogOpen}
        onOpenChange={setForwardTaskDialogOpen}
        onAssign={handleAssignTask}
        currentAssignee={task.assigned_to}
        isForwarding={true}
      />
    </div>
  );
};

export default TaskDetail;
