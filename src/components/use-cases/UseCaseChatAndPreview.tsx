
import React from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import UseCaseChat from "./UseCaseChat";
import UseCasePreview from "./UseCasePreview";

interface UseCaseChatAndPreviewProps {
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  chatInput: string;
  setChatInput: (value: string) => void;
  onSendMessage: () => void;
  loadingAI: boolean;
  error: string | null;
  rawResponse: string | null;
  aiResponseJson: any;
  onSave: () => void;
  onBack: () => void;
}

const UseCaseChatAndPreview: React.FC<UseCaseChatAndPreviewProps> = ({
  messages,
  chatInput,
  setChatInput,
  onSendMessage,
  loadingAI,
  error,
  rawResponse,
  aiResponseJson,
  onSave,
  onBack,
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div>
        <UseCaseChat
          messages={messages}
          chatInput={chatInput}
          setChatInput={setChatInput}
          onSendMessage={onSendMessage}
          loading={loadingAI}
        />

        {error && (
          <Alert variant="destructive" className="mt-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {rawResponse && (
          <div className="mt-4">
            <h3 className="text-sm font-medium mb-2">Ungeparste Antwort der API:</h3>
            <pre className="bg-slate-100 p-3 rounded text-xs overflow-auto max-h-60">
              {rawResponse}
            </pre>
          </div>
        )}
      </div>

      <div>
        <UseCasePreview aiResponseJson={aiResponseJson} />

        {aiResponseJson && (
          <div className="mt-4 flex gap-2">
            <Button onClick={onSave}>Speichern</Button>
            <Button variant="outline" onClick={onBack}>
              Zurück
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default UseCaseChatAndPreview;
