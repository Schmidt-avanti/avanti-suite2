import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { useTaskActivity } from '@/hooks/useTaskActivity';
import { useNavigate } from 'react-router-dom';
import { Task, TaskStatus, DetailedTask, Customer, User, UserRole, Endkunde } from '@/types';

export const useTaskDetail = (id: string | undefined, user: any) => {
  const [task, setTask] = useState<DetailedTask | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [replyTo, setReplyTo] = useState('');
  const { toast } = useToast();
  const { logTaskStatusChange } = useTaskActivity();
  const navigate = useNavigate();

  const taskRef = useRef(task);
  useEffect(() => {
    taskRef.current = task;
  }, [task]);

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

      const [customerResult, creatorResult, assigneeResult, endkundeResult, useCaseResult] = await Promise.all([
        taskData.customer_id // This is for "our customer"
          ? supabase.from('customers').select('id, name, street, zip, city, email').eq('id', taskData.customer_id).maybeSingle() // Correct table, phone assumed not to exist here
          : Promise.resolve({ data: null, error: null }),
        taskData.created_by
          ? supabase.from('profiles').select('id, "Full Name"').eq('id', taskData.created_by).maybeSingle()
          : Promise.resolve({ data: null, error: null }),
        taskData.assigned_to
          ? supabase.from('profiles').select('id, "Full Name"').eq('id', taskData.assigned_to).maybeSingle()
          : Promise.resolve({ data: null, error: null }),
        taskData.endkunde_id // This is for the "end-customer" (caller)
          ? supabase.from('endkunden').select('id, Vorname, Nachname, created_at').eq('id', taskData.endkunde_id).maybeSingle() // CORRECT TABLE 'endkunden', assuming phone and other fields exist here
          : Promise.resolve({ data: null, error: null }),
        taskData.matched_use_case_id
          ? supabase.from('use_cases').select('id, title').eq('id', taskData.matched_use_case_id).maybeSingle()
          : Promise.resolve({ data: null, error: null }),
      ]);

      // Check for errors in fetched related data
      if (customerResult?.error) throw customerResult.error;
      if (creatorResult?.error) throw creatorResult.error;
      if (assigneeResult?.error) throw assigneeResult.error;
      if (endkundeResult?.error) throw endkundeResult.error;
      if (useCaseResult?.error) throw useCaseResult.error;

      const endkundeData = endkundeResult.data;
      const endkundeObject: Endkunde | null = endkundeData
        ? ({ // Construct a valid Endkunde object
            id: endkundeData.id,
            Vorname: endkundeData.Vorname, // Keep raw DB field
            Nachname: endkundeData.Nachname, // Keep raw DB field
            name: `${endkundeData.Vorname || ''} ${endkundeData.Nachname || ''}`.trim(),
            created_at: endkundeData.created_at,
            // Optional fields from Endkunde interface (street, zip, city, phone) will be undefined
            // as they are not fetched yet. This is fine.
          } as Endkunde)
        : null;

      const enrichedTask = {
        ...taskData,
        status: taskData.status as TaskStatus,
        attachments: taskData.attachments as any[],
        customer: customerResult.data as Customer | null,
        creator: creatorResult.data as User | null,
        assignee: assigneeResult.data as User | null,
        endkunde: endkundeObject, // Use the constructed object with the 'name' field
        matched_use_case_title: useCaseResult?.data?.title || null,
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

  const handleStatusChange = useCallback(async (newStatus: TaskStatus) => {
    console.log(`%%%% handleStatusChange CALLED in useTaskDetail with newStatus: ${newStatus} %%%%`);
    console.trace(`Trace for handleStatusChange in useTaskDetail (newStatus: ${newStatus})`);
    
    const currentTask = taskRef.current;

    try {
      if (!id || !currentTask) {
        console.log('%%%% handleStatusChange returning early: no id or task %%%%');
        return;
      }
      
      const oldStatus = currentTask.status as TaskStatus;
      
      // Update the database
      const { error } = await supabase
        .from('tasks')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
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
      setTask(current => current ? { ...current, status: newStatus as TaskStatus } : null);
      
      toast({
        title: "Status geändert",
        description: `Die Aufgabe wurde als "${newStatus === 'completed' ? 'Abgeschlossen' : 
          newStatus === 'in_progress' ? 'In Bearbeitung' : 
          newStatus === 'followup' ? 'Wiedervorlage' : 'Neu'}" markiert.`,
      });
      
      // Remove automatic navigation for completed tasks
      // This allows the TaskDetail component to handle the navigation flow
      // with AVA summary integration
    } catch (error: any) {
      console.error("Error changing status:", error);
      toast({
        variant: "destructive",
        title: "Fehler",
        description: "Status konnte nicht geändert werden."
      });
    }
  }, [id, logTaskStatusChange, toast, user?.id]);

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
        status: 'followup' as TaskStatus,
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
        status: 'completed' as TaskStatus,
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

      // Restore assignee loading and setting
      const { data: updatedAssigneeData, error: assigneeError } = await supabase
        .from('profiles')
        .select('id, "Full Name", email, role, created_at')
        .eq('id', user.id)
        .single();

      if (assigneeError) throw assigneeError;
      if (!task) return; // Guard for task state

      const updatedAssignee: User | null = updatedAssigneeData ? {
        id: updatedAssigneeData.id,
        "Full Name": updatedAssigneeData["Full Name"],
        email: updatedAssigneeData.email,
        role: updatedAssigneeData.role as UserRole, 
        createdAt: updatedAssigneeData.created_at,
      } : null;

      setTask({
        ...task,
        status: 'in_progress' as TaskStatus,
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
    if (!id || !task) return;

    try {
      const updateData: any = { 
        assigned_to: userId,
        status: 'in_progress',
        ...(note ? { forwarded_to: note } : {})
      };
      
      const { error: updateError } = await supabase
        .from('tasks')
        .update(updateData)
        .eq('id', id);
      
      if (updateError) throw updateError;
      
      await logTaskStatusChange(id, task.status, 'in_progress');

      const taskIdentifier = task.readable_id || task.title;

      await supabase.from('notifications').insert({
        user_id: userId,
        message: `Ihnen wurde die Aufgabe "${taskIdentifier}" zugewiesen.`,
        task_id: id,
      });

      const { data: newAssigneeData, error: newAssigneeError } = await supabase
        .from('profiles')
        .select('id, "Full Name", email, role, created_at')
        .eq('id', userId)
        .single();

      if (newAssigneeError) throw newAssigneeError;

      const newAssignee: User | null = newAssigneeData ? {
        id: newAssigneeData.id,
        "Full Name": newAssigneeData["Full Name"],
        email: newAssigneeData.email,
        role: newAssigneeData.role as UserRole,
        createdAt: newAssigneeData.created_at,
      } : null;

      setTask({
        ...task,
        status: 'in_progress' as TaskStatus,
        assigned_to: userId,
        assignee: newAssignee,
      });

      toast({
        title: "Aufgabe zugewiesen",
        description: "Die Aufgabe wurde erfolgreich zugewiesen und der Status aktualisiert.",
      });

    } catch (error: any) {
      console.error("Error assigning task:", error);
      toast({
        variant: "destructive",
        title: "Fehler",
        description: `Aufgabe konnte nicht zugewiesen werden: ${error.message}`,
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
    handleAssignTask,
  };
};
