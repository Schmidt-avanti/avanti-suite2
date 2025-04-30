
import React from 'react';
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Send, Loader2 } from "lucide-react";
import { SpellChecker } from '@/components/ui/spell-checker';
import { EmailConfirmationBubble } from './EmailConfirmationBubble';

interface TaskChatInputProps {
  inputValue: string;
  setInputValue: (value: string) => void;
  handleSubmit: (e: React.FormEvent) => void;
  isLoading: boolean;
  emailSent?: boolean;
}

export const TaskChatInput: React.FC<TaskChatInputProps> = ({
  inputValue,
  setInputValue,
  handleSubmit,
  isLoading,
  emailSent = false
}) => {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="sticky bottom-0 w-full px-6 pb-6 pt-4 bg-white shadow-md border-t border-gray-100 z-20">
      {/* Email confirmation bubble */}
      <EmailConfirmationBubble visible={emailSent} />
      
      <form
        onSubmit={handleSubmit}
        className="w-full flex flex-col gap-2 border border-gray-200 p-4 bg-white rounded-md shadow-sm"
      >
        {/* Input area with send button */}
        <div className="relative mb-2">
          <Textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ihre Nachricht..."
            className="flex-1 resize-none min-h-[48px] max-h-[96px] border-none bg-transparent focus:ring-0 text-base px-3 py-2"
            style={{ fontSize: '1rem', padding: '12px' }}
            disabled={isLoading}
          />
          <div className="absolute bottom-2 right-2">
            <Button
              type="submit"
              disabled={isLoading || !inputValue.trim()}
              className="bg-blue-500 hover:bg-blue-600 text-white rounded-md h-11 w-11 flex items-center justify-center shadow transition-all"
              tabIndex={0}
            >
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Send className="h-5 w-5" />
              )}
            </Button>
          </div>
        </div>
        
        {/* Always show spell checker when there's text */}
        {inputValue.trim().length > 0 && (
          <div className="mt-4">
            <SpellChecker text={inputValue} onCorrect={setInputValue} />
          </div>
        )}
      </form>
    </div>
  );
}
