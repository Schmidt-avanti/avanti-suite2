
import React from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";  // Replace radix icon with Lucide
import { Button } from "@/components/ui/button";

const UseCaseErrorDisplay = ({ error, rawResponse }) => {
  const [showRawResponse, setShowRawResponse] = React.useState(false);

  if (!error && !rawResponse) return null;

  return (
    <div className="space-y-4">
      {error && (
        <Alert variant="destructive" className="border-destructive/50">
          <AlertTriangle className="h-4 w-4" />  {/* Updated icon */}
          <AlertTitle className="font-medium">Fehler</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {rawResponse && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium">Technische Details</h3>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setShowRawResponse(!showRawResponse)}
            >
              {showRawResponse ? "Ausblenden" : "Anzeigen"}
            </Button>
          </div>
          
          {showRawResponse && (
            <pre className="bg-slate-100 p-3 rounded-lg text-xs overflow-auto max-h-[400px] whitespace-pre-wrap">
              {rawResponse}
            </pre>
          )}
        </div>
      )}
    </div>
  );
};

export default UseCaseErrorDisplay;
