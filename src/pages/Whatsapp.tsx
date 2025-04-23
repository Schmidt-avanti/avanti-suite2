
import React, { useState } from "react";
import { useWhatsappAccounts } from "@/hooks/useWhatsappAccounts";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Loader2, RefreshCw, Phone, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { useWhatsappChats } from "@/hooks/useWhatsappChats";
import ChatList from "@/components/whatsapp/ChatList";
import ChatPanel from "@/components/whatsapp/ChatPanel";

const WhatsappPage: React.FC = () => {
  const { accounts, loading } = useWhatsappAccounts();
  const accountIds = accounts.map(acc => acc.id);
  const { chats, loading: loadingChats, refetch } = useWhatsappChats(accountIds);
  const [selectedChat, setSelectedChat] = useState<null | typeof chats[0]>(null);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 text-muted-foreground animate-spin" />
        <span className="ml-2 text-muted-foreground">Lade WhatsApp Konten...</span>
      </div>
    );
  }

  if (accounts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full w-full text-center py-8">
        <div className="flex flex-col items-center gap-4">
          <div className="bg-green-100 rounded-full p-4 mb-2">
            <MessageSquare className="w-10 h-10 text-green-600" />
          </div>
          <h1 className="text-2xl font-semibold text-gray-800">WhatsApp Integration</h1>
          <p className="text-base text-gray-600 max-w-lg">
            Hier kannst du alle angebundenen WhatsApp-Chats verschiedener Firmen zentral einsehen und beantworten.
          </p>
          <div className="mt-6 bg-white rounded-2xl border border-gray-100 shadow-soft p-8 min-h-[120px] flex items-center justify-center w-full max-w-md">
            <span className="text-gray-400">Noch keine Chats verbunden.<br/>Bitte zuerst ein WhatsApp-Konto im Admin-Bereich verbinden.</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <Card className="border shadow-sm rounded-2xl max-w-6xl mx-auto">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl font-semibold flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-green-600" />
              WhatsApp Chat-Übersicht
            </CardTitle>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
                onClick={refetch}
                disabled={loadingChats}
              >
                <RefreshCw className={`h-4 w-4 ${loadingChats ? 'animate-spin' : ''}`} />
                Aktualisieren
              </Button>
              <Badge variant="outline" className="bg-green-50 text-green-700 hover:bg-green-100">
                {accounts.length} {accounts.length === 1 ? 'Konto' : 'Konten'} verbunden
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-gray-50 rounded-2xl border h-[32rem] overflow-hidden col-span-1">
              <ChatList
                chats={chats}
                loading={loadingChats}
                selectedChatId={selectedChat?.id || null}
                onSelectChat={chat => setSelectedChat(chat)}
              />
            </div>
            <div className="col-span-2 bg-white rounded-2xl border h-[32rem] flex flex-col overflow-hidden">
              {selectedChat ? (
                <ChatPanel chat={selectedChat} onClose={() => setSelectedChat(null)} />
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground px-4">
                  <Phone className="h-16 w-16 text-green-200 mb-3" />
                  <h2 className="text-xl font-semibold mb-2">Kein Chat ausgewählt</h2>
                  <p className="text-gray-400">Wählen Sie einen Chat links aus, um den Verlauf einzusehen oder zu antworten.</p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
      <div className="mt-4 text-center text-sm text-gray-500 flex flex-col gap-2">
        <p className="flex items-center justify-center gap-1">
          <Phone className="h-3 w-3" />
          <span>
            Um mit der Twilio Sandbox zu testen, senden Sie eine Nachricht an:&nbsp;
            <span className="font-medium">+1 415 523 8886</span> mit dem Code "join company-conversation"
          </span>
        </p>
        <p className="italic text-xs text-gray-400">
          Die WhatsApp-Integration befindet sich im Aufbau. Echte Konversationen erscheinen live.
        </p>
      </div>
    </div>
  );
};

export default WhatsappPage;
