import React from "react";
import { Button } from "@/components/ui/button";
import UseCaseChat from "./UseCaseChat";
import UseCasePreview from "./UseCasePreview";
import UseCaseErrorDisplay from "./UseCaseErrorDisplay";
import ProcessMapVisualization from './ProcessMapVisualization';
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
  handleKeyDown: (event: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  textareaRef: React.RefObject<HTMLTextAreaElement>;
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
  handleKeyDown,
  textareaRef,
}) => {
  return (
    <div className="h-full flex flex-col">
      <div className="flex-grow flex flex-col lg:flex-row lg:items-start gap-8 max-w-full overflow-hidden">
        {/* Linke Spalte: Vorschau und Aktionen */}
      <div className="lg:w-3/5 flex flex-col space-y-6 order-2 lg:order-1 lg:mt-6">
        {/* Vorschau */}
        {aiResponseJson && (
          <div className="w-full overflow-auto flex-grow min-h-0">
            <UseCasePreview 
              aiResponseJson={aiResponseJson} 
              messages={messages} 
            />
          </div>
        )}

        {/* Aktions-Buttons */}
        <div className={`flex ${aiResponseJson ? 'justify-between' : 'justify-start'} mt-auto pt-4`}>
          <Button variant="outline" onClick={onBack} className="flex items-center">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Zurück zur Auswahl
          </Button>
          {aiResponseJson && (
            <div className="flex items-center gap-2">
              <Button 
                onClick={onSave} 
                className="flex items-center"
              >
                <Save className="mr-2 h-4 w-4" />
                Use Case speichern
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Rechte Spalte: Chat */}
      <div className="lg:w-2/5 flex flex-col order-1 lg:order-2 h-full lg:max-h-[calc(100vh-12rem)]">
        <UseCaseChat
          messages={messages}
          loading={loadingAI}
          chatInput={chatInput}
          setChatInput={setChatInput}
          onSendMessage={onSendMessage}
          handleKeyDown={handleKeyDown}
          textareaRef={textareaRef}
        />
        {error && <UseCaseErrorDisplay error={error} rawResponse={rawResponse} />}
      </div>
    </div>

    {/* Prozess-Visualisierung unterhalb der Spalten (nur für non-knowledge-request Use Cases) */}
    {aiResponseJson?.process_map && aiResponseJson?.type !== 'knowledge_request' && (
      <div className="mt-8 flex-shrink-0">
        <ProcessMapVisualization 
          processMap={aiResponseJson.process_map} 
        />
      </div>
    )}
  </div>
  );
};

export default UseCaseChatAndPreview;
