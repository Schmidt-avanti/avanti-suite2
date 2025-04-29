
import React from 'react';
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Send, Loader2 } from "lucide-react";

interface TaskChatInputProps {
  inputValue: string;
  setInputValue: (value: string) => void;
  handleSubmit: (e: React.FormEvent) => void;
  isLoading: boolean;
}

export const TaskChatInput: React.FC<TaskChatInputProps> = ({
  inputValue,
  setInputValue,
  handleSubmit,
  isLoading
}) => {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="sticky bottom-0 w-full bg-white shadow-md border-t border-gray-100 z-20">
      <form
        onSubmit={handleSubmit}
        className="w-full flex gap-2 items-end p-4 bg-white rounded-md"
      >
        <Textarea
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ihre Nachricht..."
          className="flex-1 resize-none min-h-[48px] max-h-[96px] border-none bg-transparent focus:ring-0 text-base px-3 py-2"
          style={{ fontSize: '1rem', padding: '12px' }}
          disabled={isLoading}
        />
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
      </form>
    </div>
  );
};
