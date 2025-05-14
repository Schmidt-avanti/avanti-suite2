
import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { TaskChatMessage } from './TaskChatMessage';
import { TaskChatInput } from './TaskChatInput';
import { TaskChatScrollButton } from './TaskChatScrollButton';
import { TaskChatStatus } from './TaskChatStatus';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useTaskMessages } from '@/hooks/useTaskMessages';
import { Skeleton } from '@/components/ui/skeleton';
import { useChatScroll } from '@/hooks/useChatScroll';

interface TaskChatProps {
  taskId: string;
  useCaseId?: string;
}

export const TaskChat: React.FC<TaskChatProps> = ({ taskId, useCaseId }) => {
  const { user } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const { messages, isLoading, addUserMessage } = useTaskMessages(taskId);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);

  // Use the chat scroll hook
  useChatScroll({
    messages,
    messagesEndRef,
    chatContainerRef,
    onScrollChange: (scrolled) => setShowScrollButton(scrolled),
  });

  const handleSendMessage = async (message: string) => {
    if (!message.trim() || !user || isProcessing) return;

    setIsProcessing(true);
    try {
      // Add the user's message
      await addUserMessage(message);
      
      // Clear the input field and scroll to the bottom
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
      }
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div 
        ref={chatContainerRef} 
        className="flex-grow overflow-hidden relative"
      >
        <ScrollArea className="h-full">
          <div className="p-4 space-y-4">
            {isLoading ? (
              // Loading skeletons
              Array(3).fill(0).map((_, idx) => (
                <div key={idx} className="flex gap-2 items-start">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-16 w-full" />
                  </div>
                </div>
              ))
            ) : (
              <>
                {messages && messages.length > 0 ? (
                  messages.map((message) => (
                    <TaskChatMessage key={message.id} message={message} />
                  ))
                ) : (
                  <TaskChatStatus text="Starten Sie die Konversation, indem Sie eine Nachricht senden." />
                )}
              </>
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>
        
        {showScrollButton && (
          <TaskChatScrollButton onClick={scrollToBottom} />
        )}
      </div>

      <TaskChatInput 
        onSendMessage={handleSendMessage} 
        isProcessing={isProcessing} 
        useCaseId={useCaseId}
      />
    </div>
  );
};
