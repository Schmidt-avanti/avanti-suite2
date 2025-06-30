
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
  const fetchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null); // For fetchMessages internal retry
  const realTimeFetchDebounceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null); // For debouncing real-time events
  const errorCountRef = useRef<number>(0);
  
  const fetchMessages = useCallback(async () => {
    // Validate taskId before making the database call
    // Ensure taskId from the hook's props/scope is used.
    // This function's identity is now stable.
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
      
      // First fetch messages
      const { data: messagesData, error: messagesError } = await supabase
        .from('task_messages')
        .select('*')
        .eq('task_id', taskId)
        .order('created_at', { ascending: true });

      if (messagesError) throw messagesError;

      // If we have messages with creator IDs, fetch their info separately
      let creatorInfo = new Map();
      if (messagesData) {
        const creatorIds = messagesData
          .filter(msg => msg.created_by)
          .map(msg => msg.created_by);
          
        if (creatorIds.length > 0) {
          const { data: creators, error: creatorsError } = await supabase
            .from('profiles')
            .select('id, "Full Name"')
            .in('id', creatorIds);
            
          if (!creatorsError && creators) {
            creators.forEach(creator => {
              creatorInfo.set(creator.id, creator["Full Name"]);
            });
          }
        }
      }

      if (messagesData) {
        // Map the data to our Message interface, adding creator name when available
        const typedMessages: Message[] = messagesData.map(msg => ({
          id: msg.id,
          role: msg.role as "assistant" | "user",
          content: msg.content,
          created_at: msg.created_at,
          created_by: msg.created_by,
          creatorName: msg.created_by ? creatorInfo.get(msg.created_by) : null
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
  }, []);

  useEffect(() => {
    // Clean up any scheduled fetches on unmount
    return () => {
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (taskId) {
      // console.log(`useTaskMessages: taskId effect triggered for ${taskId}. Calling fetchMessages.`);
      fetchMessages();
    } else {
      setMessages([]); // Clear messages if taskId becomes null
    }
  }, [taskId]);

  useEffect(() => {
    if (!taskId) return;

    const handleRealTimeInsert = (payload: any) => {
      // console.log('useTaskMessages: Realtime: New message received. Debouncing fetch.', payload);
      if (realTimeFetchDebounceTimeoutRef.current) {
        clearTimeout(realTimeFetchDebounceTimeoutRef.current);
      }
      realTimeFetchDebounceTimeoutRef.current = setTimeout(() => {
        // console.log('useTaskMessages: Realtime: Debounced fetch executing.');
        fetchMessages();
      }, 500); // Debounce window of 500ms
    };

    // console.log(`useTaskMessages: Setting up real-time subscription for ${taskId}`);
    const channel = supabase
      .channel(`task_messages_realtime:${taskId}`) // Ensure unique channel name per task
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'task_messages', filter: `task_id=eq.${taskId}` },
        handleRealTimeInsert
      )
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          // console.log(`useTaskMessages: Realtime: Subscribed to task_messages for task ${taskId}`);
        }
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.error(`useTaskMessages: Realtime: Subscription error for task ${taskId}:`, err || status);
        }
      });

    return () => {
      // console.log(`useTaskMessages: Cleaning up real-time subscription for ${taskId}`);
      supabase.removeChannel(channel);
      if (realTimeFetchDebounceTimeoutRef.current) {
        clearTimeout(realTimeFetchDebounceTimeoutRef.current);
      }
    };
  }, [taskId, fetchMessages]); // fetchMessages is stable due to useCallback(..., [])

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
