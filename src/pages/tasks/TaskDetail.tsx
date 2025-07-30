import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
//import { useTaskTimer } from '@/hooks/useTaskTimer';
import { useTaskSessionTracker } from '@/contexts/TaskSessionContext';
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
import { useToast } from '@/components/ui/use-toast';
import { supabase } from "@/integrations/supabase/client";
import { ScrollArea } from '@/components/ui/scroll-area';
import { TaskChatMessage } from '../../components/tasks/TaskChatMessage';

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

  // Pass task status to timer hook if available
 // OLD import (removed)
// import { useTaskTimer } from '@/hooks/useTaskTimer';

// NEW import


// ...

// Add this where you had `useTaskTimer`
const taskId = task?.id || null;
const isTaskActive = !!(task?.id && task.status !== 'completed' && task.status !== 'cancelled' && isActive);
const { formattedTime } = useTaskSessionTracker(taskId, isTaskActive);


  // Check URL parameters for the 'new' flag and reset status update flag on new task ID
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    setIsNewTask(urlParams.get('new') === 'true');
    statusUpdateRef.current = false; // Reset flag when task ID changes
  }, [id]);

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

  const handleNextTask = async () => {
    toast({
      title: "Suche nächste Aufgabe...",
    });
    const nextTaskId = await findNextTask();
    if (nextTaskId) {
      navigate(`/tasks/${nextTaskId}?new=true`);
    } else {
      toast({
        title: "Keine weiteren Aufgaben",
        description: "Alle Aufgaben in Ihrer Warteschlange sind erledigt. Gut gemacht!",
      });
      navigate('/tasks');
    }
  };

  const navigateToNextTask = async () => {
    const nextTaskId = await findNextTask();
    setIsActive(false);
    await new Promise(resolve => setTimeout(resolve, 100));
    if (nextTaskId) {
      navigate(`/tasks/${nextTaskId}`);
    } else {
      navigate('/tasks');
    }
  };

  const handleCloseTaskFromSummary = async (comment: string) => {
    try {
      await handleCloseWithoutAva(comment);
      setActiveDialog('none');
      toast({ title: "Aufgabe erfolgreich abgeschlossen!" });
      await navigateToNextTask();
    } catch (error) {
      console.error("Error closing task from summary:", error);
      toast({ title: "Fehler beim Abschließen der Aufgabe", variant: "destructive" });
    }
  };

  const handleOpenAvaSummaryDialogFromChat = (data: { summaryDraft: string; textToAgent: string; options: string[] }) => {
    console.log("Opening AVA Summary with provided data from chat.");
    setAvaSummaryInitialData(data);
    setActiveDialog('avaSummary');
  };

  const handleOpenAvaSummaryDialogOnDemand = async () => {
    if (!id) {
      toast({ title: "Fehler", description: "Task-ID nicht gefunden.", variant: "destructive" });
      return;
    }
    console.log("Requesting on-demand summary for task:", id);
    setIsLoadingSummary(true);
    try {
      const { data: funcData, error } = await supabase.functions.invoke('handle-task-chat', {
        body: { taskId: id, generate_summary_on_demand: true },
      });
      if (error) throw error;
      if (funcData && funcData.response) {
        const summaryData = JSON.parse(funcData.response);
        const summaryText = summaryData.summary_text || summaryData.summary_draft;
        if (summaryText) {
          setAvaSummaryInitialData({ summaryDraft: summaryText, textToAgent: summaryData.text_to_agent || '', options: summaryData.options || [] });
        } else {
          setAvaSummaryInitialData(null);
          toast({ title: "Keine Zusammenfassung erhalten", description: "Sie können eine manuelle Zusammenfassung eingeben." });
        }
      } else {
        throw new Error('Invalid response from Edge Function');
      }
    } catch (error: any) {
      console.error('Error fetching on-demand summary:', error);
      setAvaSummaryInitialData(null);
      toast({ title: "Fehler beim Abrufen der Zusammenfassung", description: error.message, variant: "destructive" });
    } finally {
      setIsLoadingSummary(false);
      setActiveDialog('avaSummary');
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

  const handleBack = () => {
    setIsActive(false);
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
    <>
      {isCompleted && (
        <CompletedTaskOverlay task={task} onReopenTask={handleReopenTask} onBackClick={handleBack} />
      )}
      <div className={`max-w-screen-xl mx-auto w-full px-3 md:px-8 py-5 ${isCompleted ? 'filter blur-sm pointer-events-none' : ''}`}>
        <div className="bg-white/95 rounded-2xl shadow-lg border border-gray-100 overflow-hidden p-0">
          <TaskDetailHeader
            task={task}
            formattedTimeString={formattedTime}
            isUnassigned={isUnassigned}
            user={user}
            canAssignOrForward={canAssignOrForward}
            handleBack={handleBack}
            handleAssignToMe={handleAssignToMe}
            setAssignTaskDialogOpen={() => setActiveDialog('assignTask')}
            setForwardTaskDialogOpen={() => setActiveDialog('forwardTask')} // Note: Forwarding logic/dialog not fully implemented
            setFollowUpDialogOpen={() => setActiveDialog('followUp')}
            handleCloseWithoutAvaClick={() => setActiveDialog('closeTask')}
            handleCloseWithAvaClick={handleOpenAvaSummaryDialogOnDemand}
            setEmailToCustomerDialogOpen={() => setActiveDialog('emailToCustomer')}
            handleStatusChange={handleStatusChange}
            handleReopenTask={handleReopenTask}
            setNoUseCaseDialogOpen={() => setActiveDialog('noUseCase')}
            isCompleted={isCompleted}
            isLoadingSummary={isLoadingSummary}
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
                  >
                    <TaskChatMessage
                      onSendMessage={(text) => sendMessage(text, null, new Set())}
                    />
                  </TaskChat>
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
        onSave={(date, note) => handleFollowUp(date, note)}
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
        currentAssignee={task?.assigned_to}
        customerId={task?.customer_id}
      />
      <AssignTaskDialog
        open={activeDialog === 'forwardTask'}
        onOpenChange={(isOpen) => !isOpen && setActiveDialog('none')}
        onAssign={handleAssignTask}
        currentAssignee={task?.assigned_to}
        isForwarding={true}
        customerId={task?.customer_id}
      />
      <EmailToCustomerDialog
        open={activeDialog === 'emailToCustomer'}
        onOpenChange={(isOpen) => !isOpen && setActiveDialog('none')}
        taskId={id!}
        readableId={task?.readable_id}
        recipientEmail={task?.customer?.email || task?.endkunde_email}
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
