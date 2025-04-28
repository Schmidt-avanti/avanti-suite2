
import React, { useEffect } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAuth } from '@/contexts/AuthContext';
import { useTaskMessages, Message } from '@/hooks/useTaskMessages';
import { useTaskChatMessages } from '@/hooks/useTaskChatMessages';
import { useChatScroll } from '@/hooks/useChatScroll';
import { TaskChatMessage } from './TaskChatMessage';
import { TaskChatInput } from './TaskChatInput';
import { TaskChatStatus } from './TaskChatStatus';
import { TaskChatScrollButton } from './TaskChatScrollButton';

interface TaskChatProps {
  taskId: string;
  useCaseId?: string;
  initialMessages?: Message[];
}

export function TaskChat({ taskId, useCaseId, initialMessages = [] }: TaskChatProps) {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  
  const { 
    messages, 
    selectedOptions, 
    setSelectedOptions,
    hasNewMessages,
    setHasNewMessages,
    fetchMessages,
    initialMessageSent,
    setInitialMessageSent
  } = useTaskMessages(taskId, initialMessages);

  const {
    chatContainerRef,
    messagesEndRef,
    showScrollButton,
    handleScroll,
    scrollToBottom,
    autoScroll,
    setAutoScroll
  } = useChatScroll({
    hasNewMessages,
    setHasNewMessages,
    isLoading: false
  });

  const {
    isLoading,
    isRateLimited,
    inputValue,
    setInputValue,
    sendMessage,
    handleRetry
  } = useTaskChatMessages(taskId, useCaseId, fetchMessages);

  // Entferne den useEffect-Hook, der die automatische Nachricht sendet

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim() && !isLoading) {
      sendMessage(inputValue, null, selectedOptions);
      // Enable auto-scroll when user sends a message
      setAutoScroll(true);
    }
  };

  const handleOptionSelect = (option: string) => {
    sendMessage("", option, selectedOptions);
    setAutoScroll(true);
  };

  return (
    <div className="w-full h-full flex flex-col rounded-2xl relative bg-white">
      {/* Chat messages container */}
      <div 
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto overflow-x-hidden p-6 pb-20"
        style={{ 
          maxHeight: isMobile ? 'calc(100vh - 8rem)' : '600px',
          height: '100%'
        }}
        onScroll={handleScroll}
      >
        {messages.length === 0 && !isLoading && (
          <div className="flex items-center justify-center h-32 text-gray-400">
            Starten Sie die Konversation...
          </div>
        )}

        {messages.map((message) => (
          <TaskChatMessage 
            key={message.id}
            message={message}
            selectedOptions={selectedOptions}
            onOptionSelect={handleOptionSelect}
          />
        ))}

        <TaskChatStatus 
          isLoading={isLoading}
          isRateLimited={isRateLimited}
          handleRetry={handleRetry}
        />
        
        {/* Hidden div for intersection observer */}
        <div ref={messagesEndRef} className="h-1" />
      </div>

      <TaskChatScrollButton 
        show={showScrollButton} 
        onClick={scrollToBottom} 
      />

      <TaskChatInput
        inputValue={inputValue}
        setInputValue={setInputValue}
        handleSubmit={handleSubmit}
        isLoading={isLoading}
      />
    </div>
  );
}
