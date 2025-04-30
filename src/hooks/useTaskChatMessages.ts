
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from '@/contexts/AuthContext';
import { TaskMessage } from '@/types';

export interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  created_at: string;
  created_by: string;
}

export const useTaskChatMessages = (
  taskId: string | undefined, 
  useCaseId: string | undefined = undefined,
  onMessageSent: () => void = () => {}
) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isRateLimited, setIsRateLimited] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [previousResponseId, setPreviousResponseId] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState('');
  const { user } = useAuth();

  const sendMessage = async (text: string, buttonChoice: string | null = null, selectedOptions: Set<string> = new Set()) => {
    // Validate taskId
    if (!user || !taskId || taskId === "undefined") {
      console.error("Invalid taskId or user", { taskId, userId: user?.id });
      return;
    }
    
    // Bei automatischer Initialisierung mit leerem Text und ohne ButtonChoice 
    // oder bei normaler Nachrichteneingabe fortfahren
    const isAutoInitialization = text === "" && !buttonChoice && useCaseId;
    
    if (!text && !buttonChoice && !isAutoInitialization) {
      console.log("No message content provided and not auto-initialization, skipping message send");
      return;
    }
    
    // Bereits laufende Anfrage verhindern
    if (isLoading) {
      console.log("Already sending a message, skipping");
      return;
    }
    
    setIsLoading(true);
    setIsRateLimited(false);

    try {
      // Only create user message if it's not an auto-initialization
      if (!isAutoInitialization) {
        // If there's a button choice, create a user message for it
        if (buttonChoice) {
          const { data: userMessageData, error: userMessageError } = await supabase
            .from('task_messages')
            .insert({
              task_id: taskId,
              content: buttonChoice,
              role: 'user',
              created_by: user.id
            })
            .select();
          
          if (userMessageError) throw userMessageError;
        } 
        // Add user text message if provided
        else if (text) {
          const { error: messageError } = await supabase
            .from('task_messages')
            .insert({
              task_id: taskId,
              content: text,
              role: 'user',
              created_by: user.id
            });

          if (messageError) throw messageError;
        }
      }

      console.log("Calling handle-task-chat function with:", {
        taskId,
        useCaseId,
        message: text,
        buttonChoice,
        isAutoInitialization
      });

      const { data, error } = await supabase.functions.invoke('handle-task-chat', {
        body: {
          taskId,
          useCaseId: useCaseId || null,
          message: text,
          buttonChoice,
          previousResponseId,
          selectedOptions: Array.from(selectedOptions),
          isAutoInitialization: isAutoInitialization
        }
      });

      if (error) {
        console.error("Error from handle-task-chat function:", error);
        if (error.message?.includes('rate limit')) {
          setIsRateLimited(true);
          throw new Error('Der API-Dienst ist derzeit überlastet. Bitte versuchen Sie es später erneut.');
        }
        throw error;
      }

      setRetryCount(0);
      setPreviousResponseId(data.response_id);
      onMessageSent();
    } catch (error: any) {
      console.error('Error sending message:', error);
      
      if (error.message?.includes('rate limit') || error.message?.includes('überlastet')) {
        setIsRateLimited(true);
        toast.error('API-Dienst überlastet. Bitte warten Sie einen Moment.');
      } else {
        toast.error('Fehler beim Senden der Nachricht');
      }
    } finally {
      setIsLoading(false);
      setInputValue('');
    }
  };

  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
    setTimeout(() => {
      sendMessage("", null, new Set<string>());
    }, retryCount * 2000);
  };

  return {
    isLoading,
    isRateLimited,
    inputValue,
    setInputValue,
    sendMessage,
    handleRetry,
    retryCount
  };
};
