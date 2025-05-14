
// Update the component to accept the required props
import React from 'react';
import { AlertCircle } from 'lucide-react';
import { Button } from "@/components/ui/button";

export interface TaskChatStatusProps {
  isLoading: boolean;
  isRateLimited: boolean;
  handleRetry: () => void;
}

export const TaskChatStatus: React.FC<TaskChatStatusProps> = ({ 
  isLoading, 
  isRateLimited,
  handleRetry 
}) => {
  return (
    <div className="flex items-start mb-4 ml-2">
      <div className="bg-blue-50 text-blue-800 rounded-lg p-3 max-w-[80%] shadow-sm">
        <div className="font-medium mb-1">Assistentin</div>
        {isRateLimited ? (
          <div className="flex flex-col space-y-2">
            <div className="flex items-center text-amber-600">
              <AlertCircle className="h-4 w-4 mr-2" />
              <span>API-Dienst überlastet</span>
            </div>
            <p className="text-sm text-gray-600">
              Der Dienst ist aktuell stark ausgelastet. Bitte warten Sie einen Moment.
            </p>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={handleRetry}
              className="w-full mt-2"
            >
              Erneut versuchen
            </Button>
          </div>
        ) : (
          <div className="flex items-center">
            <div className="flex space-x-1">
              <div className="h-2 w-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="h-2 w-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              <div className="h-2 w-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '600ms' }} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
