
import React, { useRef, useEffect, useState } from "react";
import { useWhatsappMessages, WhatsappMessage, WhatsappChat } from "@/hooks/useWhatsappChats";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/components/ui/use-toast";

interface ChatPanelProps {
  chat: WhatsappChat;
  onClose: () => void;
}

const ChatPanel: React.FC<ChatPanelProps> = ({ chat, onClose }) => {
  const { messages, loading, refetch } = useWhatsappMessages(chat?.id || null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim()) return;
    setSending(true);
    const { error } = await supabase.from('whatsapp_messages').insert({
      chat_id: chat.id,
      content: input.trim(),
      is_from_me: true
    });
    
    if (error) {
      toast({ title: "Fehler beim Senden", description: error.message, variant: "destructive" });
    } else {
      setInput("");
      // Nach dem Senden wird der trigger-webhook-processing aufgerufen
      try {
        await supabase.functions.invoke('trigger-webhook-processing');
        // Warte kurz und lade dann die Nachrichten neu
        setTimeout(() => refetch(), 500);
      } catch (processingError) {
        console.error("Fehler beim Verarbeiten der Nachricht:", processingError);
      }
    }
    setSending(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex flex-col h-full w-full">
      <div className="flex items-center justify-between px-2 py-3 border-b bg-white rounded-t-2xl">
        <div>
          <span className="font-semibold">{chat.contact_name}</span>
          <span className="ml-2 text-sm text-gray-400">{chat.contact_number}</span>
        </div>
        <Button size="sm" variant="outline" onClick={onClose}>Schließen</Button>
      </div>
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-2 bg-gray-50">
        {loading ? (
          <div className="flex items-center justify-center h-32 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            Nachrichten werden geladen…
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {messages.map((msg, idx) => (
              <React.Fragment key={msg.id}>
                <div className={`flex ${msg.is_from_me ? "justify-end" : "justify-start"}`}>
                  <div className={`
                    px-4 py-2 max-w-[75%] whitespace-pre-wrap rounded-2xl
                    ${msg.is_from_me
                      ? "bg-green-100 text-right text-black"
                      : "bg-white border border-gray-200 text-black"}
                  `}>
                    <span className="block text-xs font-medium mb-1 text-gray-700">
                      {msg.is_from_me ? "Du" : chat.contact_name}
                    </span>
                    <span className="block text-sm">{msg.content}</span>
                  </div>
                </div>
                {idx < messages.length - 1 && <Separator />}
              </React.Fragment>
            ))}
          </div>
        )}
      </div>
      <form
        onSubmit={e => { e.preventDefault(); sendMessage(); }}
        className="flex gap-2 items-end border-t p-3 bg-white rounded-b-2xl"
      >
        <Textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Antwort eingeben…"
          disabled={sending}
          className="flex-1 min-h-[36px] max-h-32"
        />
        <Button
          type="submit"
          disabled={sending || !input.trim()}
          className="rounded-full bg-green-600 text-white w-12 h-12 flex items-center justify-center shadow"
        >
          {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
        </Button>
      </form>
    </div>
  );
};

export default ChatPanel;
