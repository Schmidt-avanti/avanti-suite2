
import React, { useState, useRef, useEffect } from 'react';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Send, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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
  const [buttonOptions, setButtonOptions] = useState<string[]>([]);
  const [previousResponseId, setPreviousResponseId] = useState<string | null>(null);
  
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  
  // Scroll to bottom when messages update
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollElement = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollElement) {
        scrollElement.scrollTop = scrollElement.scrollHeight;
      }
    }
  }, [messages]);

  // Load initial messages if not provided
  useEffect(() => {
    if (initialMessages.length === 0) {
      fetchMessages();
    }
    
    // If there are no messages at all, start the conversation
    if (initialMessages.length === 0) {
      setTimeout(() => {
        sendMessage("", null); // Start conversation with an empty message
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
        // Map the database results to our Message interface, ensuring role is either "assistant" or "user"
        const typedMessages: Message[] = data.map(msg => ({
          id: msg.id,
          // Ensure role is one of our valid types
          role: msg.role === "assistant" || msg.role === "user" 
            ? msg.role as "assistant" | "user" 
            : "assistant", // Default to assistant if invalid
          content: msg.content,
          created_at: msg.created_at
        }));
        
        setMessages(typedMessages);
      }
    } catch (error: any) {
      console.error('Error fetching messages:', error);
      toast.error('Fehler beim Laden der Nachrichten', {
        description: error.message
      });
    }
  };

  const sendMessage = async (text: string, buttonChoice: string | null = null) => {
    setIsLoading(true);
    
    try {
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
      
      // Update the previous response ID for continuity
      setPreviousResponseId(data.response_id);
      
      // Set button options if they exist
      if (data.button_options && data.button_options.length > 0) {
        setButtonOptions(data.button_options);
      } else {
        setButtonOptions([]);
      }
      
      // Refresh messages from the database to get all messages with IDs
      fetchMessages();
      
    } catch (error: any) {
      console.error('Error sending message:', error);
      toast.error('Fehler beim Senden der Nachricht', {
        description: error.message
      });
    } finally {
      setIsLoading(false);
      setInputValue('');
    }
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
      // Clear button options after selection
      setButtonOptions([]);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <Card className="flex flex-col h-[600px] rounded-2xl shadow-md">
      <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
        <div className="space-y-4">
          {messages.length === 0 && !isLoading && (
            <div className="flex items-center justify-center h-32 text-gray-400">
              Starten Sie die Konversation...
            </div>
          )}
          
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex flex-col ${
                message.role === "assistant" ? "items-start" : "items-end"
              }`}
            >
              <div className={`max-w-[80%] p-4 rounded-2xl ${
                message.role === "assistant"
                  ? "bg-blue-100"
                  : "bg-green-100"
              }`}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-semibold text-sm">
                    {message.role === "assistant" ? "Ava" : "Du"}
                  </span>
                </div>
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="flex items-start">
              <div className="max-w-[80%] p-4 rounded-2xl bg-blue-100">
                <div className="flex items-center gap-2 mb-2">
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
          
          {/* Button options */}
          {buttonOptions.length > 0 && !isLoading && (
            <div className="flex flex-wrap gap-2 justify-center">
              {buttonOptions.map((option, index) => (
                <Button
                  key={index}
                  variant="outline"
                  onClick={() => handleButtonClick(option)}
                  className="mt-2"
                >
                  {option}
                </Button>
              ))}
            </div>
          )}
        </div>
      </ScrollArea>
      
      <div className="p-4 border-t bg-gray-50">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ihre Nachricht..."
            className="flex-1 resize-none bg-white min-h-[80px]"
            disabled={isLoading || buttonOptions.length > 0}
          />
          <Button 
            type="submit"
            disabled={isLoading || !inputValue.trim() || buttonOptions.length > 0}
            className="self-end"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </form>
      </div>
    </Card>
  );
}

