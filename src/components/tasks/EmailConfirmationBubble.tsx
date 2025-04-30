
import React, { useEffect, useState } from 'react';
import { Check } from 'lucide-react';

interface EmailConfirmationBubbleProps {
  visible: boolean;
}

export const EmailConfirmationBubble: React.FC<EmailConfirmationBubbleProps> = ({ visible }) => {
  const [isVisible, setIsVisible] = useState(false);
  
  useEffect(() => {
    if (visible) {
      setIsVisible(true);
      
      // Auto-hide after 5 seconds
      const timeout = setTimeout(() => {
        setIsVisible(false);
      }, 5000);
      
      return () => clearTimeout(timeout);
    }
  }, [visible]);
  
  if (!isVisible) return null;
  
  return (
    <div 
      className="flex items-center gap-2 py-2 px-4 bg-[#EAF6FF] text-[#004085] rounded-md shadow-sm mb-4 animate-fade-in-down"
      role="alert"
    >
      <Check className="h-4 w-4 text-blue-500" />
      <span className="text-sm font-medium">E-Mail versendet.</span>
    </div>
  );
};
