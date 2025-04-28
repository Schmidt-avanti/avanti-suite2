
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { TaskChat } from "@/components/tasks/TaskChat";
import {
  ChevronLeft,
  User2,
  Users,
  Inbox,
  UserCheck,
  Clock,
  Check,
  Send,
  Loader2,
  AlertTriangle,
  Calendar,
  XCircle,
  UserPlus,
  Forward
} from "lucide-react";
import { TaskStatusBadge } from "@/components/tasks/TaskStatusBadge";
import { useTaskTimer } from '@/hooks/useTaskTimer';
import { useTaskActivity } from '@/hooks/useTaskActivity';
import type { TaskStatus } from '@/types';
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { FollowUpDialog } from '@/components/tasks/FollowUpDialog';
import { CloseTaskDialog } from '@/components/tasks/CloseTaskDialog';
import { AssignTaskDialog } from '@/components/tasks/AssignTaskDialog';
import { useAuth } from '@/contexts/AuthContext';

const extractEmail = (input: string): string | null => {
  const match = input?.match(/<(.+?)>/);
  return match ? match[1] : input?.includes('@') ? input : null;
};

const TaskDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [task, setTask] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [replyTo, setReplyTo] = useState('');
  const [replyBody, setReplyBody] = useState('');
  const [sendError, setSendError] = useState<string | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Task status dialogs
  const [followUpDialogOpen, setFollowUpDialogOpen] = useState(false);
  const [closeTaskDialogOpen, setCloseTaskDialogOpen] = useState(false);
  const [assignTaskDialogOpen, setAssignTaskDialogOpen] = useState(false);
  const [forwardTaskDialogOpen, setForwardTaskDialogOpen] = useState(false);
  
  const [isActive, setIsActive] = useState(true);
  const { formattedTime } = useTaskTimer({ taskId: id || '', isActive });
  const { logTaskStatusChange } = useTaskActivity();

  useEffect(() => {
    if (id) fetchTaskDetails();
    
    return () => {
      console.log('TaskDetail unmounting, setting isActive to false');
      setIsActive(false);
    };
  }, [id]);

  const fetchTaskDetails = async () => {
    try {
      setIsLoading(true);
      const { data: taskData, error: taskError } = await supabase
        .from('tasks')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (taskError) throw taskError;
      if (!taskData) throw new Error('Aufgabe nicht gefunden');

      const [customer, creator, assignee] = await Promise.all([
        taskData.customer_id
          ? supabase.from('customers').select('name').eq('id', taskData.customer_id).maybeSingle()
          : Promise.resolve({ data: null }),
        taskData.created_by
          ? supabase.from('profiles').select('id, "Full Name"').eq('id', taskData.created_by).maybeSingle()
          : Promise.resolve({ data: null }),
        taskData.assigned_to
          ? supabase.from('profiles').select('id, "Full Name"').eq('id', taskData.assigned_to).maybeSingle()
          : Promise.resolve({ data: null }),
      ]);

      const enrichedTask = {
        ...taskData,
        customer: customer.data,
        creator: creator.data,
        assignee: assignee.data
      };

      setTask(enrichedTask);
      if (taskData.source === 'email') {
        setReplyTo(extractEmail(taskData.endkunde_email || '') || '');
      }
      
      // Auto-assign task to current user if it's not assigned
      if (user && !taskData.assigned_to && taskData.status !== 'completed') {
        await handleAssignToMe();
      }

    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Fehler",
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendEmail = async () => {
    if (!replyBody) {
      toast({
        variant: 'destructive',
        title: 'Fehler',
        description: 'Bitte Nachricht angeben.'
      });
      return;
    }

    try {
      setIsSending(true);
      setSendError(null);
      
      const { data, error } = await supabase.functions.invoke('send-reply-email', {
        body: {
          task_id: id,
          recipient_email: replyTo,
          subject: `Re: ${task.title || 'Ihre Anfrage'}`,
          body: replyBody
        }
      });

      if (error) {
        throw new Error(error.message || 'Fehler beim E-Mail Versand');
      }
      
      if (data?.error) {
        throw new Error(data.error);
      }

      toast({
        title: 'E-Mail gesendet',
        description: `Antwort an ${replyTo} wurde erfolgreich gesendet.`,
      });
      
      setReplyBody('');
      fetchTaskDetails(); // Refresh task data
      
    } catch (error: any) {
      console.error('Email sending error:', error);
      setSendError(error.message || 'Fehler beim E-Mail Versand');
      toast({
        variant: 'destructive',
        title: 'Fehler beim Senden',
        description: error.message || 'Fehler beim E-Mail Versand',
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleBack = async () => {
    setIsActive(false);
    await new Promise(resolve => setTimeout(resolve, 100));
    navigate('/tasks');
  };

  const handleStatusChange = async (newStatus: TaskStatus) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ status: newStatus })
        .eq('id', id);
      
      if (error) throw error;
      
      await logTaskStatusChange(id!, task.status as TaskStatus, newStatus);
      
      setTask({ ...task, status: newStatus });
      toast({
        title: "Status geändert",
        description: `Die Aufgabe wurde als "${newStatus === 'completed' ? 'Abgeschlossen' : 
          newStatus === 'in_progress' ? 'In Bearbeitung' : 
          newStatus === 'followup' ? 'Wiedervorlage' : 'Neu'}" markiert.`,
      });
    } catch (error: any) {
      console.error("Error changing status:", error);
      toast({
        variant: "destructive",
        title: "Fehler",
        description: "Status konnte nicht geändert werden."
      });
    }
  };

  const handleFollowUp = async (followUpDate: Date) => {
    try {
      console.log("Setting follow-up for task", id, "with date", followUpDate.toISOString());
      
      // First check if the task exists
      if (!id) {
        throw new Error("Keine Aufgaben-ID vorhanden");
      }
      
      // Make the update to the database
      const { error } = await supabase
        .from('tasks')
        .update({ 
          status: 'followup' as TaskStatus, 
          follow_up_date: followUpDate.toISOString()
        })
        .eq('id', id);
      
      if (error) {
        console.error("Supabase update error:", error);
        throw new Error(`Datenbankfehler: ${error.message}`);
      }
      
      // Log the status change activity
      await logTaskStatusChange(id!, task.status as TaskStatus, 'followup');
      
      // Update local state
      setTask({
        ...task,
        status: 'followup',
        follow_up_date: followUpDate.toISOString()
      });
      
      // Show success message
      toast({
        title: "Wiedervorlage erstellt",
        description: `Die Aufgabe wurde für ${format(followUpDate, 'PPpp', { locale: de })} wiedervorgelegt.`,
      });
    } catch (error: any) {
      console.error("Error setting follow-up:", error);
      toast({
        variant: "destructive",
        title: "Fehler",
        description: `Wiedervorlage konnte nicht erstellt werden: ${error.message}`
      });
    }
  };

  const handleCloseWithoutAva = async (comment: string) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ 
          status: 'completed',
          closing_comment: comment
        })
        .eq('id', id);
      
      if (error) throw error;
      
      await logTaskStatusChange(id!, task.status as TaskStatus, 'completed');
      
      setTask({
        ...task,
        status: 'completed',
        closing_comment: comment
      });
      
      toast({
        title: "Aufgabe abgeschlossen",
        description: "Die Aufgabe wurde erfolgreich abgeschlossen und dokumentiert.",
      });
    } catch (error) {
      console.error("Error closing task:", error);
      toast({
        variant: "destructive",
        title: "Fehler",
        description: "Aufgabe konnte nicht abgeschlossen werden."
      });
    }
  };

  // New function to handle "Assign to me" functionality
  const handleAssignToMe = async () => {
    if (!user || !id) return;
    
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ assigned_to: user.id })
        .eq('id', id);
      
      if (error) throw error;
      
      // Create a notification for system tracking
      await supabase
        .from('task_activities')
        .insert({
          task_id: id,
          user_id: user.id,
          action: 'assign',
          status_from: task?.status || 'new',
          status_to: task?.status || 'new'
        });
      
      // Refresh task data
      const { data: updatedAssignee } = await supabase
        .from('profiles')
        .select('id, "Full Name"')
        .eq('id', user.id)
        .single();
      
      setTask({
        ...task,
        assigned_to: user.id,
        assignee: updatedAssignee
      });
      
      toast({
        title: "Aufgabe übernommen",
        description: "Die Aufgabe wurde Ihnen erfolgreich zugewiesen.",
      });
    } catch (error) {
      console.error("Error assigning task to self:", error);
      toast({
        variant: "destructive",
        title: "Fehler",
        description: "Aufgabe konnte nicht zugewiesen werden."
      });
    }
  };

  const handleAssignTask = async (userId: string, note: string = "") => {
    try {
      // If forwarding, add a note in the task (or you could create a separate system for forwarding notes)
      let updateData: any = { assigned_to: userId };
      
      const { error } = await supabase
        .from('tasks')
        .update(updateData)
        .eq('id', id);
      
      if (error) throw error;
      
      // Create a notification for the assignee
      if (userId) {
        await supabase
          .from('notifications')
          .insert({
            user_id: userId,
            message: `Aufgabe "${task.title}" wurde Ihnen ${task.assigned_to ? 'weitergeleitet' : 'zugewiesen'}.${note ? ' Notiz: ' + note : ''}`,
            task_id: id
          });
      }
      
      // Refresh task data
      fetchTaskDetails();
      
      toast({
        title: task.assigned_to ? "Aufgabe weitergeleitet" : "Aufgabe zugewiesen",
        description: "Die Aufgabe wurde erfolgreich zugewiesen.",
      });
    } catch (error) {
      console.error("Error assigning task:", error);
      toast({
        variant: "destructive",
        title: "Fehler",
        description: "Aufgabe konnte nicht zugewiesen werden."
      });
    }
  };

  if (isLoading) return <div className="text-center py-8">Lade Aufgabe...</div>;
  if (!task) return <div className="text-center py-8">Aufgabe nicht gefunden</div>;

  // Format the follow-up date if it exists
  const formattedFollowUpDate = task.follow_up_date 
    ? format(new Date(task.follow_up_date), 'PPpp', { locale: de })
    : null;

  // Determine whether current user can assign/forward
  const canAssignOrForward = user?.role === 'admin' || user?.id === task.assigned_to;
  
  // Check if task is not assigned
  const isUnassigned = !task.assigned_to;

  return (
    <div className="max-w-screen-xl mx-auto w-full px-3 md:px-8 py-5">
      <div className="bg-white/95 rounded-2xl shadow-lg border border-gray-100 overflow-hidden p-0">
        <div className="flex flex-wrap items-center px-6 pt-6 pb-3 border-b bg-gradient-to-r from-avanti-100 to-avanti-200 rounded-t-2xl gap-2">
          <Button 
            variant="ghost" 
            onClick={handleBack}
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Zurück zur Übersicht
          </Button>
          <div className="flex-1" />
          
          <div className="text-sm font-medium bg-white/20 rounded-full px-4 py-1 flex items-center mr-4">
            <Clock className="h-4 w-4 mr-2" />
            {formattedTime}
          </div>
          
          {task.status === 'followup' && formattedFollowUpDate && (
            <div className="text-sm font-medium bg-purple-100 text-purple-800 rounded-full px-4 py-1 flex items-center mr-4">
              <Calendar className="h-4 w-4 mr-2" />
              {formattedFollowUpDate}
            </div>
          )}

          {/* "Assign to me" button - only show if not assigned */}
          {isUnassigned && user && (
            <Button 
              onClick={handleAssignToMe}
              variant="secondary"
              className="mr-2 bg-blue-100 text-blue-700 hover:bg-blue-200"
            >
              <UserCheck className="h-4 w-4 mr-2" />
              Mir zuweisen
            </Button>
          )}

          {/* Assign/Forward Button - only show if not assigned or if admin/current assignee */}
          {canAssignOrForward && (
            <>
              {!task.assigned_to ? (
                <Button 
                  onClick={() => setAssignTaskDialogOpen(true)}
                  variant="secondary"
                  className="mr-2 bg-white/80 hover:bg-white"
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Zuweisen
                </Button>
              ) : (
                <Button 
                  onClick={() => setForwardTaskDialogOpen(true)}
                  variant="secondary"
                  className="mr-2 bg-white/80 hover:bg-white"
                >
                  <Forward className="h-4 w-4 mr-2" />
                  Weiterleiten
                </Button>
              )}
            </>
          )}

          {/* Task Action Buttons */}
          {task.status !== 'followup' && task.status !== 'completed' && (
            <Button 
              onClick={() => setFollowUpDialogOpen(true)}
              variant="secondary"
              className="mr-2 bg-purple-100 text-purple-700 hover:bg-purple-200"
            >
              <Calendar className="h-4 w-4 mr-2" />
              Wiedervorlage
            </Button>
          )}

          {task.status !== 'completed' && (
            <Button 
              onClick={() => setCloseTaskDialogOpen(true)}
              variant="secondary"
              className="mr-2 bg-slate-100 text-slate-700 hover:bg-slate-200"
            >
              <XCircle className="h-4 w-4 mr-2" />
              Beenden ohne Ava
            </Button>
          )}
          
          {task.status !== 'completed' && (
            <Button 
              onClick={() => handleStatusChange('completed')}
              variant="secondary"
              className="mr-4 bg-green-100 text-green-700 hover:bg-green-200"
            >
              <Check className="h-4 w-4 mr-2" />
              Aufgabe abschließen
            </Button>
          )}
          
          <TaskStatusBadge status={task.status || 'new'} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-7 px-4 py-8">
          {/* Task Details Card */}
          <div className="flex flex-col gap-5">
            <Card className="rounded-xl shadow-md border-none bg-white/85">
              <CardContent className="p-6 pb-3 space-y-2 break-words whitespace-pre-wrap">
                <h2 className="text-lg font-semibold mb-1">Aufgabendetails</h2>
                <div className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                  <Inbox className="h-4 w-4" />
                  <span className="font-medium">Beschreibung</span>
                </div>
                <div className="ml-6 text-gray-700">{task.description}</div>

                {task.attachments?.length > 0 && (
                  <div className="mt-4">
                    <div className="text-sm font-medium text-muted-foreground mb-1">Anhänge</div>
                    <ul className="ml-6 list-disc text-blue-600 text-sm space-y-1">
                      {task.attachments.map((url: string, i: number) => (
                        <li key={i}><a href={url} target="_blank" rel="noreferrer">Datei {i + 1}</a></li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="flex items-center gap-2 text-sm text-muted-foreground mt-3">
                  <Users className="h-4 w-4" />
                  <span className="font-medium">Kunde</span>
                </div>
                <div className="ml-6">{task.customer?.name || 'Nicht zugewiesen'}</div>

                <div className="flex items-center gap-2 text-sm text-muted-foreground mt-3">
                  <User2 className="h-4 w-4" />
                  <span className="font-medium">Erstellt von</span>
                </div>
                <div className="ml-6 break-words">
                  {task.source === 'email' && task.endkunde_email
                    ? task.endkunde_email
                    : task.creator?.["Full Name"] || <span className="text-gray-400">Unbekannt</span>}
                </div>

                <div className="flex items-center gap-2 text-sm text-muted-foreground mt-3">
                  <UserCheck className="h-4 w-4" />
                  <span className="font-medium">Zugewiesen an</span>
                </div>
                <div className="ml-6">
                  {task.assignee?.["Full Name"] || <span className="text-gray-400">Nicht zugewiesen</span>}
                </div>
                
                {task.closing_comment && (
                  <>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mt-3">
                      <XCircle className="h-4 w-4" />
                      <span className="font-medium">Abschlussdokumentation</span>
                    </div>
                    <div className="ml-6 text-gray-700">{task.closing_comment}</div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Chat panel */}
          <div className="lg:col-span-2 flex w-full h-full min-h-[540px]">
            <div className="w-full h-full bg-gradient-to-br from-white via-blue-50/60 to-blue-100/50 rounded-2xl shadow-md border border-gray-100 flex flex-col justify-between overflow-hidden mb-8 mr-6 p-6">
              <CardHeader className="p-0 pb-2 flex flex-row items-center border-none">
                <CardTitle className="text-xl font-semibold text-blue-900">
                  {task.source === 'email' ? 'E-Mail Antwort' : 'Bearbeitung der Aufgabe'}
                </CardTitle>
              </CardHeader>

              {task.source === 'email' ? (
                <div className="flex-1 flex flex-col justify-start mt-4">
                  <label className="text-sm text-muted-foreground mb-1 font-medium">Empfänger</label>
                  <input
                    type="email"
                    value={replyTo}
                    onChange={(e) => setReplyTo(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-4 py-2 text-sm mb-4 bg-white"
                    disabled={isSending}
                  />

                  {sendError && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm flex items-start">
                      <AlertTriangle className="h-4 w-4 mt-0.5 mr-2 flex-shrink-0" />
                      <div>
                        <p className="font-medium">Fehler beim Senden</p>
                        <p className="mt-1">{sendError}</p>
                        <p className="mt-2 text-xs">
                          Bitte stellen Sie sicher, dass die E-Mail-Adresse korrekt ist und dass in der SendGrid-Konfiguration 
                          die Absender-E-Mail verifiziert wurde.
                        </p>
                      </div>
                    </div>
                  )}

                  <textarea
                    rows={12}
                    placeholder="Antwort verfassen..."
                    value={replyBody}
                    onChange={(e) => setReplyBody(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 mb-4 bg-white"
                    disabled={isSending}
                  />
                  <Button
                    className="w-fit bg-blue-600 hover:bg-blue-700 text-white self-start"
                    onClick={handleSendEmail}
                    disabled={isSending || !replyBody.trim()}
                  >
                    {isSending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Senden...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        Senden
                      </>
                    )}
                  </Button>
                </div>
              ) : (
                <TaskChat taskId={task.id} useCaseId={task.matched_use_case_id} />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Task Status Dialogs */}
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
