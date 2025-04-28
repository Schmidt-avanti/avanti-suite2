
import React from 'react';

interface ChatPanelProps {
  children: React.ReactNode;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({ children }) => {
  return (
    <div 
      className="w-full flex flex-col overflow-hidden rounded-2xl bg-transparent h-[600px]"
      data-chat-panel
    >
      {children}
    </div>
  );
};
