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
import { NoUseCaseDialog } from '@/components/tasks/NoUseCaseDialog';
import { UseCaseSelectionInterface } from '@/components/tasks/UseCaseSelectionInterface';
import { StructuredWorkflowInterface } from '@/components/tasks/StructuredWorkflowInterface';
import { TaskChat } from "@/components/tasks/TaskChat";
import { TaskDetailHeader } from '@/components/tasks/TaskDetailHeader';
import { TaskDetailInfo } from '@/components/tasks/TaskDetailInfo';
import { EndkundeInfoLink } from '@/components/tasks/EndkundeInfoLink';
import { EmailReplyPanel } from '@/components/tasks/EmailReplyPanel';
import { EmailThreadHistory } from '@/components/tasks/EmailThreadHistory';
import { useTaskDetail } from '@/hooks/useTaskDetail';
import { useTaskMessages } from '@/hooks/useTaskMessages';
import { useEmailThreads } from '@/hooks/useEmailThreads';
import { useUseCaseWorkflow } from '@/hooks/useUseCaseWorkflow';
import { toast } from '@/components/ui/use-toast';
import { supabase } from "@/integrations/supabase/client";
import { ScrollArea } from '@/components/ui/scroll-area';
import { KnowledgeArticleManager } from '@/components/tasks/KnowledgeArticleManager';
import type { TaskStatus } from '@/types';

