
import React, { useState, useEffect, useCallback } from "react";
import { useWhatsappAccounts } from "@/hooks/useWhatsappAccounts";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, RefreshCw, Phone, MessageSquare, Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { useWhatsappChats } from "@/hooks/useWhatsappChats";
import ChatList from "@/components/whatsapp/ChatList";
import ChatPanel from "@/components/whatsapp/ChatPanel";
import { supabase } from "@/integrations/supabase/client";

const WhatsappPage: React.FC = () => {
  const { accounts, loading: loadingAccounts, error: accountsError, refetch: refetchAccounts } = useWhatsappAccounts();
  const { toast } = useToast();
  
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
  const [lastRefresh, setLastRefresh] = useState(Date.now());

  // Automatisches Polling für neue Nachrichten alle 30 Sekunden
  useEffect(() => {
    const autoRefreshInterval = setInterval(() => {
      processWebhookMessages(false);
    }, 30000); // Alle 30 Sekunden
    
    return () => clearInterval(autoRefreshInterval);
  }, []);

  // Wenn sich der selectedChat ändert und dieser null ist, Chats neu laden
  useEffect(() => {
    if (!selectedChat) {
      refetchChats();
    }
  }, [selectedChat, refetchChats]);

  // Wenn ein neuer Chat ausgewählt wird, die Unread-Count zurücksetzen
  useEffect(() => {
    if (selectedChat) {
      // Hier könnte man später einen API-Call zum Markieren als gelesen implementieren
    }
  }, [selectedChat]);

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
      setLastRefresh(Date.now());
      
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
  
  const processWebhookMessages = async (showNotifications = true) => {
    if (isProcessing) return;
    
    setIsProcessing(true);
    
    try {
      if (showNotifications) {
        toast({
          title: "Verarbeite Nachrichten...",
          description: "Neue WhatsApp-Nachrichten werden abgerufen und verarbeitet.",
        });
      }
      
      const { data, error } = await supabase.functions.invoke('process-whatsapp-messages');
      
      if (error) throw error;
      
      // Nur benachrichtigen, wenn tatsächlich neue Nachrichten verarbeitet wurden
      if (data && data.processed > 0) {
        refetchChats();
        setLastRefresh(Date.now());
        
        if (showNotifications || (data.successful && data.successful > 0)) {
          toast({
            title: "Nachrichten verarbeitet",
            description: `${data.successful || 0} neue WhatsApp-Nachricht(en) empfangen.`,
            variant: (data.successful && data.successful > 0) ? "default" : "destructive",
          });
        }
      }
    } catch (error) {
      console.error("Fehler beim Verarbeiten der Nachrichten:", error);
      if (showNotifications) {
        toast({
          variant: "destructive",
          title: "Fehler",
          description: error instanceof Error ? error.message : "Unbekannter Fehler",
        });
      }
    } finally {
      setIsProcessing(false);
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
      <Card className="border shadow-sm rounded-2xl max-w-6xl mx-auto">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl font-semibold flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-avanti-600" />
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
                onClick={() => processWebhookMessages(true)}
                disabled={isProcessing}
              >
                <Inbox className={`h-4 w-4 ${isProcessing ? 'animate-spin' : ''}`} />
                Nachrichten abholen
              </Button>
              <Badge variant="outline" className="bg-avanti-50 text-avanti-700 hover:bg-avanti-100">
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
                <ChatPanel 
                  chat={selectedChat} 
                  onClose={() => setSelectedChat(null)} 
                  onMessageSent={() => {
                    // Nach dem Senden einer Nachricht kurz warten und dann Chats neu laden
                    setTimeout(() => refetchChats(), 1000);
                  }}
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground px-4">
                  <Phone className="h-16 w-16 text-avanti-200 mb-3" />
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
