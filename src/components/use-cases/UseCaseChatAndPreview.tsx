
import React from "react";
import { Button } from "@/components/ui/button";
import UseCaseChat from "./UseCaseChat";
import UseCasePreview from "./UseCasePreview";
import UseCaseErrorDisplay from "./UseCaseErrorDisplay";
import { Save } from "lucide-react";

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
}) => {
  return (
    <div className="flex flex-col gap-8 pb-8">
      {/* Chat Section */}
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
      {aiResponseJson && (
        <div className="flex justify-end">
          <Button onClick={onSave} className="w-auto">
            <Save className="mr-2 h-4 w-4" />
            Use Case speichern
          </Button>
        </div>
      )}

      {/* Preview Section */}
      {aiResponseJson && (
        <div className="w-full">
          <h3 className="text-lg font-medium mb-4">Use Case Vorschau</h3>
          <UseCasePreview aiResponseJson={aiResponseJson} />
        </div>
      )}
    </div>
  );
};

export default UseCaseChatAndPreview;
