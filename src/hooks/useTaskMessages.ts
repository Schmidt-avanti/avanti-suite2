
import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Message {
  id: string;
  role: "assistant" | "user";
  content: string;
  created_at: string;
  created_by?: string;
  creatorName?: string;
}

export const useTaskMessages = (taskId: string | null, initialMessages: Message[] = []) => {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [loading, setLoading] = useState(false);
  const [selectedOptions, setSelectedOptions] = useState<Set<string>>(new Set());
  const [initialMessageSent, setInitialMessageSent] = useState(false);
  const [hasNewMessages, setHasNewMessages] = useState(false);
  const prevMessagesLengthRef = useRef(messages.length);
  const lastFetchAttemptRef = useRef<number>(0);
  const isFetchingRef = useRef<boolean>(false);
  const fetchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const errorCountRef = useRef<number>(0);
  
  const fetchMessages = useCallback(async () => {
    // Validate taskId before making the database call
    if (!taskId || taskId === "undefined") {
      console.error("Invalid taskId provided to fetchMessages:", taskId);
      return;
    }
    
    // Prevent concurrent fetches
    if (isFetchingRef.current) {
      console.log("Fetch already in progress, skipping...");
      return;
    }
    
    // Implement backoff for repeated errors
    const now = Date.now();
    const timeSinceLastFetch = now - lastFetchAttemptRef.current;
    const minWaitTime = Math.min(2000 * (2 ** errorCountRef.current), 30000); // Exponential backoff up to 30s
    
    if (timeSinceLastFetch < minWaitTime) {
      console.log(`Too soon to retry (${timeSinceLastFetch}ms), need to wait ${minWaitTime}ms`);
      
      // Cancel any existing timeout
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
      
      // Schedule a fetch after the required wait time
      fetchTimeoutRef.current = setTimeout(() => {
        fetchMessages();
      }, minWaitTime - timeSinceLastFetch);
      
      return;
    }
    
    try {
      lastFetchAttemptRef.current = now;
      isFetchingRef.current = true;
      setLoading(true);
      
      // Fetch messages with their creator information
      const { data, error } = await supabase
        .from('task_messages')
        .select('*, creator:created_by("Full Name")')
        .eq('task_id', taskId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      if (data) {
        // Map the data to our Message interface, adding creator name when available
        const typedMessages: Message[] = data.map(msg => ({
          id: msg.id,
          role: msg.role as "assistant" | "user",
          content: msg.content,
          created_at: msg.created_at,
          created_by: msg.created_by,
          creatorName: msg.creator?.["Full Name"] || null
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
        
        // Wenn es bereits Nachrichten gibt, setze initialMessageSent auf true
        if (typedMessages.length > 0) {
          setInitialMessageSent(true);
        }
        
        // Reset error count on success
        errorCountRef.current = 0;
      }
    } catch (error: any) {
      console.error('Error fetching messages:', error);
      // Limit error messages to prevent spamming
      if (errorCountRef.current === 0) {
        toast.error('Fehler beim Laden der Nachrichten');
      }
      errorCountRef.current += 1;
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, [taskId]);

  useEffect(() => {
    // Clean up any scheduled fetches on unmount
    return () => {
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (initialMessages.length === 0) {
      // Only fetch messages if we have a valid taskId
      if (taskId && taskId !== "undefined") {
        fetchMessages();
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
      
      // Wenn es bereits initialMessages gibt, setze initialMessageSent auf true
      if (initialMessages.length > 0) {
        setInitialMessageSent(true);
      }
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
