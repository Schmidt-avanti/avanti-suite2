
import React, { useState, useEffect } from "react";
import { useWhatsappAccounts } from "@/hooks/useWhatsappAccounts";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Loader2, RefreshCw, Phone, MessageSquare, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { useWhatsappChats } from "@/hooks/useWhatsappChats";
import ChatList from "@/components/whatsapp/ChatList";
import ChatPanel from "@/components/whatsapp/ChatPanel";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const WhatsappPage: React.FC = () => {
  const { accounts, loading: loadingAccounts, error: accountsError } = useWhatsappAccounts();
  const [debugMode, setDebugMode] = useState(false);
  const { toast } = useToast();
  
  const accountIds = accounts.map(acc => acc.id);
  const { chats, loading: loadingChats, error: chatsError, refetch } = useWhatsappChats(accountIds);
  const [selectedChat, setSelectedChat] = useState<null | typeof chats[0]>(null);

  // Debugging Informationen
  const hasErrors = !!accountsError || !!chatsError;
  const errorDetails = accountsError || chatsError;

  // Teste Chat-Erstellung
  const createTestChat = async () => {
    if (!accounts.length) {
      toast({
        title: "Fehler",
        description: "Es gibt keine WhatsApp-Konten, zu denen ein Chat hinzugefügt werden könnte.",
        variant: "destructive"
      });
      return;
    }

    try {
      // Erstelle einen Test-Chat für das erste Konto
      const { data: chatData, error: chatError } = await supabase
        .from("whatsapp_chats")
        .insert({
          account_id: accounts[0].id,
          contact_name: "Test Kontakt",
          contact_number: "+491234567890",
          last_message: "Test Nachricht",
          last_message_time: new Date().toISOString()
        })
        .select();

      if (chatError) throw chatError;
      
      if (chatData && chatData[0]) {
        // Erstelle eine Test-Nachricht für diesen Chat
        const { error: msgError } = await supabase
          .from("whatsapp_messages")
          .insert({
            chat_id: chatData[0].id,
            content: "Hallo! Dies ist eine Testnachricht.",
            is_from_me: false,
            sent_at: new Date().toISOString()
          });
          
        if (msgError) throw msgError;
        
        toast({
          title: "Test-Chat erstellt",
          description: "Ein Test-Chat mit einer Nachricht wurde erfolgreich erstellt.",
        });
        
        refetch();
      }
    } catch (error) {
      console.error("Fehler beim Erstellen eines Test-Chats:", error);
      toast({
        title: "Fehler",
        description: error instanceof Error ? error.message : "Unbekannter Fehler beim Erstellen des Test-Chats",
        variant: "destructive"
      });
    }
  };

  if (loadingAccounts) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 text-muted-foreground animate-spin" />
        <span className="ml-2 text-muted-foreground">Lade WhatsApp Konten...</span>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      {debugMode && (
        <Alert className="mb-6 bg-yellow-50 border-yellow-200">
          <AlertTriangle className="h-4 w-4 text-yellow-600" />
          <AlertTitle>Debug-Modus aktiviert</AlertTitle>
          <AlertDescription>
            <div className="text-sm space-y-2">
              <p><strong>Gefundene Konten:</strong> {accounts.length}</p>
              <p><strong>Konto-IDs:</strong> {accountIds.join(', ') || 'keine'}</p>
              <p><strong>Gefundene Chats:</strong> {chats.length}</p>
              {accounts.map(account => (
                <div key={account.id} className="border-l-2 border-yellow-200 pl-2 py-1">
                  <p><strong>Konto:</strong> {account.name || account.id}</p>
                  <p><strong>Status:</strong> {account.status}</p>
                  <p><strong>Nummer:</strong> {account.pphone_number || 'Nicht gesetzt'}</p>
                </div>
              ))}
            </div>
          </AlertDescription>
        </Alert>
      )}
      
      {hasErrors && (
        <Alert className="mb-6 bg-red-50 border-red-200">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertTitle>Es ist ein Fehler aufgetreten</AlertTitle>
          <AlertDescription>
            {errorDetails}
          </AlertDescription>
        </Alert>
      )}

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
              <Button 
                variant="secondary" 
                size="sm"
                onClick={() => setDebugMode(prev => !prev)}
              >
                {debugMode ? "Debug ausblenden" : "Debug anzeigen"}
              </Button>
              {debugMode && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={createTestChat}
                  className="bg-green-600 hover:bg-green-700"
                >
                  Test-Chat erstellen
                </Button>
              )}
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
