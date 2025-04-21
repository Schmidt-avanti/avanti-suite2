
import React from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface UseCaseErrorDisplayProps {
  error: string | null;
  rawResponse: string | null;
}

const UseCaseErrorDisplay: React.FC<UseCaseErrorDisplayProps> = ({ error, rawResponse }) => {
  if (!error && !rawResponse) return null;

  return (
    <div className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {rawResponse && (
        <div>
          <h3 className="text-sm font-medium mb-2">Ungeparste Antwort der API:</h3>
          <pre className="bg-slate-100 p-3 rounded text-xs overflow-auto max-h-60">
            {rawResponse}
          </pre>
        </div>
      )}
    </div>
  );
};

export default UseCaseErrorDisplay;
