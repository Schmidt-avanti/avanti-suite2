
import React from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  onBack,
}) => {
  const [activeTab, setActiveTab] = React.useState("chat");

  // If we get a response, switch to preview tab on mobile
  React.useEffect(() => {
    if (aiResponseJson && !activeTab.includes("preview") && window.innerWidth < 768) {
      setActiveTab("preview");
    }
  }, [aiResponseJson]);

  // Mobile view uses tabs
  const mobileView = (
    <div className="block md:hidden">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full grid grid-cols-2">
          <TabsTrigger value="chat">Chat</TabsTrigger>
          <TabsTrigger value="preview" disabled={!aiResponseJson}>
            Vorschau
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="chat" className="mt-4">
          <div className="h-[60vh]">
            <UseCaseChat
              messages={messages}
              chatInput={chatInput}
              setChatInput={setChatInput}
              onSendMessage={onSendMessage}
              loading={loadingAI}
            />
          </div>
          <div className="mt-4">
            <UseCaseErrorDisplay error={error} rawResponse={rawResponse} />
          </div>
        </TabsContent>
        
        <TabsContent value="preview" className="mt-4">
          <UseCasePreview aiResponseJson={aiResponseJson} />
        </TabsContent>
      </Tabs>
    </div>
  );

  // Desktop view shows vertical layout
  const desktopView = (
    <div className="hidden md:flex md:flex-col md:gap-6">
      <div className="h-[60vh]">
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

      <div className="flex gap-2 justify-end">
        <Button onClick={onBack} variant="outline">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Zurück
        </Button>
        {aiResponseJson && (
          <Button onClick={onSave}>
            <Save className="mr-2 h-4 w-4" />
            Speichern
          </Button>
        )}
      </div>

      {aiResponseJson && (
        <div>
          <h3 className="text-lg font-medium mb-4">Vorschau</h3>
          <UseCasePreview aiResponseJson={aiResponseJson} />
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      {mobileView}
      {desktopView}
    </div>
  );
};

export default UseCaseChatAndPreview;
