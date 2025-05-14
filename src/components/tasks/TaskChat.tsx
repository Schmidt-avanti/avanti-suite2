import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { TaskChatMessage } from './TaskChatMessage';
import { TaskChatInput } from './TaskChatInput';
import { TaskChatStatus } from './TaskChatStatus';
import { TaskChatScrollButton } from './TaskChatScrollButton';
import { useTaskMessages } from '@/hooks/useTaskMessages';
import { useChatScroll } from '@/hooks/useChatScroll';
import { toast } from '@/components/ui/use-toast';

interface TaskChatProps {
  taskId: string;
  useCaseId: string | null;
}

interface TaskChatStatusProps {
  isLoading: boolean;
  isRateLimited: boolean;
  handleRetry: () => void;
}

interface TaskChatScrollButtonProps {
  onClick: () => void;
  show: boolean;
}

interface TaskChatInputProps {
  onSendMessage: (message: string) => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

export const TaskChat: React.FC<TaskChatProps> = ({ taskId, useCaseId }) => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previousResponseId, setPreviousResponseId] = useState<string | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const { 
    messages, 
    isLoading: messagesLoading, 
    addUserMessage, 
    selectedOptions,
    handleButtonClick 
  } = useTaskMessages(taskId);

  const { showScrollButton, scrollToBottom } = useChatScroll(
    messagesContainerRef,
    messages
  );

  // Auto-initialize chat if there are no messages
  useEffect(() => {
    const shouldInitializeChat = !messagesLoading && messages?.length === 0 && useCaseId;
    
    if (shouldInitializeChat) {
      console.log('Auto-initializing chat for task:', taskId);
      initializeChat();
    }
  }, [messagesLoading, messages, useCaseId, taskId]);

  const initializeChat = async () => {
    try {
      setIsLoading(true);
      setIsTyping(true);
      setError(null);

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/handle-task-chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({ 
          taskId, 
          useCaseId, 
          isAutoInitialization: true
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Fehler beim Initialisieren des Chats');
      }

      const data = await response.json();
      setPreviousResponseId(data.response_id);

    } catch (err) {
      console.error('Error initializing chat:', err);
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
      setIsTyping(false);
    }
  };

  const handleSendMessage = async (message: string) => {
    if (!message.trim()) return;
    
    try {
      setIsLoading(true);
      setError(null);

      // Add user message to the database
      await addUserMessage(message);
      
      setIsTyping(true);

      // Generate AI response
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/handle-task-chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({ 
          taskId, 
          useCaseId, 
          message, 
          previousResponseId,
          selectedOptions
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        
        // Special handling for rate limit errors
        if (errorData.is_rate_limit) {
          toast({
            title: "API-Limit erreicht",
            description: "Bitte versuchen Sie es in einigen Sekunden erneut.",
            variant: "destructive"
          });
        } else {
          throw new Error(errorData.error || 'Fehler bei der Kommunikation');
        }
      } else {
        const data = await response.json();
        setPreviousResponseId(data.response_id);
      }

    } catch (err) {
      console.error('Error in chat:', err);
      setError((err as Error).message);
      
      toast({
        title: "Fehler",
        description: (err as Error).message,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
      setIsTyping(false);
    }
  };

  const handleButtonClickInChat = async (buttonText: string, messageId: string) => {
    if (selectedOptions.includes(buttonText)) return;
    
    handleButtonClick(buttonText, messageId);
    
    try {
      setIsLoading(true);
      setError(null);
      setIsTyping(true);

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/handle-task-chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({ 
          taskId, 
          useCaseId, 
          buttonChoice: buttonText,
          previousResponseId: messageId,
          selectedOptions: [...selectedOptions, buttonText]
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Fehler bei der Kommunikation');
      }

      const data = await response.json();
      setPreviousResponseId(data.response_id);

    } catch (err) {
      console.error('Error handling button click:', err);
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
      setIsTyping(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-4"
      >
        {messages?.map((message) => (
          <TaskChatMessage
            key={message.id}
            message={message}
            onButtonClick={handleButtonClickInChat}
            selectedOptions={selectedOptions}
          />
        ))}
        {isTyping && <TaskChatStatus isLoading={true} isRateLimited={false} handleRetry={() => {}} />}
      </div>
      
      {showScrollButton && (
        <TaskChatScrollButton onClick={scrollToBottom} show={true} />
      )}

      <div className="border-t p-4">
        <TaskChatInput 
          onSendMessage={handleSendMessage} 
          isLoading={isLoading}
          error={error}
        />
      </div>
    </div>
  );
};
