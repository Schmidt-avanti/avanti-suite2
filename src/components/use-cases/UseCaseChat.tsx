
import React, { useRef, useEffect } from 'react';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { MessageSquare, Send } from "lucide-react";

interface Message {
  role: "assistant" | "user";
  content: string;
}

interface UseCaseChatProps {
  messages: Message[];
  chatInput: string;
  setChatInput: (value: string) => void;
  onSendMessage: () => void;
  loading: boolean;
}

const UseCaseChat = ({ 
  messages, 
  chatInput, 
  setChatInput, 
  onSendMessage, 
  loading 
}: UseCaseChatProps) => {
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  // Automatisches Scrollen zum neuesten Nachricht
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollElement = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollElement) {
        scrollElement.scrollTop = scrollElement.scrollHeight;
      }
    }
  }, [messages]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && chatInput.trim()) {
      e.preventDefault();
      onSendMessage();
    }
  };

  const handleSendClick = () => {
    if (chatInput.trim()) {
      onSendMessage();
      // Focus on the textarea after sending
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    }
  };

  return (
    <Card className="flex flex-col h-[600px] rounded-2xl shadow-md">
      <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
        <div className="space-y-4">
          {messages.length === 0 && (
            <div className="flex items-center justify-center h-32 text-gray-400">
              Beschreibe den Use Case, um zu beginnen...
            </div>
          )}
          
          {messages.map((message, index) => (
            <div
              key={index}
              className={`p-4 rounded-2xl ${
                message.role === "assistant"
                  ? "bg-primary/10 mr-12"
                  : "bg-secondary/10 ml-12"
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <MessageSquare className="h-4 w-4" />
                <span className="font-semibold">
                  {message.role === "assistant" ? "Ava" : "Du"}
                </span>
              </div>
              <p className="text-sm whitespace-pre-wrap">{message.content}</p>
            </div>
          ))}
          
          {loading && (
            <div className="bg-primary/10 p-4 rounded-2xl mr-12">
              <div className="flex items-center gap-2 mb-2">
                <MessageSquare className="h-4 w-4" />
                <span className="font-semibold">Ava</span>
              </div>
              <div className="flex space-x-2 mt-2">
                <div className="w-2 h-2 rounded-full bg-primary/50 animate-bounce"></div>
                <div className="w-2 h-2 rounded-full bg-primary/50 animate-bounce delay-75"></div>
                <div className="w-2 h-2 rounded-full bg-primary/50 animate-bounce delay-150"></div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
      
      <div className="p-4 border-t">
        <div className="flex gap-2">
          <Textarea
            ref={textareaRef}
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Beschreibe den Use Case..."
            className="flex-1 resize-none"
            rows={3}
          />
          <Button 
            onClick={handleSendClick}
            disabled={loading || !chatInput.trim()}
            className="self-end"
            type="button"
          >
            <Send className="h-4 w-4 mr-2" />
            Senden
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default UseCaseChat;
