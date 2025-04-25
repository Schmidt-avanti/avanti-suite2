
import React, { useState } from 'react';
import { MessageSquare, X } from 'lucide-react';
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
            "h-14 w-14 rounded-full shadow-lg border border-gray-100",
            "bg-blue-600 hover:bg-blue-700 flex items-center justify-center"
          )}
          aria-label="Öffne Wissensassistent"
        >
          <MessageSquare className="h-6 w-6 text-white" />
        </Button>
      )}
    </div>
  );
}

export default FloatingChatButton;
