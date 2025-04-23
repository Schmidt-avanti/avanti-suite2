import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";

export type WhatsappChat = {
  id: string;
  account_id: string;
  contact_name: string;
  contact_number: string;
  last_message: string | null;
  last_message_time: string | null;
  unread_count: number;
  created_at: string;
  updated_at: string;
  customer_id?: string;
};

export type WhatsappMessage = {
  id: string;
  chat_id: string;
  content: string;
  is_from_me: boolean;
  sent_at: string;
  read_at?: string | null;
};

export const useWhatsappChats = (accountIds: string[]) => {
  const [chats, setChats] = useState<WhatsappChat[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchChats = useCallback(async () => {
    setError(null);
    setLoading(true);
    
    try {
      const { data, error: fetchError } = await supabase
        .from("whatsapp_chats")
        .select("*")
        .order("last_message_time", { ascending: false });
      
      if (fetchError) {
        console.error("Fehler beim Laden der Chats:", fetchError);
        setError(fetchError.message);
        toast({
          variant: "destructive",
          title: "Fehler beim Laden der Chats",
          description: fetchError.message,
        });
      } else if (data) {
        console.log(`${data.length} WhatsApp-Chats erfolgreich geladen`);
        
        const { data: accountsData, error: accountsError } = await supabase
          .from("whatsapp_accounts")
          .select("id, customer_id");
          
        if (accountsError) {
          console.error("Fehler beim Laden der Account-Daten:", accountsError);
        } else if (accountsData) {
          const accountCustomerMap = accountsData.reduce((map, acc) => {
            map[acc.id] = acc.customer_id;
            return map;
          }, {} as Record<string, string>);
          
          let enhancedChats = data.map(chat => ({
            ...chat,
            customer_id: accountCustomerMap[chat.account_id]
          }));
          
          if (accountIds && accountIds.length > 0) {
            enhancedChats = enhancedChats.filter(chat => accountIds.includes(chat.account_id));
          }
          
          setChats(enhancedChats as WhatsappChat[]);
        }
      } else {
        console.log("Keine Chats gefunden");
        setChats([]);
      }
    } catch (err) {
      console.error("Unerwarteter Fehler:", err);
      setError(err instanceof Error ? err.message : "Unbekannter Fehler");
      toast({
        variant: "destructive",
        title: "Unerwarteter Fehler",
        description: err instanceof Error ? err.message : "Bitte versuche es später erneut",
      });
    } finally {
      setLoading(false);
    }
  }, [accountIds, toast]);

  useEffect(() => { 
    fetchChats();
  }, [fetchChats]);
  
  return { chats, loading, error, refetch: fetchChats };
};

export const useWhatsappMessages = (chatId: string | null) => {
  const [messages, setMessages] = useState<WhatsappMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchMessages = useCallback(async () => {
    setError(null);
    if (!chatId) return;
    
    setLoading(true);
    console.log(`Lade Nachrichten für Chat ${chatId}`);
    
    try {
      const { data, error: fetchError } = await supabase
        .from("whatsapp_messages")
        .select("*")
        .eq("chat_id", chatId)
        .order("sent_at", { ascending: true });
      
      if (fetchError) {
        console.error("Fehler beim Laden der Nachrichten:", fetchError);
        setError(fetchError.message);
        toast({
          variant: "destructive",
          title: "Fehler beim Laden der Nachrichten",
          description: fetchError.message,
        });
      } else if (data) {
        console.log(`${data.length} Nachrichten erfolgreich geladen`);
        setMessages(data as WhatsappMessage[]);
      }
    } catch (err) {
      console.error("Unerwarteter Fehler:", err);
      setError(err instanceof Error ? err.message : "Unbekannter Fehler");
      toast({
        variant: "destructive", 
        title: "Unerwarteter Fehler",
        description: err instanceof Error ? err.message : "Bitte versuche es später erneut",
      });
    } finally {
      setLoading(false);
    }
  }, [chatId, toast]);

  useEffect(() => { 
    if (chatId) fetchMessages(); 
  }, [chatId, fetchMessages]);
  
  return { messages, loading, error, refetch: fetchMessages };
};
