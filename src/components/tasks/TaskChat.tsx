
import React, { useEffect, useState } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAuth } from '@/contexts/AuthContext';
import { useTaskMessages, Message } from '@/hooks/useTaskMessages';
import { useTaskChatMessages } from '@/hooks/useTaskChatMessages';
import { useChatScroll } from '@/hooks/useChatScroll';
import { TaskChatMessage } from './TaskChatMessage';
import { TaskChatInput } from './TaskChatInput';
import { TaskChatStatus } from './TaskChatStatus';
import { TaskChatScrollButton } from './TaskChatScrollButton';
import { toast } from '@/components/ui/use-toast';

interface TaskChatProps {
  taskId: string;
  useCaseId?: string;
  initialMessages?: Message[];
}

export function TaskChat({ taskId, useCaseId, initialMessages = [] }: TaskChatProps) {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [emailJustSent, setEmailJustSent] = useState(false);
  
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

  // Listen for email notification events
  useEffect(() => {
    // Simple event listener to detect when an email has been sent
    const handleCustomEvent = (event: CustomEvent) => {
      setEmailJustSent(true);
      
      // If this event contains task_id and it matches our current task, we can be specific
      if (event.detail?.task_id === taskId) {
        console.log('Email sent for current task');
      }
      
      // Hide the notification after 5 seconds
      setTimeout(() => setEmailJustSent(false), 5000);
    };

    window.addEventListener('email-sent', handleCustomEvent as EventListener);
    
    return () => {
      window.removeEventListener('email-sent', handleCustomEvent as EventListener);
    };
  }, [taskId]);

  // Automatische Nachricht senden, wenn ein Use-Case zugeordnet ist und noch keine Nachrichten vorhanden sind
  useEffect(() => {
    const initializeChat = async () => {
      // Nur eine automatische Nachricht senden, wenn:
      // 1. Eine Use-Case-ID vorhanden ist
      // 2. Keine Nachrichten vorhanden sind oder nur eine Benutzernachricht
      // 3. Die initiale Nachricht noch nicht gesendet wurde
      // 4. Nicht bereits lädt
      const hasOnlyUserMessages = messages.length > 0 && !messages.some(msg => msg.role === 'assistant');
      
      if (useCaseId && (messages.length === 0 || hasOnlyUserMessages) && !initialMessageSent && !isLoading) {
        console.log("Auto-starting chat for task with use case:", useCaseId, "Current messages:", messages.length);
        try {
          // Warten, um sicherzustellen, dass der Task erstellt ist
          await new Promise(resolve => setTimeout(resolve, 500));
          
          await sendMessage("", null, new Set<string>());
          setInitialMessageSent(true);
          console.log("Initial message sent successfully");
        } catch (error) {
          console.error("Failed to auto-start chat:", error);
          toast({
            variant: "destructive",
            title: "Fehler",
            description: "Chat konnte nicht automatisch gestartet werden. Bitte versuchen Sie es später erneut."
          });
        }
      }
    };

    // Nach kurzer Verzögerung ausführen, um sicherzustellen, dass die Komponente geladen ist
    const timer = setTimeout(() => {
      initializeChat();
    }, 1000);

    return () => clearTimeout(timer);
  }, [useCaseId, messages, sendMessage, initialMessageSent, isLoading, setInitialMessageSent]);

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
    <div className="w-full h-full flex flex-col rounded-2xl relative bg-white overflow-hidden">
      {/* Chat messages container */}
      <div 
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto overflow-x-hidden p-6 pb-20"
        style={{ 
          maxHeight: isMobile ? 'calc(100vh - 8rem)' : '400px',  // Reduzierte feste Höhe
          height: '400px', // Feste Höhe für den Chat-Bereich
          overflowY: 'auto' // Sicherstellen, dass Scrolling aktiviert ist
        }}
        onScroll={handleScroll}
      >
        {messages.length === 0 && !isLoading && (
          <div className="flex items-center justify-center h-32 text-gray-400">
            {useCaseId ? "Starte Chat..." : "Starten Sie die Konversation..."}
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
        emailSent={emailJustSent}
      />
    </div>
  );
}
