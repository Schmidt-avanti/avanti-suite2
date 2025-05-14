
import { useState, useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { useTaskActivity } from '@/hooks/useTaskActivity';
import { useNavigate } from 'react-router-dom';
import type { TaskStatus } from '@/types';

export const useTaskDetail = (id: string | undefined, user: any) => {
  const [task, setTask] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [replyTo, setReplyTo] = useState('');
  const { toast } = useToast();
  const { logTaskStatusChange } = useTaskActivity();
  const navigate = useNavigate();

  const extractEmail = (input: string): string | null => {
    const match = input?.match(/<(.+?)>/);
    return match ? match[1] : input?.includes('@') ? input : null;
  };

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

  const handleStatusChange = async (newStatus: TaskStatus) => {
    try {
      if (!id || !task) return;
      
      const oldStatus = task.status as TaskStatus;
      
      // Update the database
      const { error } = await supabase
        .from('tasks')
        .update({ status: newStatus })
        .eq('id', id);
      
      if (error) throw error;
      
      // Log the status change
      await logTaskStatusChange(id!, oldStatus, newStatus);
      
      // Create a task_times entry if moving to 'in_progress' and we don't have an active timer
      if (newStatus === 'in_progress' && user?.id) {
        // Check if there's an active timer session
        const { data: activeSessions } = await supabase
          .from('task_times')
          .select('id')
          .eq('task_id', id)
          .eq('user_id', user.id)
          .is('ended_at', null)
          .limit(1);
          
        // If no active session found, create one
        if (!activeSessions || activeSessions.length === 0) {
          await supabase
            .from('task_times')
            .insert({
              task_id: id,
              user_id: user.id,
              started_at: new Date().toISOString()
            });
          
          console.log('Created new timer session for in_progress status change');
        }
      }
      
      // If we're moving to 'completed' or 'followup', make sure any open timers are stopped
      if ((newStatus === 'completed' || newStatus === 'followup') && user?.id) {
        const now = new Date().toISOString();
        
        // Find any active timer sessions
        const { data: activeSessions } = await supabase
          .from('task_times')
          .select('id, started_at')
          .eq('task_id', id)
          .eq('user_id', user.id)
          .is('ended_at', null);
          
        // Close any active sessions
        if (activeSessions && activeSessions.length > 0) {
          for (const session of activeSessions) {
            const startTime = new Date(session.started_at).getTime();
            const durationSeconds = Math.floor((Date.now() - startTime) / 1000);
            
            await supabase
              .from('task_times')
              .update({
                ended_at: now,
                duration_seconds: durationSeconds > 0 ? durationSeconds : 0
              })
              .eq('id', session.id);
          }
          
          console.log('Closed timer sessions for completed/followup status change');
        }
      }
      
      // Update local task state
      setTask({ ...task, status: newStatus });
      
      toast({
        title: "Status geändert",
        description: `Die Aufgabe wurde als "${newStatus === 'completed' ? 'Abgeschlossen' : 
          newStatus === 'in_progress' ? 'In Bearbeitung' : 
          newStatus === 'followup' ? 'Wiedervorlage' : 'Neu'}" markiert.`,
      });
      
      // If task was completed, find and navigate to next task
      if (newStatus === 'completed') {
        const nextTaskId = await findNextTask();
        if (nextTaskId) {
          navigate(`/tasks/${nextTaskId}`);
          toast({
            title: "Nächste Aufgabe",
            description: "Sie wurden zur nächsten verfügbaren Aufgabe weitergeleitet.",
          });
        } else {
          navigate('/tasks');
        }
      }
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
      
      if (!id) {
        throw new Error("Keine Aufgaben-ID vorhanden");
      }
      
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
      
      await logTaskStatusChange(id!, task.status as TaskStatus, 'followup');
      
      setTask({
        ...task,
        status: 'followup',
        follow_up_date: followUpDate.toISOString()
      });
      
      toast({
        title: "Wiedervorlage erstellt",
        description: `Die Aufgabe wurde wiedervorgelegt.`,
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

  const handleAssignToMe = async () => {
    if (!user || !id) return;
    
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ assigned_to: user.id })
        .eq('id', id);
      
      if (error) throw error;
      
      await supabase
        .from('task_activities')
        .insert({
          task_id: id,
          user_id: user.id,
          action: 'assign',
          status_from: task?.status || 'new',
          status_to: task?.status || 'new'
        });
      
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
      // Store the assignment note if provided
      const updateData: any = { 
        assigned_to: userId,
        // Store the forwarding note if it exists
        ...(note ? { forwarded_to: note } : {})
      };
      
      const { error } = await supabase
        .from('tasks')
        .update(updateData)
        .eq('id', id);
      
      if (error) throw error;
      
      if (userId) {
        // Get the task's readable_id for the notification message
        const { data: taskData } = await supabase
          .from('tasks')
          .select('readable_id, title')
          .eq('id', id)
          .single();
          
        const taskIdentifier = taskData?.readable_id || task.title;
        
        // Create a notification for the assigned user
        await supabase
          .from('notifications')
          .insert({
            user_id: userId,
            message: `Aufgabe "${taskIdentifier}" wurde Ihnen ${task.assigned_to ? 'weitergeleitet' : 'zugewiesen'}.${note ? ' Notiz: ' + note : ''}`,
            task_id: id
          });
      }
      
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

  useEffect(() => {
    if (id) fetchTaskDetails();
  }, [id]);

  return {
    task,
    isLoading,
    replyTo,
    setReplyTo,
    fetchTaskDetails,
    handleStatusChange,
    handleFollowUp,
    handleCloseWithoutAva,
    handleAssignToMe,
    handleAssignTask
  };
};
