
import React, { useEffect, useRef } from 'react';
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Message } from '@/types';
import { MessageList } from "./MessageList";

interface ChatScrollAreaProps {
  messages: Message[];
  selectedOptions: Set<string>;
  isLoading: boolean;
  onOptionClick: (option: string) => void;
  messagesEndRef: React.RefObject<HTMLDivElement>;
}

export const ChatScrollArea: React.FC<ChatScrollAreaProps> = ({ 
  messages, 
  selectedOptions, 
  isLoading, 
  onOptionClick,
  messagesEndRef
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
    </div>
  );
};
