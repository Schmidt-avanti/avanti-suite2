
import React, { useState, useRef, useEffect } from 'react';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Send, Loader2, AlertTriangle, RefreshCw, ArrowDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from '@/contexts/AuthContext';
import { useIsMobile } from '@/hooks/use-mobile';

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
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  const [previousResponseId, setPreviousResponseId] = useState<string | null>(null);
  const [selectedOptions, setSelectedOptions] = useState<Set<string>>(new Set());
  const [initialMessageSent, setInitialMessageSent] = useState(false);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
  const [showScrollButton, setShowScrollButton] = useState(false);

  // Handle scrolling detection
  const handleScroll = () => {
    if (!scrollAreaRef.current) return;
    
    const viewport = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]') as HTMLDivElement;
    if (!viewport) return;
    
    const { scrollHeight, scrollTop, clientHeight } = viewport;
    
    // Consider "scrolled to bottom" if within 30px of the bottom
    const isScrolledToBottom = scrollHeight - scrollTop - clientHeight < 30;
    
    setShouldAutoScroll(isScrolledToBottom);
    setShowScrollButton(!isScrolledToBottom);
  };

  // Scroll to bottom function
  const scrollToBottom = () => {
    if (!scrollAreaRef.current) return;
    
    const viewport = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]') as HTMLDivElement;
    if (viewport) {
      viewport.scrollTop = viewport.scrollHeight;
      setShouldAutoScroll(true);
      setShowScrollButton(false);
    }
  };
  
  // Scroll to bottom only when new messages arrive or when explicitly requested
  useEffect(() => {
    if (shouldAutoScroll && messages.length > 0) {
      setTimeout(scrollToBottom, 100); // Small delay to ensure content is rendered
    }
  }, [messages, shouldAutoScroll]);

  // Force scroll to bottom when loading completes
  useEffect(() => {
    if (!isLoading && messages.length > 0) {
      setTimeout(scrollToBottom, 150);
    }
  }, [isLoading]);

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
      
      // Always scroll to bottom when initially loading messages
      setTimeout(scrollToBottom, 200);
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
        
        // Always scroll to bottom when initially fetching messages
        setTimeout(scrollToBottom, 200);
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
      if (buttonChoice) {
        setSelectedOptions(prev => new Set([...prev, buttonChoice]));
      }

      if ((text && !buttonChoice) || (!text && !buttonChoice)) {
        const { error: messageError } = await supabase
          .from('task_messages')
          .insert({
            task_id: taskId,
            content: text || "Start der Konversation",
            role: 'user',
            created_by: user.id
          });

        if (messageError) throw messageError;
      } else if (buttonChoice) {
        const { error: buttonMessageError } = await supabase
          .from('task_messages')
          .insert({
            task_id: taskId,
            content: buttonChoice,
            role: 'user',
            created_by: user.id
          });

        if (buttonMessageError) throw buttonMessageError;
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
      // Enable auto-scroll when a new message is sent
      setShouldAutoScroll(true);
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
        // If parsing fails, check for options in a text-based format
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
          // Last fallback - look for lists that might contain options
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
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  // Calculate fixed heights for the chat container and scroll area
  const chatHeight = isMobile ? 'calc(100vh - 8rem)' : '600px';

  return (
    <div 
      className="w-full flex flex-col overflow-hidden rounded-2xl bg-transparent"
      style={{ 
        height: chatHeight,
        maxHeight: chatHeight
      }}
      data-chat-panel
    >
      <div className="flex-grow overflow-hidden relative">
        <ScrollArea
          ref={scrollAreaRef}
          className="h-full pb-4 pr-4"
          style={{ maxHeight: `calc(${chatHeight} - 70px)` }}
          onScroll={handleScroll}
        >
          <div className="p-6 space-y-4">
            {messages.length === 0 && !isLoading && (
              <div className="flex items-center justify-center h-32 text-gray-400">
                Starten Sie die Konversation...
              </div>
            )}

            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex flex-col ${message.role === "assistant" ? "items-start" : "items-end"}`}
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
              <div className="flex items-start">
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
              <div className="flex items-start">
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
            
            {/* This empty div is used as a reference for scrolling to the bottom */}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Scroll to bottom button */}
        {showScrollButton && (
          <Button 
            className="absolute bottom-4 right-4 rounded-full w-10 h-10 shadow-md bg-blue-500 hover:bg-blue-600 text-white z-10"
            size="icon"
            onClick={scrollToBottom}
          >
            <ArrowDown className="h-4 w-4" />
          </Button>
        )}
      </div>

      <div className="w-full px-6 pb-6 mt-auto">
        <form
          onSubmit={handleSubmit}
          className="w-full flex gap-2 items-end border border-gray-200 p-3 bg-white rounded-md shadow-sm"
        >
          <Textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ihre Nachricht..."
            className="flex-1 resize-none min-h-[48px] max-h-[96px] border-none bg-transparent focus:ring-0 text-base"
            style={{ fontSize: '1rem', padding: 0 }}
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
