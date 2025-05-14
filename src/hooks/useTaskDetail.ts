import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { TaskStatus } from "@/types";

export const useTaskDetail = (id: string | undefined, user: any) => {
  const queryClient = useQueryClient();
  const [replyTo, setReplyTo] = useState<{ email: string; name: string } | null>(null);

  const { data: task, isLoading, error, refetch } = useQuery({
    queryKey: ["task-detail", id],
    queryFn: async () => {
      if (!id) return null;

      const { data, error } = await supabase
        .from("tasks")
        .select(`
          *,
          customer:customers(*),
          assignee:assigned_to_user(id, email, "Full Name"),
          creator:created_by_user(id, email, "Full Name"),
          endkunde(*)
        `)
        .eq("id", id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { mutateAsync: updateTaskStatus } = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: TaskStatus }) => {
      const { data, error } = await supabase
        .from("tasks")
        .update({ status })
        .eq("id", id)
        .select();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["task-detail", id] });
      toast({
        title: "Status aktualisiert",
        description: "Der Aufgabenstatus wurde erfolgreich aktualisiert.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Fehler",
        description: `Es gab ein Problem beim Aktualisieren des Status: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const handleStatusChange = async (status: TaskStatus) => {
    if (!task) return;
    await updateTaskStatus({ id: task.id, status });
  };

  const handleFollowUp = async (followUpDate: Date, comment: string) => {
    if (!task) return;

    const { data, error } = await supabase
      .from("tasks")
      .update({ follow_up_date: followUpDate, follow_up_comment: comment })
      .eq("id", task.id)
      .select();

    if (error) {
      toast({
        title: "Fehler",
        description: `Es gab ein Problem beim Aktualisieren der Aufgabe: ${error.message}`,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Wiedervorlage gespeichert",
        description: "Die Wiedervorlage wurde erfolgreich gespeichert.",
      });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["task-detail", id] });
    }
  };

  const handleCloseWithoutAva = async (comment: string) => {
    if (!task) return;

    const { data, error } = await supabase
      .from("tasks")
      .update({ status: 'completed', close_comment: comment })
      .eq("id", task.id)
      .select();

    if (error) {
      toast({
        title: "Fehler",
        description: `Es gab ein Problem beim Schließen der Aufgabe: ${error.message}`,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Aufgabe geschlossen",
        description: "Die Aufgabe wurde erfolgreich geschlossen.",
      });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["task-detail", id] });
    }
  };

  const handleAssignToMe = async () => {
    if (!task || !user) return;

    const { data, error } = await supabase
      .from("tasks")
      .update({ assigned_to: user.id })
      .eq("id", task.id)
      .select();

    if (error) {
      toast({
        title: "Fehler",
        description: `Es gab ein Problem beim Zuweisen der Aufgabe: ${error.message}`,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Aufgabe zugewiesen",
        description: "Die Aufgabe wurde Ihnen erfolgreich zugewiesen.",
      });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["task-detail", id] });
    }
  };

  const handleAssignTask = async (assigneeId: string) => {
    if (!task) return;

    const { data, error } = await supabase
      .from("tasks")
      .update({ assigned_to: assigneeId })
      .eq("id", task.id)
      .select();

    if (error) {
      toast({
        title: "Fehler",
        description: `Es gab ein Problem beim Zuweisen der Aufgabe: ${error.message}`,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Aufgabe zugewiesen",
        description: "Die Aufgabe wurde erfolgreich zugewiesen.",
      });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["task-detail", id] });
    }
  };

  return {
    task,
    isLoading,
    error,
    replyTo,
    setReplyTo,
    handleStatusChange,
    handleFollowUp,
    handleCloseWithoutAva,
    handleAssignToMe,
    handleAssignTask,
  };
};
