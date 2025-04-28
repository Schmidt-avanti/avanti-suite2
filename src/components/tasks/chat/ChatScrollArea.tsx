
import React from 'react';
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Message } from '@/types';
import { MessageList } from "./MessageList";
import { Button } from "@/components/ui/button";
import { ArrowDown } from "lucide-react";

interface ChatScrollAreaProps {
  messages: Message[];
  selectedOptions: Set<string>;
  isLoading: boolean;
  onOptionClick: (option: string) => void;
  messagesEndRef: React.RefObject<HTMLDivElement>;
  onScrollToBottom?: () => void;
}

export const ChatScrollArea: React.FC<ChatScrollAreaProps> = ({ 
  messages, 
  selectedOptions, 
  isLoading, 
  onOptionClick,
  messagesEndRef,
  onScrollToBottom
}) => {
  return (
    <div className="flex-grow overflow-hidden relative">
      <ScrollArea
        className="h-full pb-4 pr-4"
        style={{ maxHeight: 'calc(600px - 70px)' }}
      >
        <div className="p-6">
          <MessageList
            messages={messages}
            selectedOptions={selectedOptions}
            isLoading={isLoading}
            onOptionClick={onOptionClick}
            messagesEndRef={messagesEndRef}
          />
        </div>
      </ScrollArea>
      
      {/* Scroll to bottom button */}
      {onScrollToBottom && messages.length > 3 && (
        <Button
          onClick={onScrollToBottom}
          size="sm"
          className="absolute bottom-4 right-4 rounded-full w-8 h-8 p-0 bg-blue-500 hover:bg-blue-600 shadow-md"
          aria-label="Nach unten scrollen"
          title="Nach unten scrollen"
        >
          <ArrowDown className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
};
