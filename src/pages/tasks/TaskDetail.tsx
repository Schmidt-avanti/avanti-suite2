
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTaskTimer } from '@/hooks/useTaskTimer';
import { useAuth } from '@/contexts/AuthContext';
import { FollowUpDialog } from '@/components/tasks/FollowUpDialog';
import { CloseTaskDialog } from '@/components/tasks/CloseTaskDialog';
import { AssignTaskDialog } from '@/components/tasks/AssignTaskDialog';
import { TaskChat } from "@/components/tasks/TaskChat";
import { TaskDetailHeader } from '@/components/tasks/TaskDetailHeader';
import { TaskDetailInfo } from '@/components/tasks/TaskDetailInfo';
import { EmailReplyPanel } from '@/components/tasks/EmailReplyPanel';
import { useTaskDetail } from '@/hooks/useTaskDetail';
import { KnowledgeArticleManager } from '@/components/tasks/KnowledgeArticleManager';

const TaskDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Task status dialogs
  const [followUpDialogOpen, setFollowUpDialogOpen] = useState(false);
  const [closeTaskDialogOpen, setCloseTaskDialogOpen] = useState(false);
  const [assignTaskDialogOpen, setAssignTaskDialogOpen] = useState(false);
  const [forwardTaskDialogOpen, setForwardTaskDialogOpen] = useState(false);
  
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

  useEffect(() => {
    return () => {
      console.log('TaskDetail unmounting, setting isActive to false');
      setIsActive(false);
    };
  }, []);

  const handleBack = async () => {
    setIsActive(false);
    await new Promise(resolve => setTimeout(resolve, 100));
    navigate('/tasks');
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
          handleStatusChange={handleStatusChange}
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-7 px-4 py-8">
          <div className="space-y-6">
            <TaskDetailInfo task={task} />
            
            {/* Wissensartikel mit dem Aufgabenkontext anzeigen */}
            <KnowledgeArticleManager 
              customerId={task.customer_id} 
              taskDescription={task.description} 
            />
          </div>

          <div className="lg:col-span-2 flex w-full h-full min-h-[540px]">
            <div className="w-full h-full bg-gradient-to-br from-white via-blue-50/60 to-blue-100/50 rounded-2xl shadow-md border border-gray-100 flex flex-col justify-between overflow-hidden mb-8 mr-6 p-6">
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

      <FollowUpDialog
        open={followUpDialogOpen}
        onOpenChange={setFollowUpDialogOpen}
        onSave={handleFollowUp}
      />

      <CloseTaskDialog
        open={closeTaskDialogOpen}
        onOpenChange={setCloseTaskDialogOpen}
        onClose={handleCloseWithoutAva}
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
