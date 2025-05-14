
// Update the component to accept the 'show' prop
import React from 'react';
import { Button } from '@/components/ui/button';
import { ChevronDown } from 'lucide-react';

export interface TaskChatScrollButtonProps {
  onClick: () => void;
  show: boolean;
}

export const TaskChatScrollButton: React.FC<TaskChatScrollButtonProps> = ({
  onClick,
  show
}) => {
  if (!show) return null;
  
  return (
    <div className="absolute bottom-20 right-6">
      <Button 
        variant="secondary" 
        size="sm" 
        className="rounded-full shadow-md"
        onClick={onClick}
      >
        <ChevronDown className="h-4 w-4" />
      </Button>
    </div>
  );
};
