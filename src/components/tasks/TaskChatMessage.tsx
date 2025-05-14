
import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { de } from 'date-fns/locale';
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";

interface TaskChatMessageProps {
  message: {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    created_at: string;
    creator_name?: string;
    creator_email?: string;
  };
  onButtonClick?: (buttonText: string, messageId: string) => void;
  selectedOptions?: string[];
}

export const TaskChatMessage: React.FC<TaskChatMessageProps> = ({ 
  message, 
  onButtonClick,
  selectedOptions = []
}) => {
  const isAssistant = message.role === 'assistant';
  
  // Parse options from content for assistant messages
  let parsedContent = message.content;
  let options: string[] = [];
  
  if (isAssistant) {
    try {
      const parsed = JSON.parse(message.content);
      parsedContent = parsed.text || message.content;
      options = parsed.options || [];
    } catch (e) {
      // If parsing fails, use the raw content
      console.error("Failed to parse message content", e);
    }
  }

  const timeAgo = formatDistanceToNow(new Date(message.created_at), {
    addSuffix: true,
    locale: de
  });
  
  // Check if any button text is in the selected options
  const isButtonSelected = (buttonText: string) => {
    return selectedOptions.includes(buttonText);
  };

  return (
    <div className={`flex flex-col mb-4 ${isAssistant ? 'items-start' : 'items-end'}`}>
      <div className={`rounded-2xl p-4 max-w-[80%] shadow-sm ${
        isAssistant 
          ? 'bg-blue-50 text-blue-900' 
          : 'bg-gray-100 text-gray-900'
      }`}>
        <div className="font-medium mb-1">
          {isAssistant ? (
            'Assistentin'
          ) : (
            // Show the creator's name if available, otherwise email
            message.creator_name || message.creator_email || 'Sie'
          )}
        </div>
        <div className="whitespace-pre-wrap">{parsedContent}</div>
        
        {isAssistant && options.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {options.map((option, i) => (
              <Button
                key={i}
                size="sm"
                variant="outline"
                className={`bg-white text-blue-600 border border-blue-200 relative ${
                  isButtonSelected(option) ? 'bg-blue-50 border-blue-400' : ''
                }`}
                onClick={() => onButtonClick?.(option, message.id)}
              >
                {option}
                {isButtonSelected(option) && (
                  <Check className="h-3 w-3 ml-1.5 text-green-600" />
                )}
              </Button>
            ))}
          </div>
        )}
      </div>
      <div className={`text-xs mt-1 text-gray-500 ${isAssistant ? 'ml-2' : 'mr-2'}`}>
        {timeAgo}
      </div>
    </div>
  );
};
