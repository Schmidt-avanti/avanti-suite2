
import React, { useState, useRef, useEffect } from 'react';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from '@/contexts/AuthContext';
import { useIsMobile } from '@/hooks/use-mobile';

interface Message {
  id: string;
  role: "assistant" | "user";
  content: string;
  created_at: string;
  metadata?: {
    use_case_progress?: {
      current_step: number;
      total_steps: number;
      completed_steps: string[];
    };
  };
}

interface TaskChatProps {
  taskId: string;
  useCaseId?: string;
  initialMessages?: Message[];
}

export function TaskChat({ taskId, useCaseId, initialMessages = [] }: TaskChatProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const isMobile = useIsMobile();

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      const scrollArea = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollArea) {
        scrollArea.scrollTop = scrollArea.scrollHeight;
      }
    }
  }, [messages]);

  useEffect(() => {
    if (initialMessages.length === 0) {
      fetchMessages();
      setTimeout(() => {
        sendMessage("", null);
      }, 500);
    }
  }, []);

  const fetchMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('task_messages')
        .select('*')
        .eq('task_id', taskId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (error: any) {
      console.error('Error fetching messages:', error);
      toast.error('Fehler beim Laden der Nachrichten');
    }
  };

  const sendMessage = async (text: string, buttonChoice: string | null = null) => {
    if (!user) return;
    setIsLoading(true);

    try {
      if (text && !buttonChoice) {
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

      const { data, error } = await supabase.functions.invoke('handle-task-chat', {
        body: {
          taskId,
          useCaseId,
          message: text,
          buttonChoice
        }
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      await fetchMessages();
    } catch (error: any) {
      console.error('Error sending message:', error);
      toast.error('Fehler beim Senden der Nachricht');
    } finally {
      setIsLoading(false);
      setInput('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (input.trim()) sendMessage(input);
    }
  };

  const handleButtonClick = (option: string) => {
    if (!isLoading) {
      sendMessage("", option);
    }
  };

  const renderMessage = (message: Message) => {
    try {
      // Try to parse as JSON first
      let parsedContent;
      try {
        parsedContent = JSON.parse(message.content);
      } catch {
        // If not JSON, render as plain text with button extraction
        const buttonMatches = message.content.match(/\[(.*?)\]/g);
        return (
          <div className="space-y-3">
            <div className="whitespace-pre-wrap">
              {message.content.replace(/\[(.*?)\]/g, '')}
            </div>
            {buttonMatches && (
              <div className={`flex flex-wrap gap-2 mt-2 ${isMobile ? 'flex-col' : ''}`}>
                {buttonMatches.map((match, idx) => {
                  const option = match.replace(/[\[\]]/g, '');
                  return (
                    <Button
                      key={idx}
                      variant="outline"
                      onClick={() => handleButtonClick(option)}
                      className="rounded text-sm px-4 py-1 hover:bg-blue-100"
                      size={isMobile ? "sm" : "default"}
                    >
                      {option}
                    </Button>
                  );
                })}
              </div>
            )}
            {message.metadata?.use_case_progress && (
              <div className="mt-4 text-xs text-gray-500">
                Fortschritt: Schritt {message.metadata.use_case_progress.current_step + 1} von {message.metadata.use_case_progress.total_steps}
              </div>
            )}
          </div>
        );
      }

      // If it was JSON, handle structured content
      return (
        <div className="space-y-3">
          <div className="whitespace-pre-wrap">{parsedContent.text}</div>
          {parsedContent.options && (
            <div className={`flex flex-wrap gap-2 mt-2 ${isMobile ? 'flex-col' : ''}`}>
              {parsedContent.options.map((option: string, idx: number) => (
                <Button
                  key={idx}
                  variant="outline"
                  onClick={() => handleButtonClick(option)}
                  className="rounded text-sm px-4 py-1 hover:bg-blue-100"
                  size={isMobile ? "sm" : "default"}
                >
                  {option}
                </Button>
              ))}
            </div>
          )}
        </div>
      );
    } catch (e) {
      return <div className="whitespace-pre-wrap">{message.content}</div>;
    }
  };

  return (
    <div className="w-full h-full flex flex-col justify-between rounded-2xl bg-transparent p-6"
      style={{ 
        boxSizing: 'border-box', 
        minHeight: '400px', 
        maxHeight: isMobile ? '100vh' : '600px',
        padding: isMobile ? '1rem' : '1.5rem' 
      }}
      data-chat-panel
    >
      <div className="flex-1 flex flex-col min-h-0">
        <ScrollArea
          className="flex-1 pr-2 min-h-0 overflow-y-auto custom-scrollbar"
          ref={scrollRef}
        >
          <div className="space-y-4 pb-2">
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
          </div>
        </ScrollArea>
      </div>

      <div className="mt-4">
        <div className="relative">
          <Textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ihre Nachricht..."
            className="pr-16 resize-none min-h-[50px] max-h-[120px] text-sm border-gray-200 shadow-sm focus-visible:ring-blue-500"
            rows={1}
            disabled={isLoading}
          />
          <Button
            onClick={() => input.trim() && sendMessage(input)}
            disabled={!input.trim() || isLoading}
            className="absolute bottom-1.5 right-1.5 h-10 w-10 rounded-full bg-blue-500 hover:bg-blue-600 p-0 flex items-center justify-center shadow-md"
            aria-label="Senden"
          >
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin text-white" />
            ) : (
              <Send className="h-5 w-5 text-white" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
