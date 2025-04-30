
import React, { useEffect, useState } from 'react';
import { CheckCircle } from 'lucide-react';

interface EmailConfirmationBubbleProps {
  visible: boolean;
}

export const EmailConfirmationBubble: React.FC<EmailConfirmationBubbleProps> = ({ visible }) => {
  const [show, setShow] = useState(false);
  
  useEffect(() => {
    if (visible) {
      setShow(true);
      const timer = setTimeout(() => {
        setShow(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [visible]);
  
  if (!show) return null;
  
  return (
    <div className="fixed bottom-20 right-20 bg-white rounded-lg shadow-lg p-4 flex items-center animate-in fade-in slide-in-from-bottom-10 duration-500 z-50">
      <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
      <span className="text-sm font-medium">E-Mail erfolgreich gesendet</span>
    </div>
  );
};
