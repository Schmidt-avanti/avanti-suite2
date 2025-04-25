
import React, { useState } from 'react';
import { MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import FloatingChatPanel from './FloatingChatPanel';
import { Button } from '../ui/button';

export function FloatingChatButton() {
  const [isOpen, setIsOpen] = useState(false);

  const toggleChat = () => {
    setIsOpen(!isOpen);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {isOpen ? (
        <FloatingChatPanel onClose={() => setIsOpen(false)} />
      ) : (
        <Button
          onClick={toggleChat}
          className={cn(
            "h-16 w-16 rounded-full shadow-xl",
            "bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700",
            "flex items-center justify-center transition-all duration-300 ease-in-out",
            "hover:scale-110"
          )}
          aria-label="Öffne Wissensassistent"
        >
          <MessageSquare className="h-7 w-7 text-white" />
        </Button>
      )}
    </div>
  );
}

export default FloatingChatButton;
