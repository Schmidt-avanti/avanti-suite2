
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type WhatsappChat = {
  id: string;
  account_id: string;
  contact_name: string;
  contact_number: string;
  last_message: string | null;
  last_message_time: string | null;
  unread_count: number;
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

  const fetchChats = useCallback(async () => {
    if (!accountIds.length) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("whatsapp_chats")
      .select("*")
      .in("account_id", accountIds)
      .order("last_message_time", { ascending: false });
    if (!error && data) {
      setChats(data as WhatsappChat[]);
    }
    setLoading(false);
  }, [accountIds]);

  useEffect(() => { fetchChats(); }, [fetchChats]);
  return { chats, loading, refetch: fetchChats };
};

export const useWhatsappMessages = (chatId: string | null) => {
  const [messages, setMessages] = useState<WhatsappMessage[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchMessages = useCallback(async () => {
    if (!chatId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("whatsapp_messages")
      .select("*")
      .eq("chat_id", chatId)
      .order("sent_at", { ascending: true });
    if (!error && data) {
      setMessages(data as WhatsappMessage[]);
    }
    setLoading(false);
  }, [chatId]);

  useEffect(() => { if (chatId) fetchMessages(); }, [chatId, fetchMessages]);
  return { messages, loading, refetch: fetchMessages };
};
