
import React from 'react';
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Send, Loader2 } from "lucide-react";

interface ChatInputProps {
  inputValue: string;
  setInputValue: (value: string) => void;
  isLoading: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
}

export const ChatInput = ({
  inputValue,
  setInputValue,
  isLoading,
  onSubmit,
  onKeyDown
}: ChatInputProps) => {
  return (
    <form
      onSubmit={onSubmit}
      className="w-full flex gap-2 items-end border border-gray-200 p-3 bg-white rounded-md shadow-sm"
    >
      <Textarea
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder="Ihre Nachricht..."
        className="flex-1 resize-none min-h-[48px] max-h-[96px] border-none bg-transparent focus:ring-0 text-base"
        style={{ fontSize: '1rem', padding: 0 }}
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
  );
};
