
import React from 'react';
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface TaskChatStatusProps {
  isLoading: boolean;
  isRateLimited: boolean;
  handleRetry: () => void;
}

export const TaskChatStatus: React.FC<TaskChatStatusProps> = ({
  isLoading,
  isRateLimited,
  handleRetry
}) => {
  if (isLoading) {
    return (
      <div className="flex items-start mb-4">
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
    );
  }

  if (isRateLimited) {
    return (
      <div className="flex items-start mb-4">
        <div className="max-w-[80%] p-4 rounded bg-yellow-50 shadow-sm border border-yellow-200 text-amber-800">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-4 w-4" />
            <span className="font-semibold text-sm">API-Dienst überlastet</span>
          </div>
          <p className="text-sm mb-3">
            Der API-Dienst ist derzeit überlastet. Bitte warten Sie einen Moment und versuchen Sie es dann erneut.
          </p>
          <Button
            variant="outline" 
            size="sm"
            onClick={handleRetry}
            className="text-xs"
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            Erneut versuchen
          </Button>
        </div>
      </div>
    );
  }

  return null;
};
