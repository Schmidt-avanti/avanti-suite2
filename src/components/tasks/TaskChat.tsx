import React, { useState, useRef, useEffect } from 'react';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Send, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from '@/contexts/AuthContext';

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
  const [previousResponseId, setPreviousResponseId] = useState<string | null>(null);
  const { user } = useAuth();
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollElement = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollElement) {
        scrollElement.scrollTop = scrollElement.scrollHeight;
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

      if (data) {
        const typedMessages: Message[] = data.map(msg => ({
          id: msg.id,
          role: msg.role as "assistant" | "user",
          content: msg.content,
          created_at: msg.created_at
        }));
        setMessages(typedMessages);
      }
    } catch (error: any) {
      console.error('Error fetching messages:', error);
      toast.error('Fehler beim Laden der Nachrichten', { description: error.message });
    }
  };

  const sendMessage = async (text: string, buttonChoice: string | null = null) => {
    if (!user) return;
    setIsLoading(true);

    try {
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
      }

      const { data, error } = await supabase.functions.invoke('handle-task-chat', {
        body: {
          taskId,
          useCaseId,
          message: text,
          buttonChoice,
          previousResponseId
        }
      });

      if (error) throw error;

      setPreviousResponseId(data.response_id);
      fetchMessages();
    } catch (error: any) {
      console.error('Error sending message:', error);
      toast.error('Fehler beim Senden der Nachricht', { description: error.message });
    } finally {
      setIsLoading(false);
      setInputValue('');
    }
  };

  const renderMessage = (message: Message) => {
    if (message.role === "assistant") {
      try {
        let parsed = JSON.parse(message.content);
        
        if (parsed.text && Array.isArray(parsed.options)) {
          return (
            <div className="space-y-3">
              <div className="text-sm whitespace-pre-wrap">{parsed.text}</div>
              <div className="flex flex-wrap gap-2 mt-2">
                {parsed.options.map((option: string, idx: number) => (
                  <Button
                    key={idx}
                    variant="outline"
                    onClick={() => handleButtonClick(option)}
                    className="rounded text-sm px-4 py-1 hover:bg-blue-100"
                  >
                    {option}
                  </Button>
                ))}
              </div>
            </div>
          );
        }

        if (parsed.chat_response?.steps_block && Array.isArray(parsed.chat_response.steps_block)) {
          return (
            <div className="space-y-2">
              {parsed.chat_response.steps_block.map((step: string, index: number) => (
                <div key={index} className="p-2 rounded bg-blue-50/50 border border-blue-100/50">
                  {step}
                </div>
              ))}
            </div>
          );
        }

        if (parsed.text) {
          return <div className="whitespace-pre-wrap">{parsed.text}</div>;
        }

        return <div className="whitespace-pre-wrap">{message.content}</div>;
      } catch (e) {
        return <div className="whitespace-pre-wrap">{message.content}</div>;
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

  const handleButtonClick = (option: string) => {
    if (!isLoading) {
      sendMessage("", option);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="w-full h-full flex flex-col justify-between rounded-2xl bg-transparent p-6"
      style={{ boxSizing: 'border-box', minHeight: '400px', maxHeight: '600px' }}
      data-chat-panel
    >
      <div className="flex-1 flex flex-col min-h-0">
        <ScrollArea
          className="flex-1 pr-2 min-h-0 overflow-y-auto custom-scrollbar"
          ref={scrollAreaRef}
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
                  max-w-[80%] p-4
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
                  <div className="text-sm whitespace-pre-wrap">
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

      <div className="w-full mt-4 flex items-center">
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
