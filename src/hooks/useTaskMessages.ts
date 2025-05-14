
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { TaskMessage } from "@/types";

export const useTaskMessages = (taskId: string | null) => {
  const queryClient = useQueryClient();
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);

  const { data: messages, isLoading, error } = useQuery({
    queryKey: ["task-messages", taskId],
    queryFn: async () => {
      if (!taskId) return [];

      const { data, error } = await supabase
        .from("task_messages")
        .select(`
          *,
          creator:created_by(id, email, "Full Name")
        `)
        .eq("task_id", taskId)
        .order("created_at", { ascending: true });

      if (error) throw error;

      // Add creator information to each message, safely handling possible null values
      return data.map(message => {
        // Safely extract creator info if it exists
        const creatorName = message.creator ? message.creator["Full Name"] : null;
        const creatorEmail = message.creator ? message.creator.email : null;
        
        return {
          ...message,
          creator_name: creatorName,
          creator_email: creatorEmail
        };
      }) as TaskMessage[];
    },
    enabled: !!taskId,
  });

  // Listen for new messages
  useEffect(() => {
    if (!taskId) return;

    const channel = supabase
      .channel(`task-messages-${taskId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "task_messages",
          filter: `task_id=eq.${taskId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["task-messages", taskId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [taskId, queryClient]);

  // Function to add a user's message
  const addUserMessage = async (content: string) => {
    if (!taskId) return { error: new Error("No task ID provided") };

    const { data, error } = await supabase
      .from("task_messages")
      .insert({
        task_id: taskId,
        role: "user",
        content,
      })
      .select();

    return { data, error };
  };

  // Function to handle button click in chat
  const handleButtonClick = (buttonText: string, messageId: string) => {
    if (selectedOptions.includes(buttonText)) {
      // If option is already selected, do nothing
      return;
    }
    setSelectedOptions((prev) => [...prev, buttonText]);
  };

  return {
    messages,
    isLoading,
    error,
    addUserMessage,
    selectedOptions,
    handleButtonClick,
  };
};
