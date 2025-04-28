
import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Message {
  id: string;
  role: "assistant" | "user";
  content: string;
  created_at: string;
}

export const useTaskMessages = (taskId: string | null, initialMessages: Message[] = []) => {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [loading, setLoading] = useState(false);
  const [selectedOptions, setSelectedOptions] = useState<Set<string>>(new Set());
  const [initialMessageSent, setInitialMessageSent] = useState(false);
  const [hasNewMessages, setHasNewMessages] = useState(false);
  const prevMessagesLengthRef = useRef(messages.length);
  
  const fetchMessages = useCallback(async () => {
    // Validate taskId before making the database call
    if (!taskId || taskId === "undefined") {
      console.error("Invalid taskId provided to fetchMessages:", taskId);
      return;
    }
    
    try {
      setLoading(true);
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
        
        const newSelectedOptions = new Set<string>();
        typedMessages.forEach(message => {
          if (message.role === 'user') {
            try {
              const options = ["Hausschlüssel", "Wohnungsschlüssel", "Briefkastenschlüssel"];
              if (options.includes(message.content)) {
                newSelectedOptions.add(message.content);
              }
            } catch (e) {
              // Not a button choice
            }
          }
        });
        setSelectedOptions(newSelectedOptions);
        
        // Set hasNewMessages to true when fetching messages
        if (typedMessages.length > prevMessagesLengthRef.current) {
          setHasNewMessages(true);
          prevMessagesLengthRef.current = typedMessages.length;
        }
      }
    } catch (error: any) {
      console.error('Error fetching messages:', error);
      toast.error('Fehler beim Laden der Nachrichten');
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    if (initialMessages.length === 0) {
      // Only fetch messages if we have a valid taskId
      if (taskId && taskId !== "undefined") {
        fetchMessages();
        
        if (!initialMessageSent) {
          setInitialMessageSent(true);
          setTimeout(() => {
            // This will be handled by the parent component
          }, 500);
        }
      }
    } else {
      const newSelectedOptions = new Set<string>();
      initialMessages.forEach(message => {
        if (message.role === 'user') {
          try {
            const options = ["Hausschlüssel", "Wohnungsschlüssel", "Briefkastenschlüssel"];
            if (options.includes(message.content)) {
              newSelectedOptions.add(message.content);
            }
          } catch (e) {
            // Not a button choice
          }
        }
      });
      setSelectedOptions(newSelectedOptions);
    }
  }, [initialMessages, taskId, fetchMessages]);

  // Detect new messages by comparing current and previous message counts
  useEffect(() => {
    if (messages.length > prevMessagesLengthRef.current) {
      setHasNewMessages(true);
      prevMessagesLengthRef.current = messages.length;
    }
  }, [messages.length]);

  return { 
    messages, 
    setMessages, 
    loading, 
    selectedOptions, 
    setSelectedOptions,
    hasNewMessages,
    setHasNewMessages,
    fetchMessages,
    initialMessageSent,
    setInitialMessageSent
  };
};
