
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useBeforeUnload } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from '@/contexts/AuthContext';
import { FollowUpDialog } from '@/components/tasks/FollowUpDialog';
import { CloseTaskDialog } from '@/components/tasks/CloseTaskDialog';
import { AvaTaskSummaryDialog } from '@/components/tasks/AvaTaskSummaryDialog';
import { AssignTaskDialog } from '@/components/tasks/AssignTaskDialog';
import { EmailToCustomerDialog } from '@/components/tasks/EmailToCustomerDialog';
import { NoUseCaseDialog } from '@/components/tasks/NoUseCaseDialog';
import { TaskChat } from "@/components/tasks/TaskChat";
import { TaskDetailHeader } from '@/components/tasks/TaskDetailHeader';
import { TaskDetailInfo } from '@/components/tasks/TaskDetailInfo';
import { EndkundeInfoDisplay } from '@/components/tasks/EndkundeInfoLink'; // Path is correct, component name changed
import { EmailReplyPanel } from '@/components/tasks/EmailReplyPanel';
import { EmailThreadHistory } from '@/components/tasks/EmailThreadHistory';
import { useTaskDetail } from '@/hooks/useTaskDetail';
import { useTaskMessages } from '@/hooks/useTaskMessages';
import { useEmailThreads } from '@/hooks/useEmailThreads';
import { sessionManager } from '@/utils/sessionManager';
import { toast } from '@/components/ui/use-toast';
import { supabase } from "@/integrations/supabase/client";
import { ScrollArea } from '@/components/ui/scroll-area';

