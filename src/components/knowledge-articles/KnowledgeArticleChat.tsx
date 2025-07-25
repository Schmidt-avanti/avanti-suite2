import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Send } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';

interface Message {
  role: 'assistant' | 'user';
  content: string;
}

interface KnowledgeArticleChatProps {
  useCaseId?: string;
  onContentUpdate?: (content: string) => void;
}

const KnowledgeArticleChat = ({ useCaseId, onContentUpdate }: KnowledgeArticleChatProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [previousResponseId, setPreviousResponseId] = useState<string | null>(null);
  const { toast } = useToast();

  const { mutate: sendMessage, isPending } = useMutation({
    mutationFn: async () => {
      const userInput = messages.length === 0 
        ? undefined  
        : input;

      console.log("=== FRONTEND DEBUG ===");
      console.log("Calling Edge Function with:");
      console.log("- userInput:", userInput);
      console.log("- useCaseId:", useCaseId);
      console.log("- previousResponseId:", previousResponseId);

      const response = await supabase.functions.invoke('generate-knowledge-article-v3', {
        body: {
          userInput,
          use_case_id: useCaseId,
          previous_response_id: previousResponseId
        },
      });

      console.log("Edge Function response:", response);

      if (response.error) {
        console.error("Edge Function error:", response.error);
        throw response.error;
      }
      return response.data;
    },
    onSuccess: (data) => {
      if (messages.length > 0) {
        setMessages(prev => [...prev, { role: 'user', content: input }]);
      }
      
      if (data?.content) {
        setMessages(prev => [...prev, { role: 'assistant', content: data.content }]);
        setPreviousResponseId(data.response_id);
        setInput('');
        
        if (onContentUpdate) {
          onContentUpdate(data.content);
        }
      } else {
        // Fehlerfall behandeln
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: 'Es gab ein Problem beim Generieren des Artikels. Bitte versuchen Sie es erneut.' 
        }]);
      }
    },
    onError: (error) => {
      console.error('Error details:', error);
      toast({
        variant: "destructive",
        title: "Fehler beim Generieren des Artikels",
        description: error.message || "Ein unbekannter Fehler ist aufgetreten",
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
        <div className="flex gap-4">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={messages.length === 0 ? "Klicken Sie auf 'Generieren' um zu starten" : "Ihre Nachricht..."}
            className="flex-1 resize-none"
            rows={3}
            disabled={messages.length === 0 || isPending}
          />
          <Button 
            type="submit"
            disabled={isPending || (messages.length > 0 && !input.trim())}
            className="self-end px-6 py-3 mr-4 mb-4"
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
