
import React from 'react';
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

const UseCaseChat = ({ messages, chatInput, setChatInput, onSendMessage, loading }: UseCaseChatProps) => {
  return (
    <div className="flex flex-col h-[600px]">
      <ScrollArea className="flex-1 p-4 border rounded-lg mb-4">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`mb-4 p-4 rounded-lg ${
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
            <p className="text-sm">{message.content}</p>
          </div>
        ))}
      </ScrollArea>
      <div className="flex gap-2">
        <Textarea
          value={chatInput}
          onChange={(e) => setChatInput(e.target.value)}
          placeholder="Beschreibe den Use Case..."
          className="flex-1"
        />
        <Button 
          onClick={onSendMessage}
          disabled={loading || !chatInput.trim()}
          className="self-end"
        >
          <Send className="h-4 w-4 mr-2" />
          Senden
        </Button>
      </div>
    </div>
  );
};

export default UseCaseChat;
