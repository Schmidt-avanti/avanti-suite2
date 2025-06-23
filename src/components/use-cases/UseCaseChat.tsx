
import React, { useRef, useEffect } from 'react';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";

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
  handleKeyDown: (event: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  textareaRef: React.RefObject<HTMLTextAreaElement>;
}

const UseCaseChat = ({ 
  messages, 
  chatInput, 
  setChatInput, 
  onSendMessage, 
  loading,
  handleKeyDown,
  textareaRef
}: UseCaseChatProps) => {
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollElement = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollElement) {
        scrollElement.scrollTop = scrollElement.scrollHeight;
      }
    }
  }, [messages]);

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
          
          {loading && (
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
        </div>
      </ScrollArea>
      
      <div className="p-4 border-t bg-gray-50">
        <div className="flex gap-2">
          <Textarea
            ref={textareaRef}
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Beschreibe den Use Case..."
            className="flex-1 resize-none bg-white"
            rows={3}
          />
          <Button 
            onClick={onSendMessage}
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
