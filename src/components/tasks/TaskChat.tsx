
import React, { useState, useRef, useEffect } from 'react';
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Send, Loader2, AlertTriangle, RefreshCw, ArrowDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from '@/contexts/AuthContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { ScrollArea } from "@/components/ui/scroll-area";

interface Message {
  id: string;
  role: "assistant" | "user";
  content: string;
  created_at: string;
}

interface TaskChatProps {
  taskId: string;
  useCaseId?: string;
  initialMessages?: Message[];
}

export function TaskChat({ taskId, useCaseId, initialMessages = [] }: TaskChatProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRateLimited, setIsRateLimited] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const { user } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  const [previousResponseId, setPreviousResponseId] = useState<string | null>(null);
  const [selectedOptions, setSelectedOptions] = useState<Set<string>>(new Set());
  const [initialMessageSent, setInitialMessageSent] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  
  // Track if new messages have been added
  const [hasNewMessages, setHasNewMessages] = useState(false);
  // Track the previous message count to detect new messages
  const prevMessagesLengthRef = useRef(messages.length);
  
  // Set up intersection observer to detect when bottom of chat is visible
  useEffect(() => {
    if (!chatContainerRef.current) return;
    
    const observer = new IntersectionObserver(
      ([entry]) => {
        // Only update the scroll button visibility
        setShowScrollButton(!entry.isIntersecting);
        
        // If we can see the bottom and there are new messages, enable auto-scroll
        if (entry.isIntersecting && hasNewMessages) {
          setAutoScroll(true);
          setHasNewMessages(false);
        }
      },
      {
        root: chatContainerRef.current,
        rootMargin: '0px',
        threshold: 0.1 // Detect when element is 10% visible
      }
    );
    
    if (messagesEndRef.current) {
      observer.observe(messagesEndRef.current);
    }
    
    return () => {
      if (messagesEndRef.current) {
        observer.unobserve(messagesEndRef.current);
      }
    };
  }, [hasNewMessages]);

  // Detect new messages by comparing current and previous message counts
  useEffect(() => {
    if (messages.length > prevMessagesLengthRef.current) {
      setHasNewMessages(true);
      prevMessagesLengthRef.current = messages.length;
    }
  }, [messages.length]);

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
      setAutoScroll(true);
      setHasNewMessages(false);
    }
  };

  // Auto-scroll when new messages arrive or after loading, but only if autoScroll is true
  useEffect(() => {
    if ((autoScroll && !isLoading && hasNewMessages) || 
        (autoScroll && !isLoading && messages.length > 0 && messages.length !== prevMessagesLengthRef.current)) {
      const timer = setTimeout(scrollToBottom, 100);
      return () => clearTimeout(timer);
    }
  }, [isLoading, messages.length, autoScroll, hasNewMessages]);

  // Handle manual scroll to disable auto-scrolling
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (!chatContainerRef.current) return;
    
    const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    
    // Only disable auto-scroll if we're scrolling up (away from the bottom)
    // Use a larger threshold to avoid flickering
    if (distanceFromBottom > 150) {
      setAutoScroll(false);
    }
  };

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
  }, [initialMessages]);

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
    }
  };

  const sendMessage = async (text: string, buttonChoice: string | null = null) => {
    if (!user) return;
    setIsLoading(true);
    setIsRateLimited(false);

    try {
      // If there's a button choice, add it to selected options and create a user message
      if (buttonChoice) {
        setSelectedOptions(prev => new Set([...prev, buttonChoice]));
        
        // Always insert a user message for button choices
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
        
        // Add the button choice to local messages immediately for UI update
        if (userMessageData && userMessageData.length > 0) {
          const newMessage = {
            id: userMessageData[0].id,
            role: 'user' as const,
            content: buttonChoice,
            created_at: userMessageData[0].created_at
          };
          setMessages(prev => [...prev, newMessage]);
        }
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
      // For initial message (empty text, no button choice)
      else if (!text && !buttonChoice) {
        const { error: messageError } = await supabase
          .from('task_messages')
          .insert({
            task_id: taskId,
            content: "Start der Konversation",
            role: 'user',
            created_by: user.id
          });

        if (messageError) throw messageError;
      }

      const { data, error } = await supabase.functions.invoke('handle-task-chat', {
        body: {
          taskId,
          useCaseId,
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
      await fetchMessages();
      
      // Explicitly set hasNewMessages to true and enable auto-scroll after sending
      setHasNewMessages(true);
      setAutoScroll(true);
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
      sendMessage("", null);
    }, retryCount * 2000);
  };

  const renderMessage = (message: Message) => {
    if (message.role === "assistant") {
      try {
        const parsedContent = JSON.parse(message.content);
        
        return (
          <div className="space-y-3">
            <div className="text-sm whitespace-pre-wrap">{parsedContent.text}</div>
            {parsedContent.options && parsedContent.options.length > 0 && (
              <div className={`flex flex-wrap gap-2 mt-2 ${isMobile ? 'flex-col' : ''}`}>
                {parsedContent.options.map((option: string, idx: number) => {
                  if (selectedOptions.has(option)) {
                    return null;
                  }
                  
                  return (
                    <Button
                      key={idx}
                      variant="outline"
                      onClick={() => sendMessage("", option)}
                      className="rounded text-sm px-4 py-1 hover:bg-blue-100"
                      size={isMobile ? "sm" : "default"}
                    >
                      {option}
                    </Button>
                  );
                })}
              </div>
            )}
          </div>
        );
      } catch (e) {
        const content = message.content;
        const text = content;
        const optionsMatch = content.match(/\[(.*?)\]/);
        
        if (optionsMatch) {
          try {
            const optionsText = optionsMatch[1];
            const options = optionsText.split(',').map(o => 
              o.trim().replace(/"/g, '').replace(/^\[|\]$/g, '')
            );
            
            return (
              <div className="space-y-3">
                <div className="text-sm whitespace-pre-wrap">{text}</div>
                {options.length > 0 && (
                  <div className={`flex flex-wrap gap-2 mt-2 ${isMobile ? 'flex-col' : ''}`}>
                    {options.map((option: string, idx: number) => {
                      if (selectedOptions.has(option)) {
                        return null;
                      }
                      
                      return (
                        <Button
                          key={idx}
                          variant="outline"
                          onClick={() => sendMessage("", option)}
                          className="rounded text-sm px-4 py-1 hover:bg-blue-100"
                          size={isMobile ? "sm" : "default"}
                        >
                          {option}
                        </Button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          } catch (err) {
            return <div className="whitespace-pre-wrap">{content}</div>;
          }
        } else {
          const listMatch = content.match(/(?:\d+\.\s+(.*?)(?:\n|$))+/g);
          if (listMatch && content.toLowerCase().includes('schlüssel')) {
            const defaultOptions = ["Hausschlüssel", "Wohnungsschlüssel", "Briefkastenschlüssel"];
            
            return (
              <div className="space-y-3">
                <div className="text-sm whitespace-pre-wrap">{content}</div>
                <div className={`flex flex-wrap gap-2 mt-2 ${isMobile ? 'flex-col' : ''}`}>
                  {defaultOptions.map((option: string, idx: number) => {
                    if (selectedOptions.has(option)) {
                      return null;
                    }
                    
                    return (
                      <Button
                        key={idx}
                        variant="outline"
                        onClick={() => sendMessage("", option)}
                        className="rounded text-sm px-4 py-1 hover:bg-blue-100"
                        size={isMobile ? "sm" : "default"}
                      >
                        {option}
                      </Button>
                    );
                  })}
                </div>
              </div>
            );
          }
          
          return <div className="whitespace-pre-wrap">{content}</div>;
        }
      }
    }
    return <div className="whitespace-pre-wrap">{message.content}</div>;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim() && !isLoading) {
      sendMessage(inputValue);
      // Enable auto-scroll when user sends a message
      setAutoScroll(true);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="w-full h-full flex flex-col rounded-2xl relative bg-white">
      {/* Chat messages container */}
      <div 
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto overflow-x-hidden p-6 pb-20"
        style={{ 
          maxHeight: isMobile ? 'calc(100vh - 8rem)' : '600px',
          height: '100%'
        }}
        onScroll={handleScroll}
      >
        {messages.length === 0 && !isLoading && (
          <div className="flex items-center justify-center h-32 text-gray-400">
            Starten Sie die Konversation...
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex flex-col mb-4 ${message.role === "assistant" ? "items-start" : "items-end"}`}
          >
            <div className={`
              ${isMobile ? 'max-w-[90%]' : 'max-w-[80%]'} p-4 rounded
              ${message.role === "assistant"
                ? "bg-blue-100 text-gray-900"
                : "bg-gray-100 text-gray-900"
              }
              border border-blue-50/40
            `}>
              <div className="flex items-center gap-2 mb-1">
                <span className="font-semibold text-sm">
                  {message.role === "assistant" ? "Ava" : "Du"}
                </span>
              </div>
              <div className="text-sm">
                {renderMessage(message)}
              </div>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex items-start mb-4">
            <div className="max-w-[80%] p-4 rounded bg-blue-100 shadow-sm border border-blue-50/40">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-semibold text-sm">Ava</span>
              </div>
              <div className="flex space-x-2">
                <div className="w-2 h-2 rounded-full bg-blue-400 animate-bounce"></div>
                <div className="w-2 h-2 rounded-full bg-blue-400 animate-bounce delay-75"></div>
                <div className="w-2 h-2 rounded-full bg-blue-400 animate-bounce delay-150"></div>
              </div>
            </div>
          </div>
        )}

        {isRateLimited && !isLoading && (
          <div className="flex items-start mb-4">
            <div className="max-w-[80%] p-4 rounded bg-yellow-50 shadow-sm border border-yellow-200 text-amber-800">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-4 w-4" />
                <span className="font-semibold text-sm">API-Dienst überlastet</span>
              </div>
              <p className="text-sm mb-3">
                Der API-Dienst ist derzeit überlastet. Bitte warten Sie einen Moment und versuchen Sie es dann erneut.
              </p>
              <Button
                variant="outline" 
                size="sm"
                onClick={handleRetry}
                className="text-xs"
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Erneut versuchen
              </Button>
            </div>
          </div>
        )}
        
        {/* Hidden div for intersection observer */}
        <div ref={messagesEndRef} className="h-1" />
      </div>

      {/* Scroll to bottom button */}
      {showScrollButton && (
        <Button 
          className="absolute bottom-28 right-8 rounded-full w-10 h-10 shadow-lg bg-blue-500 hover:bg-blue-600 text-white z-10"
          size="icon"
          onClick={scrollToBottom}
        >
          <ArrowDown className="h-4 w-4" />
        </Button>
      )}

      {/* Message input area - Added more padding */}
      <div className="sticky bottom-0 w-full px-6 pb-6 pt-4 bg-white shadow-md border-t border-gray-100 z-20">
        <form
          onSubmit={handleSubmit}
          className="w-full flex gap-2 items-end border border-gray-200 p-4 bg-white rounded-md shadow-sm"
        >
          <Textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ihre Nachricht..."
            className="flex-1 resize-none min-h-[48px] max-h-[96px] border-none bg-transparent focus:ring-0 text-base px-3 py-2"
            style={{ fontSize: '1rem', padding: '12px' }}
            disabled={isLoading}
          />
          <Button
            type="submit"
            disabled={isLoading || !inputValue.trim()}
            className="bg-blue-500 hover:bg-blue-600 text-white rounded-md h-11 w-11 flex items-center justify-center shadow transition-all"
            tabIndex={0}
          >
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
