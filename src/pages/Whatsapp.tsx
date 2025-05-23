
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
import { useIsMobile } from "@/hooks/use-mobile";

const WhatsappPage: React.FC = () => {
  const { accounts, loading: loadingAccounts, error: accountsError, refetch: refetchAccounts } = useWhatsappAccounts();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  
  const { 
    chats, 
    loading: loadingChats, 
    error: chatsError, 
    refetch: refetchChats 
  } = useWhatsappChats();
  
  const [selectedChat, setSelectedChat] = useState<null | typeof chats[0]>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(Date.now());

  useEffect(() => {
    const autoRefreshInterval = setInterval(() => {
      processWebhookMessages(false);
    }, 30000); // Alle 30 Sekunden
    
    return () => clearInterval(autoRefreshInterval);
  }, []);

  useEffect(() => {
    if (!selectedChat) {
      refetchChats();
    }
  }, [selectedChat, refetchChats]);

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
    <div className={`container mx-auto p-6 ${isMobile ? 'px-2' : ''}`}>
      <Card className="border shadow-sm rounded-2xl w-full max-w-[1600px] mx-auto">
        <CardHeader className="pb-2">
          <div className={`flex ${isMobile ? 'flex-col gap-2' : 'items-center justify-between'}`}>
            <CardTitle className="text-xl font-semibold flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-avanti-600" />
              WhatsApp Chat-Übersicht
            </CardTitle>
            <div className={`flex ${isMobile ? 'flex-wrap' : ''} items-center gap-3`}>
              <Button
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
                onClick={() => processWebhookMessages(true)}
                disabled={isProcessing}
              >
                <Inbox className={`h-4 w-4 ${isProcessing ? 'animate-spin' : ''}`} />
                {isMobile ? 'Abholen' : 'Nachrichten abholen'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
                onClick={handleRefresh}
                disabled={isRefreshing}
              >
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                {isMobile ? 'Aktualisieren' : 'Aktualisieren'}
              </Button>
              <Badge variant="outline" className="bg-avanti-50 text-avanti-700 hover:bg-avanti-100">
                {accounts.length} {accounts.length === 1 ? 'Konto' : 'Konten'} 
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className={`grid grid-cols-1 ${isMobile ? '' : 'md:grid-cols-3'} gap-6`}>
            {isMobile && selectedChat ? (
              <div className="bg-white rounded-2xl border h-[calc(100vh-16rem)] flex flex-col overflow-hidden">
                <ChatPanel 
                  chat={selectedChat} 
                  onClose={() => setSelectedChat(null)} 
                  onMessageSent={() => {
                    setTimeout(() => refetchChats(), 1000);
                  }}
                />
              </div>
            ) : (
              <>
                <div className={`bg-gray-50 rounded-2xl border ${isMobile ? 'h-[calc(100vh-16rem)]' : 'h-[calc(100vh-16rem)]'} overflow-hidden ${isMobile ? 'col-span-1' : 'col-span-1'}`}>
                  <ChatList
                    chats={chats}
                    loading={loadingChats}
                    selectedChatId={selectedChat?.id || null}
                    onSelectChat={chat => setSelectedChat(chat)}
                    onRefresh={handleRefresh}
                  />
                </div>
                
                {!isMobile && (
                  <div className="col-span-2 bg-white rounded-2xl border h-[calc(100vh-16rem)] flex flex-col overflow-hidden">
                    {selectedChat ? (
                      <ChatPanel 
                        chat={selectedChat} 
                        onClose={() => setSelectedChat(null)} 
                        onMessageSent={() => {
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
                )}
              </>
            )}
          </div>
        </CardContent>
      </Card>
      {!isMobile && (
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
      )}
    </div>
  );
};

export default WhatsappPage;
