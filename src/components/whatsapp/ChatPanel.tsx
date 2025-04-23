import React, { useRef, useEffect, useState } from "react";
import { useWhatsappMessages, WhatsappMessage, WhatsappChat } from "@/hooks/useWhatsappChats";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Send, Smile } from "lucide-react";
import EmojiPicker, { Theme, EmojiClickData } from 'emoji-picker-react';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { SuggestedResponses } from "./SuggestedResponses";

interface ChatPanelProps {
  chat: WhatsappChat;
  onClose: () => void;
  onMessageSent?: () => void;
}

const ChatPanel: React.FC<ChatPanelProps> = ({ chat, onClose, onMessageSent }) => {
  const { messages, loading, refetch } = useWhatsappMessages(chat?.id || null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim()) return;
    setSending(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('twilio-send-message', {
        body: {
          to_number: chat.contact_number,
          message_body: input.trim(),
          chat_id: chat.id
        }
      });
      
      if (error) {
        console.error("Fehler beim Senden über die Edge-Funktion:", error);
        toast({ title: "Fehler beim Senden", description: error.message, variant: "destructive" });
      } else {
        setInput("");
        toast({ title: "Nachricht gesendet", description: "Deine Nachricht wurde erfolgreich versandt." });
        
        setTimeout(() => {
          refetch();
          if (onMessageSent) onMessageSent();
        }, 500);
      }
    } catch (err) {
      console.error("Unerwarteter Fehler beim Senden:", err);
      toast({ 
        title: "Fehler beim Senden", 
        description: err instanceof Error ? err.message : "Ein unbekannter Fehler ist aufgetreten", 
        variant: "destructive" 
      });
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleSuggestedResponse = (response: string) => {
    setInput(response);
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  const onEmojiClick = (emojiData: EmojiClickData) => {
    setInput(prev => prev + emojiData.emoji);
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  const formatMessageTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex flex-col h-full w-full">
      <div className="flex items-center justify-between px-4 py-3 border-b bg-avanti-50 text-avanti-900 rounded-t-2xl">
        <div>
          <span className="font-semibold">{chat.contact_name}</span>
          <span className="ml-2 text-sm text-avanti-600">{chat.contact_number}</span>
        </div>
        <Button 
          size="sm" 
          variant="ghost" 
          onClick={onClose}
          className="hover:bg-avanti-100"
        >
          Schließen
        </Button>
      </div>
      
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-2 space-y-4 bg-[#F0F2F5]">
        {loading ? (
          <div className="flex items-center justify-center h-32 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            Nachrichten werden geladen…
          </div>
        ) : (
          <div className="flex flex-col gap-3 py-2">
            {messages.map((msg, idx) => (
              <div
                key={msg.id}
                className={`flex ${msg.is_from_me ? "justify-end" : "justify-start"}`}
              >
                <div className={`
                  px-4 py-2 max-w-[75%] whitespace-pre-wrap rounded-2xl shadow-sm
                  ${msg.is_from_me
                    ? "bg-avanti-100 text-right text-avanti-900"
                    : "bg-white text-gray-900"}
                `}>
                  <div className="flex justify-between items-center gap-2 mb-1">
                    <span className="text-xs font-medium text-gray-700">
                      {msg.is_from_me ? "Du" : chat.contact_name}
                    </span>
                    <span className="text-xs text-gray-400">
                      {formatMessageTime(msg.sent_at)}
                    </span>
                  </div>
                  <span className="block text-sm">{msg.content}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      <div className="flex flex-col gap-2 p-4 border-t bg-[#F0F2F5]">
        <form
          onSubmit={e => { e.preventDefault(); sendMessage(); }}
          className="flex gap-2 items-end bg-white rounded-2xl p-2"
        >
          <Popover>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-10 w-10 rounded-full hover:bg-avanti-50"
              >
                <Smile className="h-5 w-5 text-avanti-600" />
              </Button>
            </PopoverTrigger>
            <PopoverContent 
              className="p-0 border-none" 
              side="top" 
              align="start"
              style={{ width: 'auto' }}
            >
              <EmojiPicker
                theme={Theme.LIGHT}
                onEmojiClick={onEmojiClick}
                width={320}
                height={400}
              />
            </PopoverContent>
          </Popover>
          
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Antwort eingeben…"
            disabled={sending}
            className="flex-1 min-h-[36px] max-h-32 border-none focus-visible:ring-0"
          />
          
          <Button
            type="submit"
            disabled={sending || !input.trim()}
            className="rounded-full bg-avanti-600 text-white w-10 h-10 flex items-center justify-center shadow hover:bg-avanti-700"
          >
            {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
          </Button>
        </form>
        
        <SuggestedResponses 
          customerId={chat.customer_id} 
          onSelectResponse={handleSuggestedResponse} 
        />
      </div>
    </div>
  );
};

export default ChatPanel;