// Interface for endkunde contact information
interface EndkundeContact {
  role: string | null;
  name: string | null;
  email: string | null;
  phone: string | null;
}

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
  const [noUseCaseDialogOpen, setNoUseCaseDialogOpen] = useState(false);
  const [isNewTask, setIsNewTask] = useState(false);
  
  // New interface states
  const [showUseCaseSelection, setShowUseCaseSelection] = useState(false);
  const [showStructuredWorkflow, setShowStructuredWorkflow] = useState(false);
  const [selectedUseCaseId, setSelectedUseCaseId] = useState<string | null>(null);
  
  // Store the contacts from EndkundeInfoLink
  const [endkundeContacts, setEndkundeContacts] = useState<EndkundeContact[]>([]);
  
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

  // Use case workflow hook
  const { addDeviation } = useUseCaseWorkflow(id || '');

  // Check URL parameters for the 'new' flag
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    setIsNewTask(urlParams.get('new') === 'true');
  }, []);
  
  // Fetch task messages for chat history
  const { messages } = useTaskMessages(id || null);
  
  // Fetch email threads for this task
  const { threads: emailThreads } = useEmailThreads(id || null);

  // Check if task needs use case selection
  useEffect(() => {
    if (task && isNewTask && !task.matched_use_case_id) {
      setShowUseCaseSelection(true);
    } else if (task && task.matched_use_case_id && !showStructuredWorkflow) {
      setSelectedUseCaseId(task.matched_use_case_id);
      setShowStructuredWorkflow(true);
    }
  }, [task, isNewTask]);

  const handleUseCaseSelected = (useCaseId: string) => {
    setSelectedUseCaseId(useCaseId);
    setShowUseCaseSelection(false);
    setShowStructuredWorkflow(true);
  };

  const handleNoUseCaseSelected = () => {
    setShowUseCaseSelection(false);
    setNoUseCaseDialogOpen(true);
  };

  const handleTaskComplete = async () => {
    if (task) {
      await handleStatusChange('completed');
      // Navigate to next task or task list
      const nextTaskId = await findNextTask();
      if (nextTaskId) {
        setIsActive(false);
        setTimeout(() => navigate(`/tasks/${nextTaskId}`), 100);
      } else {
        setIsActive(false);
        setTimeout(() => navigate('/tasks'), 100);
      }
    }
  };

  // This function is only used for direct closing without AVA
  const handleTaskClose = (comment: string) => {
    console.log("Task close handler called with comment (direct closing):", comment);
    
    // Close task directly without AVA summary
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
    console.log("Opening AVA summary dialog directly");
    setIsClosingWithoutAva(false);
    // Open the AVA summary dialog directly instead of the close task dialog
    setAvaSummaryDialogOpen(true);
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
    // Return function for cleanup when TaskDetail unmounts
    return () => {
      console.log('TaskDetail unmounting, setting isActive to false');
      setIsActive(false);
    };
  }, []); // Empty dependency array if it only needs to run on unmount, or add specific dependencies if needed for other logic within.

  const handleReopenTask = async () => {
    if (task && task.status === 'completed') {
      try {
        // Change the task status back to in_progress
        await handleStatusChange('in_progress');
        toast({
          title: "Task Re-opened",
          description: `Task ${task.readable_id} has been re-opened.`,
        });
      } catch (error) {
        console.error("Error re-opening task:", error);
        toast({
          title: "Error",
          description: "Failed to re-open the task. Please try again.",
          variant: "destructive"
        });
      }
    }
  };

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

  // Show Use Case Selection Interface for new tasks without use case
  if (showUseCaseSelection) {
    return (
      <div className="max-w-screen-xl mx-auto w-full px-3 md:px-8 py-5">
        <UseCaseSelectionInterface
          taskId={task.id}
          customerId={task.customer_id}
          taskDescription={task.description}
          onUseCaseSelected={handleUseCaseSelected}
          onNoUseCaseSelected={handleNoUseCaseSelected}
        />
      </div>
    );
  }

  // Show Structured Workflow Interface for tasks with use case
  if (showStructuredWorkflow && selectedUseCaseId) {
    return (
      <div className="max-w-screen-xl mx-auto w-full px-3 md:px-8 py-5">
        <div className="bg-white/95 rounded-2xl shadow-lg border border-gray-100 overflow-hidden p-6">
          <TaskDetailHeader 
            task={task}
            formattedTime={formattedTime}
            isUnassigned={!task.assigned_to}
            user={user}
            canAssignOrForward={user?.role === 'admin' || user?.role === 'agent' || user?.id === task.assigned_to}
            handleBack={handleBack}
            handleAssignToMe={handleAssignToMe}
            setAssignTaskDialogOpen={setAssignTaskDialogOpen}
            setForwardTaskDialogOpen={setForwardTaskDialogOpen}
            setFollowUpDialogOpen={setFollowUpDialogOpen}
            handleCloseWithoutAvaClick={handleCloseWithoutAvaClick}
            handleCloseWithAvaClick={handleCloseWithAvaClick}
            setEmailToCustomerDialogOpen={setEmailToCustomerDialogOpen}
            handleStatusChange={handleStatusChange}
            handleReopenTask={handleReopenTask}
            setNoUseCaseDialogOpen={setNoUseCaseDialogOpen}
          />
          
          <StructuredWorkflowInterface
            taskId={task.id}
            useCaseId={selectedUseCaseId}
            onTaskComplete={handleTaskComplete}
            onAddDeviation={addDeviation}
          />
        </div>
      </div>
    );
  }

  // Updated logic to allow agents to forward tasks
  const canAssignOrForward = user?.role === 'admin' || user?.role === 'agent' || user?.id === task.assigned_to;
  const isUnassigned = !task.assigned_to;

  // Fallback to original interface for edge cases
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
          handleReopenTask={handleReopenTask}
          setNoUseCaseDialogOpen={setNoUseCaseDialogOpen}
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-7 px-4 py-8">
          {/* Left column with scroll area */}
          <ScrollArea className="h-[calc(100vh-280px)] lg:max-h-[700px]">
            <div className="flex flex-col space-y-6 pr-4">
              {/* Task Info Section */}
              <TaskDetailInfo task={task} />
              
              {/* Endkunde Info Link Section */}
              <EndkundeInfoLink 
                endkundeId={task.endkunde_id} 
                customerId={task.customer_id}
                taskTitle={task.title}
                taskSummary={task.description}
                onContactsLoaded={setEndkundeContacts}
              />  
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

      {/* All existing dialogs remain the same */}
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
        initialComment={""} // Empty by default when opening directly
        onCancel={handleCloseSummary}
        onContinue={handleCloseSummary}
        onCloseTask={handleCloseTaskFromSummary}
        endkundeOrt={task?.endkunde?.Ort || task?.customer?.address?.city || ""}
        endkundeContacts={endkundeContacts} // Pass the contacts loaded from EndkundeInfoLink
        customerName={task?.customer?.name || ''} // Pass the customer name to check for specific clients
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
      
      {task && (
        <NoUseCaseDialog
          open={noUseCaseDialogOpen}
          onOpenChange={setNoUseCaseDialogOpen}
          taskId={task.id}
          customerId={task.customer_id}
          taskTitle={task.title}
        />
      )}
    </div>
  );
};

export default TaskDetail;
