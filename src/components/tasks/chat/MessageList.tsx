
import React from 'react';
import type { Message } from '@/types';

interface MessageListProps {
  messages: Message[];
  selectedOptions: Set<string>;
  isLoading: boolean;
  onOptionClick: (option: string) => void;
  messagesEndRef: React.RefObject<HTMLDivElement>;
}

export const MessageList = ({
  messages,
  selectedOptions,
  isLoading,
  onOptionClick,
  messagesEndRef
}: MessageListProps) => {
  const renderMessage = (message: Message) => {
    if (message.role === "assistant") {
      try {
        // First try parsing as JSON
        const parsedContent = JSON.parse(message.content);
        
        return (
          <div className="space-y-3">
            <div className="text-sm whitespace-pre-wrap">{parsedContent.text}</div>
            {parsedContent.options && parsedContent.options.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {parsedContent.options.map((option: string, idx: number) => {
                  if (selectedOptions.has(option)) {
                    return null;
                  }
                  
                  return (
                    <button
                      key={idx}
                      onClick={() => onOptionClick(option)}
                      className="rounded text-sm px-4 py-1 border border-gray-200 hover:bg-blue-100 transition-colors"
                    >
                      {option}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      } catch (e) {
        // If not valid JSON, display as plain text
        console.log("Failed to parse message content as JSON:", e);
        return <div className="whitespace-pre-wrap">{message.content}</div>;
      }
    }
    return <div className="whitespace-pre-wrap">{message.content}</div>;
  };

  return (
    <div className="space-y-4">
      {messages.map((message) => (
        <div
          key={message.id}
          className={`flex flex-col ${message.role === "assistant" ? "items-start" : "items-end"}`}
        >
          <div className={`
            max-w-[80%] p-4 rounded
            ${message.role === "assistant"
              ? "bg-blue-100 text-gray-900"
              : "bg-gray-100 text-gray-900"
            }
            border border-blue-50/40
          `}>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-semibold text-sm">
                {message.role === "assistant" ? "Ava" : "Du"}
              </span>
            </div>
            <div className="text-sm">
              {renderMessage(message)}
            </div>
          </div>
        </div>
      ))}

      {isLoading && (
        <div className="flex items-start">
          <div className="max-w-[80%] p-4 rounded bg-blue-100 shadow-sm border border-blue-50/40">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-semibold text-sm">Ava</span>
            </div>
            <div className="flex space-x-2">
              <div className="w-2 h-2 rounded-full bg-blue-400 animate-bounce"></div>
              <div className="w-2 h-2 rounded-full bg-blue-400 animate-bounce delay-75"></div>
              <div className="w-2 h-2 rounded-full bg-blue-400 animate-bounce delay-150"></div>
            </div>
          </div>
        </div>
      )}
      <div ref={messagesEndRef} />
    </div>
  );
};
