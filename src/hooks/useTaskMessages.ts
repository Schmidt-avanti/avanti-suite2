
import { useState, useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Message {
  id: string;
  role: "assistant" | "user";
  content: string;
  created_at: string;
}

export const useTaskMessages = (taskId: string, initialMessages: Message[] = []) => {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [selectedOptions, setSelectedOptions] = useState<Set<string>>(new Set());
  const [initialMessageSent, setInitialMessageSent] = useState(false);
  const [previousResponseId, setPreviousResponseId] = useState<string | null>(null);

  useEffect(() => {
    if (initialMessages.length === 0) {
      fetchMessages();
      
      if (!initialMessageSent) {
        setInitialMessageSent(true);
        setTimeout(() => {
          sendMessage("", null);
        }, 500);
      }
    } else {
      processMessagesForOptions(initialMessages);
    }
  }, [initialMessages]);

  const processMessagesForOptions = (messagesToProcess: Message[]) => {
    const newSelectedOptions = new Set<string>();
    
    // First, find all options from assistant messages
    const allOptions: string[] = [];
    messagesToProcess.forEach(message => {
      if (message.role === 'assistant') {
        try {
          const parsedContent = JSON.parse(message.content);
          if (parsedContent.options && Array.isArray(parsedContent.options)) {
            parsedContent.options.forEach((option: string) => {
              allOptions.push(option);
            });
          }
        } catch (e) {
          // Not parseable as JSON
        }
      }
    });
    
    // Then check which options the user selected
    messagesToProcess.forEach(message => {
      if (message.role === 'user') {
        const content = message.content;
        if (allOptions.includes(content)) {
          newSelectedOptions.add(content);
        }
      }
    });
    
    setSelectedOptions(newSelectedOptions);
  };

  const fetchMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('task_messages')
        .select('*')
        .eq('task_id', taskId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      if (data) {
        const typedMessages: Message[] = data.map(msg => ({
          id: msg.id,
          role: msg.role as "assistant" | "user",
          content: msg.content,
          created_at: msg.created_at
        }));
        setMessages(typedMessages);
        
        processMessagesForOptions(typedMessages);
      }
    } catch (error: any) {
      console.error('Error fetching messages:', error);
      toast.error('Fehler beim Laden der Nachrichten');
    }
  };

  const sendMessage = async (text: string, buttonChoice: string | null = null) => {
    if (buttonChoice) {
      setSelectedOptions(prev => new Set([...prev, buttonChoice]));
    }

    try {
      if ((text && !buttonChoice) || (!text && !buttonChoice)) {
        const { error: messageError } = await supabase
          .from('task_messages')
          .insert({
            task_id: taskId,
            content: text || "Start der Konversation",
            role: 'user'
          });

        if (messageError) throw messageError;
      } else if (buttonChoice) {
        const { error: buttonMessageError } = await supabase
          .from('task_messages')
          .insert({
            task_id: taskId,
            content: buttonChoice,
            role: 'user'
          });

        if (buttonMessageError) throw buttonMessageError;
      }

      const { data, error } = await supabase.functions.invoke('handle-task-chat', {
        body: {
          taskId,
          message: text,
          buttonChoice,
          previousResponseId,
          selectedOptions: Array.from(selectedOptions)
        }
      });

      if (error) throw error;

      setPreviousResponseId(data.response_id);
      fetchMessages();
    } catch (error: any) {
      console.error('Error sending message:', error);
      toast.error('Fehler beim Senden der Nachricht');
    }
  };

  return {
    messages,
    selectedOptions,
    sendMessage,
    fetchMessages
  };
};
