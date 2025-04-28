
import React from 'react';
import { Button } from "@/components/ui/button";
import { ArrowDown } from "lucide-react";

interface TaskChatScrollButtonProps {
  show: boolean;
  onClick: () => void;
}

export const TaskChatScrollButton: React.FC<TaskChatScrollButtonProps> = ({ show, onClick }) => {
  if (!show) return null;
  
  return (
    <Button 
      className="absolute bottom-28 right-8 rounded-full w-10 h-10 shadow-lg bg-blue-500 hover:bg-blue-600 text-white z-10"
      size="icon"
      onClick={onClick}
    >
      <ArrowDown className="h-4 w-4" />
    </Button>
  );
};
