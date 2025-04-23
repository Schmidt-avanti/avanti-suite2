
import React, { useState, useEffect, useCallback } from "react";
import { useWhatsappAccounts } from "@/hooks/useWhatsappAccounts";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Loader2, RefreshCw, Phone, MessageSquare, AlertTriangle, Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { useWhatsappChats } from "@/hooks/useWhatsappChats";
import ChatList from "@/components/whatsapp/ChatList";
import ChatPanel from "@/components/whatsapp/ChatPanel";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const WhatsappPage: React.FC = () => {
  const { accounts, loading: loadingAccounts, error: accountsError, refetch: refetchAccounts } = useWhatsappAccounts();
  const [debugMode, setDebugMode] = useState(false);
  const { toast } = useToast();
  
  // Reduziere unnötige Rerenders, indem wir die accountIds memoizen
  const accountIds = React.useMemo(() => accounts.map(acc => acc.id), [accounts]);
  
  const { 
    chats, 
    loading: loadingChats, 
    error: chatsError, 
    refetch: refetchChats 
  } = useWhatsappChats(accountIds);
  
  const [selectedChat, setSelectedChat] = useState<null | typeof chats[0]>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingResult, setProcessingResult] = useState<any>(null);

  // Debugging Informationen
  const hasErrors = !!accountsError || !!chatsError;
  const errorDetails = accountsError || chatsError;

  // Kombinierte Aktualisierungsfunktion mit Verzögerungslogik
  const handleRefresh = useCallback(async () => {
    if (isRefreshing) return;
    
    setIsRefreshing(true);
    try {
      toast({
        title: "Aktualisiere Daten...",
        description: "Die WhatsApp-Daten werden aktualisiert.",
      });
      
      await refetchAccounts();
      await refetchChats();
      
      toast({
        title: "Aktualisiert",
        description: "Die WhatsApp-Daten wurden erfolgreich aktualisiert.",
      });
    } catch (error) {
      console.error("Fehler beim Aktualisieren:", error);
    } finally {
      setIsRefreshing(false);
    }
  }, [isRefreshing, refetchAccounts, refetchChats, toast]);
  
  // Fetch neue WhatsApp-Nachrichten vom Webhook und verarbeite sie
  const processWebhookMessages = async () => {
    if (isProcessing) return;
    
    setIsProcessing(true);
    setProcessingResult(null);
    
    try {
      toast({
        title: "Verarbeite Nachrichten...",
        description: "Neue WhatsApp-Nachrichten werden abgerufen und verarbeitet.",
      });
      
      const { data, error } = await supabase.functions.invoke('process-whatsapp-messages');
      
      if (error) throw error;
      
      setProcessingResult(data);
      
      // Aktualisiere die Chat-Liste nach der Verarbeitung
      refetchChats();
      
      toast({
        title: "Nachrichten verarbeitet",
        description: `${data.successful} Nachrichten erfolgreich verarbeitet.`,
      });
    } catch (error) {
      console.error("Fehler beim Verarbeiten der Nachrichten:", error);
      toast({
        variant: "destructive",
        title: "Fehler",
        description: error instanceof Error ? error.message : "Unbekannter Fehler",
      });
    } finally {
      setIsProcessing(false);
    }
  };

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
        
        refetchChats();
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
              {processingResult && (
                <div className="border-l-2 border-green-200 pl-2 py-1 mt-2">
                  <p className="font-medium text-green-700">Nachrichtenverarbeitung:</p>
                  <p>Verarbeitet: {processingResult.processed}</p>
                  <p>Erfolgreich: {processingResult.successful}</p>
                  <p>Fehlgeschlagen: {processingResult.failed}</p>
                </div>
              )}
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
                onClick={handleRefresh}
                disabled={isRefreshing}
              >
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                Aktualisieren
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
                onClick={processWebhookMessages}
                disabled={isProcessing}
              >
                <Inbox className={`h-4 w-4 ${isProcessing ? 'animate-spin' : ''}`} />
                Nachrichten abholen
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
                onRefresh={handleRefresh}
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
          Die WhatsApp-Integration wurde erfolgreich mit Twilio verbunden. Neue Nachrichten werden über den Webhook empfangen.
        </p>
      </div>
    </div>
  );
};

export default WhatsappPage;
