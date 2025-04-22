import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Send } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { markdownToHtml } from '@/utils/markdownToHtml';

interface Message {
  role: 'assistant' | 'user';
  content: string;
}

interface KnowledgeArticleChatProps {
  useCaseId: string;
  onContentChange?: (content: string) => void;
}

const KnowledgeArticleChat = ({ useCaseId, onContentChange }: KnowledgeArticleChatProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [previousResponseId, setPreviousResponseId] = useState<string | null>(null);
  const { toast } = useToast();

  const { mutate: sendMessage, isPending } = useMutation({
    mutationFn: async () => {
      const userInput = messages.length === 0 
        ? "Bitte erstelle einen Wissensartikel" 
        : input;

      const response = await supabase.functions.invoke('generate-knowledge-article', {
        body: {
          prompt: `Du bist Ava, die digitale Assistenz bei avanti.

Du unterstützt interne Service-Mitarbeitende dabei, strukturierte Use Cases in klar verständliche, nutzerfreundliche und professionelle **Wissensartikel** umzuwandeln. Diese Artikel dienen zur schnellen Orientierung bei internen Fragen und Informationsbedarfen.

Zielgruppe: Service-Mitarbeitende, die wissen möchten, wie ein bestimmter Ablauf funktioniert oder was in einem konkreten Fall zu tun ist.  
Stil: sachlich, verständlich, professionell – im Stil einer internen Wissensdatenbank.  
Format: Artikel mit klaren Zwischenüberschriften und ggf. Aufzählungen.

Strukturiere den Artikel nach folgendem Muster:

---

**Titel**  
→ Verwende den Titel des Use Cases.

**Einleitung**  
→ Beschreibe kurz und verständlich, worum es in diesem Anwendungsfall geht (Ziel, Kontext, Relevanz).

**Benötigte Informationen**  
→ Liste kompakt auf, welche Informationen im Vorfeld vorliegen müssen.

**Vorgehen**  
→ Gib eine schrittweise Anleitung, wie der Fall bearbeitet wird.

**Erwartetes Ergebnis**  
→ Beschreibe, was am Ende des Prozesses passiert bzw. wie ein erfolgreicher Abschluss aussieht.

**Hinweise oder Besonderheiten**  
→ Optional: Nenne Herausforderungen, Sonderfälle oder wichtige Hinweise zur Bearbeitung.`,
          userInput,
          use_case_id: useCaseId,
          previous_response_id: previousResponseId
        },
      });

      if (response.error) throw response.error;
      return response.data;
    },
    onSuccess: (data) => {
      if (messages.length > 0) {
        setMessages(prev => [...prev, { role: 'user', content: input }]);
      }
      const newMessage = { role: 'assistant' as const, content: data.content };
      setMessages(prev => [...prev, newMessage]);
      setPreviousResponseId(data.response_id);
      setInput('');
      
      if (onContentChange) {
        const htmlContent = markdownToHtml(data.content);
        onContentChange(htmlContent);
      }
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Fehler beim Generieren des Artikels",
        description: error.message,
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isPending) return;
    
    if (messages.length === 0 || input.trim()) {
      sendMessage();
    }
  };

  return (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              Klicken Sie auf "Generieren", um einen Wissensartikel zu erstellen
            </div>
          ) : (
            messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${
                  message.role === 'assistant' ? 'justify-start' : 'justify-end'
                }`}
              >
                <div
                  className={`max-w-[80%] p-4 rounded-xl ${
                    message.role === 'assistant'
                      ? 'bg-blue-100'
                      : 'bg-green-100'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{message.content}</p>
                </div>
              </div>
            ))
          )}
          {isPending && (
            <div className="flex justify-start">
              <div className="max-w-[80%] p-4 rounded-xl bg-blue-100">
                <div className="flex space-x-2">
                  <div className="w-2 h-2 rounded-full bg-blue-400 animate-bounce" />
                  <div className="w-2 h-2 rounded-full bg-blue-400 animate-bounce delay-75" />
                  <div className="w-2 h-2 rounded-full bg-blue-400 animate-bounce delay-150" />
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      <form onSubmit={handleSubmit} className="p-4 border-t">
        <div className="flex gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={messages.length === 0 
              ? "Klicken Sie auf Generieren um zu starten..." 
              : "Ihre Nachricht..."}
            className="flex-1 resize-none"
            rows={3}
            disabled={messages.length === 0}
          />
          <Button 
            type="submit"
            disabled={isPending || (messages.length > 0 && !input.trim())}
            className="self-end"
          >
            <Send className="h-4 w-4 mr-2" />
            {messages.length === 0 ? 'Generieren' : 'Senden'}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default KnowledgeArticleChat;
