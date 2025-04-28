
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from '@/contexts/AuthContext';
import { Message } from './useTaskMessages';

export const useTaskChatMessages = (
  taskId: string | undefined, 
  useCaseId: string | undefined,
  onMessageSent: () => void
) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isRateLimited, setIsRateLimited] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [previousResponseId, setPreviousResponseId] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState('');
  const { user } = useAuth();

  const sendMessage = async (text: string, buttonChoice: string | null = null, selectedOptions: Set<string>) => {
    if (!user || !taskId || taskId === "undefined") return;
    setIsLoading(true);
    setIsRateLimited(false);

    try {
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
      // Für die erste Nachricht eine benutzerfreundlichere Nachricht senden
      else if (!text && !buttonChoice) {
        const { error: messageError } = await supabase
          .from('task_messages')
          .insert({
            task_id: taskId,
            content: "Wie kann ich Ihnen helfen?",
            role: 'user',
            created_by: user.id
          });

        if (messageError) throw messageError;
      }

      const { data, error } = await supabase.functions.invoke('handle-task-chat', {
        body: {
          taskId,
          useCaseId: useCaseId || null,
          message: text,
          buttonChoice,
          previousResponseId,
          selectedOptions: Array.from(selectedOptions)
        }
      });

      if (error) {
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