import { CompletedTaskOverlay } from '@/components/tasks/CompletedTaskOverlay';
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
  const { toast } = useToast();
  const statusUpdateRef = useRef(false);

  // Consolidated dialog state management
  type DialogType = 'none' | 'followUp' | 'closeTask' | 'assignTask' | 'forwardTask' | 'emailToCustomer' | 'avaSummary' | 'noUseCase';
  const [activeDialog, setActiveDialog] = useState<DialogType>('none');

  // State for dialog data
  const [avaSummaryInitialData, setAvaSummaryInitialData] = useState<{ summaryDraft: string; textToAgent: string; options: string[]; } | null>(null);
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);
  const [isNewTask, setIsNewTask] = useState(false);

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

  // Tracking total time from all sessions
  const [totalFormattedTime, setTotalFormattedTime] = useState<string>('00:00');
  const [sessionId, setSessionId] = useState<string | null>(null);
  
  // Format seconds to MM:SS
  const formatTime = (totalSeconds: number): string => {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // Calculate total time from all sessions
  const calculateTotalTime = async () => {
    if (!id) return;
    
    try {
      // Instead of querying task_sessions directly, get the aggregated time from tasks table
      const { data, error } = await supabase
        .from('tasks')
        .select('total_time_seconds')
        .eq('id', id)
        .single();

      if (error) {
        console.error('Error fetching task total time:', error);
        return;
      }

      // Use the pre-calculated total_time_seconds value
      const totalSeconds = data.total_time_seconds || 0;

      setTotalFormattedTime(formatTime(totalSeconds));
    } catch (error) {
      console.error('Error calculating total time:', error);
    }
  };

  // Check URL parameters for the 'new' flag and reset status update flag on new task ID
  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.has('new')) {
      setIsNewTask(true);
    }
    
    // Start a session when the component mounts
    const startNewSession = async () => {
      if (id && user?.id) {
        const newSessionId = await sessionManager.startSession(id, user.id);
        setSessionId(newSessionId);
        calculateTotalTime();
      }
    };
    
    startNewSession();
    
    // End the session when the component unmounts
    return () => {
      sessionManager.endCurrentSession();
    };
  }, [id, user]);
  
  // Fetch task messages for chat history
  const { messages } = useTaskMessages(id || null);

  // Fetch email threads for this task
  const { threads: emailThreads } = useEmailThreads(id || null);

  // Automatically change status from 'new' to 'in_progress' when a task is opened
  useEffect(() => {
    // Use a ref to ensure this runs only once per task load
    if (task && task.status === 'new' && task.assigned_to === user?.id && !statusUpdateRef.current) {
      statusUpdateRef.current = true; // Set flag immediately to prevent re-entry
      toast({
        title: "Neue Aufgabe geöffnet",
        description: "Status wird automatisch auf 'In Bearbeitung' gesetzt.",
      });
      console.log(`Automatically changing status for task ${task.id} to in_progress`);
      handleStatusChange('in_progress');
    }
  }, [task, user?.id, handleStatusChange, toast]);

  const findNextTask = async () => {
    if (!user?.id) return null;
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('id')
        .or(`status.eq.new,status.eq.in_progress`)
        .eq('assigned_to', user.id)
        .order('created_at', { ascending: true })
        .limit(1);
      if (error) throw error;
      return data && data.length > 0 ? data[0].id : null;
    } catch (error) {
      console.error('Error finding next task:', error);
      return null;
    }
  };

  // This function is only used for direct closing without AVA
  const handleTaskClose = async (comment: string) => {
    console.log("Task close handler called with comment (direct closing):", comment);
    
    // First, explicitly end the current session
    await sessionManager.endCurrentSession();
    
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
    // First, explicitly end the current session
    await sessionManager.endCurrentSession();
    console.log("Closing task from AVA summary dialog with comment:", comment);
    
    try {
      await handleCloseWithoutAva(comment);
      setActiveDialog('none');
      toast({ title: "Aufgabe erfolgreich abgeschlossen!" });
      await navigateToNextTask();
    } catch (error) {
      console.error("Error closing task:", error);
    }
  };
  


  useEffect(() => {
    // Return function for cleanup when TaskDetail unmounts
    return () => {
      console.log('TaskDetail unmounting, ending session and setting isActive to false');
      sessionManager.endCurrentSession();
      setIsActive(false);
    };
  }, []); // Empty dependency array if it only needs to run on unmount, or add specific dependencies if needed for other logic within.
  
  // Auto-open NoUseCaseDialog for new tasks without a use case
  useEffect(() => {
    if (task && isNewTask && !task.matched_use_case_id) {
      console.log('Auto-opening NoUseCaseDialog for new task without use case');
      setNoUseCaseDialogOpen(true);
    }
  };

  const handleReopenTask = async () => {
    if (task && task.status === 'completed') {
      try {
        await handleStatusChange('in_progress');
        toast({ title: "Task Re-opened", description: `Task ${task.readable_id} has been re-opened.` });
      } catch (error) {
        console.error("Error re-opening task:", error);
        toast({ title: "Error", description: "Failed to re-open the task. Please try again.", variant: "destructive" });
      }
    }
  };

  const handleBack = async () => {
    // End the session before navigating away
    await sessionManager.endCurrentSession();
    
    // Check if the task is completed and navigate accordingly
    if (task && task.status === 'completed') {
      navigate('/tasks/completed');
    } else {
      navigate('/tasks');
    }
  };

  useEffect(() => {
    return () => { setIsActive(false); };
  }, []);

  useEffect(() => {
    if (task && isNewTask && !task.matched_use_case_id) {
      setActiveDialog('noUseCase');
    }
  }, [task, isNewTask]);

  if (isLoading) return <div className="flex items-center justify-center h-screen"><div>Loading task...</div></div>;
  if (!task) return <div className="flex items-center justify-center h-screen"><div>Task not found.</div></div>;

  const isCompleted = task.status === 'completed';
  const canAssignOrForward = user?.role === 'admin' || user?.role === 'agent' || user?.id === task.assigned_to;
  const isUnassigned = !task.assigned_to;

  return (
    <div className="max-w-screen-xl mx-auto w-full px-3 md:px-8 py-5">
      <div className="bg-white/95 rounded-2xl shadow-lg border border-gray-100 overflow-hidden p-0">
        <TaskDetailHeader 
          task={task}
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
          formattedTotalTime={totalFormattedTime}
        />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-7 px-4 py-8">
            <ScrollArea className="h-[calc(100vh-280px)] lg:max-h-[700px]">
              <div className="flex flex-col space-y-6 pr-4">
                <TaskDetailInfo task={task} />
                <EndkundeInfoDisplay 
                  endkundeId={task.endkunde_id}
                  customerId={task.customer_id}
                  onContactsLoaded={setEndkundeContacts} // Store contacts in state
                />
                {emailThreads && emailThreads.length > 0 && (
                  <EmailThreadHistory threads={emailThreads} />
                )}
                {task.source === 'email' && (
                  <EmailReplyPanel
                    replyTo={replyTo}
                    setReplyTo={setReplyTo}
                    taskId={id!}
                    isReadOnly={isCompleted}
                  />
                )}
              </div>
            </ScrollArea>

            <div className="lg:col-span-2">
              <Card className="h-full flex flex-col">
                <CardHeader>
                  <CardTitle>Interne Kommunikation &amp; Notizen</CardTitle>
                </CardHeader>
                <CardContent className="flex-grow flex flex-col">
                  <TaskChat
                    taskId={id!}
                    useCaseId={task.matched_use_case_id}
                    initialMessages={messages}
                    openAvaSummaryDialog={handleOpenAvaSummaryDialogFromChat}
                    isReadOnly={isCompleted}
                    isBlankTask={task.is_blank_task}
                  />
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* Dialogs */}
      <FollowUpDialog
        open={activeDialog === 'followUp'}
        onOpenChange={(isOpen) => !isOpen && setActiveDialog('none')}
        onSave={handleFollowUp}
      />
      <CloseTaskDialog
        open={activeDialog === 'closeTask'}
        onOpenChange={(isOpen) => !isOpen && setActiveDialog('none')}
        onClose={handleCloseTaskFromSummary} // Always use the summary handler, it can handle empty comments
        isWithoutAva={true}
      />
      <AvaTaskSummaryDialog
        open={activeDialog === 'avaSummary'}
        onOpenChange={(isOpen) => !isOpen && setActiveDialog('none')}
        taskId={id!}
        readableId={task.readable_id}
        taskTitle={task.title}
        initialSummaryText={avaSummaryInitialData?.summaryDraft || ''}
        onCancel={() => setActiveDialog('none')}
        onCloseTask={handleCloseTaskFromSummary}
        endkundeContacts={endkundeContacts}
        customerName={task.customer?.name}
        isReadOnly={isCompleted}
      />
      <AssignTaskDialog
        open={activeDialog === 'assignTask'}
        onOpenChange={(isOpen) => !isOpen && setActiveDialog('none')}
        onAssign={handleAssignTask}
      />
      <EmailToCustomerDialog
        open={activeDialog === 'emailToCustomer'}
        onOpenChange={(isOpen) => !isOpen && setActiveDialog('none')}
        taskId={id!}
        recipientEmail={task?.endkunde_email}
        taskMessages={messages}
        onEmailSent={() => {
          handleStatusChange('waiting_for_customer');
          handleNextTask();
        }}
      />
      <NoUseCaseDialog
        open={activeDialog === 'noUseCase'}
        onOpenChange={() => setActiveDialog('none')}
        onSuccess={() => {
          setActiveDialog('none');
          handleNextTask();
        }}
        taskId={task?.id || ''}
        customerId={task?.customer_id || ''}
        taskTitle={task?.title || ''}
      />

    </>
  );
};

export default TaskDetail;
