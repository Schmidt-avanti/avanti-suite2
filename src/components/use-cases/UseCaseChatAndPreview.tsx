
import React from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import UseCaseChat from "./UseCaseChat";
import UseCasePreview from "./UseCasePreview";
import UseCaseErrorDisplay from "./UseCaseErrorDisplay";

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
  const [activeTab, setActiveTab] = React.useState("chat");

  // If we get a response, switch to preview tab
  React.useEffect(() => {
    if (aiResponseJson && !activeTab.includes("preview")) {
      setActiveTab("preview");
    }
  }, [aiResponseJson]);

  return (
    <div className="space-y-6">
      {/* Mobile view uses tabs */}
      <div className="block md:hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full grid grid-cols-2">
            <TabsTrigger value="chat">Chat</TabsTrigger>
            <TabsTrigger value="preview" disabled={!aiResponseJson}>
              Vorschau
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="chat" className="mt-4">
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
          </TabsContent>
          
          <TabsContent value="preview" className="mt-4">
            <UseCasePreview aiResponseJson={aiResponseJson} />
            {aiResponseJson && (
              <div className="mt-6 flex gap-2">
                <Button onClick={onSave}>Speichern</Button>
                <Button variant="outline" onClick={onBack}>
                  Zurück zum Chat
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Desktop view shows side by side */}
      <div className="hidden md:grid md:grid-cols-2 md:gap-6">
        <div>
          <h3 className="text-lg font-medium mb-4">Chat</h3>
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

        <div>
          <h3 className="text-lg font-medium mb-4">Vorschau</h3>
          <UseCasePreview aiResponseJson={aiResponseJson} />
          {aiResponseJson && (
            <div className="mt-6 flex gap-2">
              <Button onClick={onSave}>Speichern</Button>
              <Button variant="outline" onClick={onBack}>
                Zurück zum Chat
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UseCaseChatAndPreview;
