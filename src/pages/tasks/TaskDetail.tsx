
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTaskTimer } from '@/hooks/useTaskTimer';
import { useAuth } from '@/contexts/AuthContext';
import { FollowUpDialog } from '@/components/tasks/FollowUpDialog';
import { CloseTaskDialog } from '@/components/tasks/CloseTaskDialog';
import { AvaTaskSummaryDialog } from '@/components/tasks/AvaTaskSummaryDialog';
import { AssignTaskDialog } from '@/components/tasks/AssignTaskDialog';
import { EmailToCustomerDialog } from '@/components/tasks/EmailToCustomerDialog';
import { TaskChat } from "@/components/tasks/TaskChat";
import { TaskDetailHeader } from '@/components/tasks/TaskDetailHeader';
import { TaskDetailInfo } from '@/components/tasks/TaskDetailInfo';
import { EndkundeInfoLink } from '@/components/tasks/EndkundeInfoLink';
import { EmailReplyPanel } from '@/components/tasks/EmailReplyPanel';
import { EmailThreadHistory } from '@/components/tasks/EmailThreadHistory';
import { useTaskDetail } from '@/hooks/useTaskDetail';
import { useTaskMessages } from '@/hooks/useTaskMessages';
import { useEmailThreads } from '@/hooks/useEmailThreads';
import { toast } from '@/components/ui/use-toast';
import { supabase } from "@/integrations/supabase/client";
import { ScrollArea } from '@/components/ui/scroll-area';
import { KnowledgeArticleManager } from '@/components/tasks/KnowledgeArticleManager';
import type { TaskStatus } from '@/types';

const TaskDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Task status dialogs
  const [followUpDialogOpen, setFollowUpDialogOpen] = useState(false);
  const [closeTaskDialogOpen, setCloseTaskDialogOpen] = useState(false);
  const [isClosingWithoutAva, setIsClosingWithoutAva] = useState(false);
  const [assignTaskDialogOpen, setAssignTaskDialogOpen] = useState(false);
  const [forwardTaskDialogOpen, setForwardTaskDialogOpen] = useState(false);
  const [emailToCustomerDialogOpen, setEmailToCustomerDialogOpen] = useState(false);
  const [avaSummaryDialogOpen, setAvaSummaryDialogOpen] = useState(false);
  
  const [isActive, setIsActive] = useState(true);
  
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

  // Pass task status to timer hook if available
  const { formattedTime } = useTaskTimer({ 
    taskId: id || '', 
    isActive,
    status: task?.status
  });
  
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

  const handleTaskClose = (comment: string) => {
    console.log("Task close handler called with comment:", comment);
    
    if (isClosingWithoutAva) {
      // Close task directly without AVA summary if coming from "Beenden ohne Ava"
      handleCloseWithoutAva(comment).then(() => {
        // After closing, find and navigate to next task
        findNextTask().then(nextTaskId => {
          if (nextTaskId) {
            console.log("Navigating to next task:", nextTaskId);
            setIsActive(false);
            setTimeout(() => navigate(`/tasks/${nextTaskId}`), 100);
          } else {
            console.log("No next task found, navigating to tasks list");
            setIsActive(false);
            setTimeout(() => navigate('/tasks'), 100);
          }
        });
      });
    } else {
      // Open AVA summary dialog for normal task closing flow
      console.log("Opening AVA summary dialog with initial comment:", comment);
      setAvaSummaryDialogOpen(true);
    }
  };
  
  const handleCloseSummary = () => {
    console.log("Closing AVA summary dialog without completing task");
    setAvaSummaryDialogOpen(false);
  };
  
  const handleCloseWithoutAvaClick = () => {
    console.log("Opening close dialog without AVA");
    setIsClosingWithoutAva(true);
    setCloseTaskDialogOpen(true);
  };
  
  const handleCloseWithAvaClick = () => {
    console.log("Opening close dialog with AVA");
    setIsClosingWithoutAva(false);
    setCloseTaskDialogOpen(true);
  };
  
  const handleCloseTaskFromSummary = async (comment: string) => {
    console.log("Closing task from AVA summary dialog with comment:", comment);
    
    try {
      // Close the task with the comment provided in the summary dialog
      // This is where we actually update the task status to completed
      await handleCloseWithoutAva(comment);
      console.log("Task closed successfully");
      setAvaSummaryDialogOpen(false);
      
      // Find and navigate to next task
      const nextTaskId = await findNextTask();
      if (nextTaskId) {
        console.log("Navigating to next task:", nextTaskId);
        setIsActive(false);
        await new Promise(resolve => setTimeout(resolve, 100)); // Give time for timer to stop
        navigate(`/tasks/${nextTaskId}`);
      } else {
        console.log("No next task found, navigating to tasks list");
        setIsActive(false);
        await new Promise(resolve => setTimeout(resolve, 100));
        navigate('/tasks');
      }
    } catch (error) {
      console.error("Error closing task:", error);
    }
  };
  


  useEffect(() => {
    // TEST: Force the dialog to show when component mounts
    if (task?.status === 'completed') {
      console.log('TEST: Forcing AVA summary dialog to show');
      setTimeout(() => {
        // Just open the dialog without setting comment, as comment is now in the dialog itself
        setAvaSummaryDialogOpen(true);
      }, 500);
    }
    
    return () => {
      console.log('TaskDetail unmounting, setting isActive to false');
      setIsActive(false);
    };
  }, [task]);

  const handleBack = () => {
    setIsActive(false);
    
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

  // Updated logic to allow agents to forward tasks
  const canAssignOrForward = user?.role === 'admin' || user?.role === 'agent' || user?.id === task.assigned_to;
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
          handleCloseWithoutAvaClick={handleCloseWithoutAvaClick}
          handleCloseWithAvaClick={handleCloseWithAvaClick}
          setEmailToCustomerDialogOpen={setEmailToCustomerDialogOpen}
          handleStatusChange={handleStatusChange}
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-7 px-4 py-8">
          {/* Left column with scroll area */}
          <ScrollArea className="h-[calc(100vh-280px)] lg:max-h-[700px]">
            <div className="flex flex-col space-y-6 pr-4">
              {/* Task Info Section */}
              <TaskDetailInfo task={task} />
              
              {/* Endkunde Info Link Section */}
              {task.endkunde_id && (
                <EndkundeInfoLink 
                  endkundeId={task.endkunde_id} 
                  customerId={task.customer_id} 
                />
              )}
              
              {/* Knowledge Article Manager Section */}
              <KnowledgeArticleManager 
                customerId={task.customer_id} 
                taskDescription={task.description}
              />
              
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
        isWithoutAva={isClosingWithoutAva}
      />
      
      <AvaTaskSummaryDialog
        open={avaSummaryDialogOpen}
        onOpenChange={setAvaSummaryDialogOpen}
        taskId={task.id}
        readableId={task.readable_id}
        taskTitle={task.title}
        initialComment={task.closing_comment || ""}
        onCancel={handleCloseSummary}
        onContinue={handleCloseSummary}
        onCloseTask={handleCloseTaskFromSummary}
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
