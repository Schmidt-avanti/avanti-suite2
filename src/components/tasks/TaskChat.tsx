
import React, { useState, useRef, useEffect } from 'react';
import { useTaskMessages } from "@/hooks/useTaskMessages";
import { ChatPanel } from "./chat/ChatPanel";
import { ChatScrollArea } from "./chat/ChatScrollArea";
import { ChatInput } from "./chat/ChatInput";
import type { Message } from '@/types';

interface TaskChatProps {
  taskId: string;
  useCaseId?: string;
  initialMessages?: Message[];
}

export function TaskChat({ taskId, useCaseId, initialMessages = [] }: TaskChatProps) {
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { messages, selectedOptions, sendMessage } = useTaskMessages(taskId, initialMessages);
  const [prevMessagesLength, setPrevMessagesLength] = useState(messages.length);
  
  // Only scroll when messages change or loading state changes
  useEffect(() => {
    const shouldScroll = prevMessagesLength !== messages.length || isLoading;
    if (shouldScroll) {
      scrollToBottom();
      setPrevMessagesLength(messages.length);
    }
  }, [messages.length, isLoading, prevMessagesLength]);

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
      }, 100);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim() && !isLoading) {
      setIsLoading(true);
      await sendMessage(inputValue);
      setInputValue('');
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleOptionClick = async (option: string) => {
    setIsLoading(true);
    await sendMessage("", option);
    setIsLoading(false);
  };

  // Added manual scroll function for user control
  const handleManualScrollToBottom = () => {
    scrollToBottom();
  };

  return (
    <ChatPanel>
      <ChatScrollArea 
        messages={messages}
        selectedOptions={selectedOptions}
        isLoading={isLoading}
        onOptionClick={handleOptionClick}
        messagesEndRef={messagesEndRef}
        onScrollToBottom={handleManualScrollToBottom}
      />

      <div className="w-full px-6 pb-6 mt-auto">
        <ChatInput
          inputValue={inputValue}
          setInputValue={setInputValue}
          isLoading={isLoading}
          onSubmit={handleSubmit}
          onKeyDown={handleKeyDown}
        />
      </div>
    </ChatPanel>
  );
}
