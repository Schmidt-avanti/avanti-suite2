
// Make sure the TaskChatInput component accepts the onSendMessage prop
import React, { useState, FormEvent } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Send } from 'lucide-react';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

export interface TaskChatInputProps {
  onSendMessage: (message: string) => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

export const TaskChatInput: React.FC<TaskChatInputProps> = ({
  onSendMessage,
  isLoading,
  error
}) => {
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!message.trim() || isLoading) return;

    await onSendMessage(message);
    setMessage('');
  };

  return (
    <form onSubmit={handleSubmit}>
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertTitle>Fehler</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <div className="flex">
        <Textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Schreiben Sie eine Nachricht..."
          className="min-h-[80px] focus-visible:ring-blue-400 flex-1 mr-2"
          disabled={isLoading}
        />
        <Button 
          type="submit" 
          className="self-end"
          disabled={isLoading || !message.trim()}
        >
          {isLoading ? (
            <div className="loader h-4 w-4" /> // Simple loading indicator
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>
    </form>
  );
};
