
import React from 'react';
import { Button } from "@/components/ui/button";
import { Message } from '@/hooks/useTaskMessages';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAuth } from '@/contexts/AuthContext';

interface TaskChatMessageProps {
  message: Message;
  selectedOptions: Set<string>;
  onOptionSelect: (option: string) => void;
}

export const TaskChatMessage: React.FC<TaskChatMessageProps> = ({ 
  message, 
  selectedOptions, 
  onOptionSelect 
}) => {
  const isMobile = useIsMobile();
  const { user } = useAuth();

  const renderMessageContent = () => {
    if (message.role === "assistant") {
      try {
        // Try to parse the content as JSON
        const parsedContent = JSON.parse(message.content);
        
        return (
          <div className="space-y-3">
            <div className="text-sm whitespace-pre-wrap">{parsedContent.text}</div>
            {parsedContent.options && parsedContent.options.length > 0 && (
              <div className={`flex flex-wrap gap-2 mt-2 ${isMobile ? 'flex-col' : ''}`}>
                {parsedContent.options.map((option: string, idx: number) => {
                  if (selectedOptions.has(option)) {
                    return null;
                  }
                  
                  return (
                    <Button
                      key={idx}
                      variant="outline"
                      onClick={() => onOptionSelect(option)}
                      className="rounded text-sm px-4 py-1 hover:bg-blue-100"
                      size={isMobile ? "sm" : "default"}
                    >
                      {option}
                    </Button>
                  );
                })}
              </div>
            )}
          </div>
        );
      } catch (e) {
        // Not valid JSON, try to extract options from text
        const content = message.content;
        const optionsMatch = content.match(/\[(.*?)\]/);
        
        if (optionsMatch) {
          try {
            const optionsText = optionsMatch[1];
            const options = optionsText.split(',').map(o => 
              o.trim().replace(/"/g, '').replace(/^\[|\]$/g, '')
            );
            
            return (
              <div className="space-y-3">
                <div className="text-sm whitespace-pre-wrap">{content}</div>
                {options.length > 0 && (
                  <div className={`flex flex-wrap gap-2 mt-2 ${isMobile ? 'flex-col' : ''}`}>
                    {options.map((option: string, idx: number) => {
                      if (selectedOptions.has(option)) {
                        return null;
                      }
                      
                      return (
                        <Button
                          key={idx}
                          variant="outline"
                          onClick={() => onOptionSelect(option)}
                          className="rounded text-sm px-4 py-1 hover:bg-blue-100"
                          size={isMobile ? "sm" : "default"}
                        >
                          {option}
                        </Button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          } catch (err) {
            return <div className="whitespace-pre-wrap">{content}</div>;
          }
        } else {
          // Check for key list patterns that might contain key options
          const listMatch = content.match(/(?:\d+\.\s+(.*?)(?:\n|$))+/g);
          if (listMatch && content.toLowerCase().includes('schlüssel')) {
            const defaultOptions = ["Hausschlüssel", "Wohnungsschlüssel", "Briefkastenschlüssel"];
            
            return (
              <div className="space-y-3">
                <div className="text-sm whitespace-pre-wrap">{content}</div>
                <div className={`flex flex-wrap gap-2 mt-2 ${isMobile ? 'flex-col' : ''}`}>
                  {defaultOptions.map((option: string, idx: number) => {
                    if (selectedOptions.has(option)) {
                      return null;
                    }
                    
                    return (
                      <Button
                        key={idx}
                        variant="outline"
                        onClick={() => onOptionSelect(option)}
                        className="rounded text-sm px-4 py-1 hover:bg-blue-100"
                        size={isMobile ? "sm" : "default"}
                      >
                        {option}
                      </Button>
                    );
                  })}
                </div>
              </div>
            );
          }
          
          return <div className="whitespace-pre-wrap">{content}</div>;
        }
      }
    }
    return <div className="whitespace-pre-wrap">{message.content}</div>;
  };

  return (
    <div className={`flex flex-col mb-4 ${message.role === "assistant" ? "items-start" : "items-end"}`}>
      <div className={`
        ${isMobile ? 'max-w-[90%]' : 'max-w-[80%]'} p-4 rounded
        ${message.role === "assistant"
          ? "bg-blue-100 text-gray-900"
          : "bg-gray-100 text-gray-900"
        }
        border border-blue-50/40
      `}>
        <div className="flex items-center gap-2 mb-1">
          <span className="font-semibold text-sm">
            {message.role === "assistant" ? "Ava" : user?.fullName || user?.email || "Benutzer"}
          </span>
        </div>
        <div className="text-sm">
          {renderMessageContent()}
        </div>
      </div>
    </div>
  );
};
