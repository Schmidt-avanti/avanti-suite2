
import React from "react";
import { Button } from "@/components/ui/button";
import UseCaseChat from "./UseCaseChat";
import UseCasePreview from "./UseCasePreview";
import UseCaseErrorDisplay from "./UseCaseErrorDisplay";
import { ArrowLeft, Save } from "lucide-react";

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
  onBack
}) => {
  return (
    <div className="flex flex-col space-y-8">
      {/* Chat Section - Full Width */}
      <div className="w-full">
        <UseCaseChat
          messages={messages}
          chatInput={chatInput}
          setChatInput={setChatInput}
          onSendMessage={onSendMessage}
          loading={loadingAI}
        />
        <div className="mt-4">
          <UseCaseErrorDisplay error={error} rawResponse={rawResponse} />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack} className="flex items-center">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Zurück zur Auswahl
        </Button>
        
        {aiResponseJson && (
          <Button onClick={onSave} className="flex items-center">
            <Save className="mr-2 h-4 w-4" />
            Use Case speichern
          </Button>
        )}
      </div>

      {/* Preview Section - Placed at bottom */}
      {aiResponseJson && (
        <div className="w-full mt-4 pb-16">
          <h3 className="text-lg font-medium mb-4">Use Case Vorschau</h3>
          <UseCasePreview aiResponseJson={aiResponseJson} />
        </div>
      )}
    </div>
  );
};

export default UseCaseChatAndPreview;
