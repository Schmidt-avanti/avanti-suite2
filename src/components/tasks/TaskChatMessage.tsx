
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

  // Parse JSON content and extract text and options
  const parseMessageContent = () => {
    if (message.role !== "assistant") {
      return { text: message.content, options: [] };
    }
    
    try {
      // Try to parse the content as JSON
      const parsedContent = JSON.parse(message.content);
      return { 
        text: parsedContent.text || message.content, 
        options: Array.isArray(parsedContent.options) ? parsedContent.options : [] 
      };
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
          
          return { text: content, options };
        } catch (err) {
          return { text: content, options: [] };
        }
      } else {
        // Check for key list patterns that might contain key options
        const listMatch = content.match(/(?:\d+\.\s+(.*?)(?:\n|$))+/g);
        if (listMatch && content.toLowerCase().includes('schlüssel')) {
          const defaultOptions = ["Hausschlüssel", "Wohnungsschlüssel", "Briefkastenschlüssel"];
          return { text: content, options: defaultOptions };
        }
        
        return { text: content, options: [] };
      }
    }
  };

  const { text, options } = parseMessageContent();
  
  // Filter out options that have already been selected
  const availableOptions = options.filter(option => !selectedOptions.has(option));

  // Für Assistentennachrichten, entferne JSON-artige Formatierung, wenn vorhanden
  const cleanupText = (text: string) => {
    if (message.role !== "assistant") return text;
    
    // Entferne JSON-Artefakte aus dem Text
    return text
      .replace(/^\s*{/, '') // Öffnende Klammer am Anfang entfernen
      .replace(/}\s*$/, '') // Schließende Klammer am Ende entfernen
      .replace(/"text"\s*:\s*"/, '') // "text": " entfernen
      .replace(/"options"\s*:\s*\[.*?\]/, '') // "options": [...] entfernen
      .replace(/",\s*$/, '') // ", am Ende entfernen
      .trim();
  };

  const displayText = cleanupText(text);
  
  // Use the message's creator name if available, otherwise fallback to current user
  const displayName = message.creatorName || (message.role === "assistant" ? "Assistentin" : (user?.fullName || user?.email || "Benutzer"));

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
            {displayName}
          </span>
        </div>
        <div className="text-sm whitespace-pre-wrap">
          {displayText}
        </div>
        {availableOptions.length > 0 && (
          <div className={`flex flex-wrap gap-2 mt-3 ${isMobile ? 'flex-col' : ''}`}>
            {availableOptions.map((option, idx) => (
              <Button
                key={idx}
                variant="outline"
                onClick={() => onOptionSelect(option)}
                className="rounded text-sm px-4 py-1 hover:bg-blue-100"
                size={isMobile ? "sm" : "default"}
              >
                {option}
              </Button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
