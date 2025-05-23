
import React, { useState, useRef, useEffect } from 'react';
import { X, Send, Loader2, MessageSquare } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useIsMobile } from '@/hooks/use-mobile';

interface Message {
  id: string;
  from: 'user' | 'bot' | 'error';
  content: string;
  source?: 'knowledge' | 'gpt' | 'none';
}

interface FloatingChatPanelProps {
  onClose: () => void;
}

export function FloatingChatPanel({
  onClose
}: FloatingChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [useGPTFallback, setUseGPTFallback] = useState(false);
  const [lastQuery, setLastQuery] = useState<string | null>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const isMobile = useIsMobile();

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoading]);

  const handleSend = async (retryQuery?: string) => {
    const queryText = retryQuery || input.trim();
    if (!queryText && !retryQuery || isLoading) return;
    if (!retryQuery) {
      const userMessage: Message = {
        id: crypto.randomUUID(),
        from: 'user',
        content: queryText
      };
      setMessages(prev => [...prev, userMessage]);
      setInput('');
    }
    setLastQuery(queryText);
    setIsLoading(true);
    try {
      console.log("Sending query:", queryText);
      const {
        data,
        error
      } = await supabase.functions.invoke('knowledge-chat', {
        body: {
          query: queryText,
          useGPTFallback
        }
      });
      if (error) {
        console.error('Supabase function error:', error);
        throw new Error(`Fehler bei der Abfrage: ${error.message}`);
      }
      if (data.error) {
        console.error('Knowledge chat error:', data.error);
        throw new Error(data.error);
      }
      console.log("Response received:", data.result);
      const botMessage: Message = {
        id: crypto.randomUUID(),
        from: 'bot',
        content: data.result.content,
        source: data.result.source
      };
      setMessages(prev => [...prev, botMessage]);
    } catch (err: any) {
      console.error('Error fetching response:', err);
      const errorMessage: Message = {
        id: crypto.randomUUID(),
        from: 'error',
        content: `Fehler beim Abrufen der Antwort: ${err.message || 'Unbekannter Fehler'}`
      };
      setMessages(prev => [...prev, errorMessage]);
      toast.error('Fehler beim Abrufen der Antwort', {
        description: err.message || 'Bitte versuchen Sie es später erneut'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleRetry = () => {
    if (lastQuery) {
      handleSend(lastQuery);
    }
  };

  return (
    <Card 
      className={`${isMobile ? 'fixed inset-0 w-full h-full rounded-none' : 'w-[380px] h-[500px] rounded-[20px]'} overflow-hidden flex flex-col shadow-xl border-none`}
    >
      <div className="relative">
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-4 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/30 flex items-center justify-center">
                <MessageSquare className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">AVA</h3>
                <p className="text-xs text-white/80">Immer für Dich da</p>
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 w-8 p-0 rounded-full hover:bg-white/20 text-white" 
              onClick={onClose}
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Schließen</span>
            </Button>
          </div>
        </div>
      </div>

      <div 
        className="flex-1 overflow-y-auto px-5 pt-6 pb-2 bg-white"
        ref={chatContainerRef}
      >
        <div className="space-y-4">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center text-center p-6">
              <p className="text-gray-500 text-sm">
                Frag mich etwas über Prozesse, Begriffe oder Abläufe.
              </p>
            </div>
          ) : (
            messages.map(message => (
              <div
                key={message.id}
                className={`flex ${message.from === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {message.from === 'error' ? (
                  <div className={`${isMobile ? 'max-w-[90%]' : 'max-w-[280px]'} rounded-2xl px-4 py-3 bg-red-50 border border-red-200 text-red-800 shadow-sm`}>
                    <div className="flex items-start gap-2 text-sm">
                      {message.content}
                    </div>
                  </div>
                ) : (
                  <div
                    className={`${isMobile ? 'max-w-[90%]' : 'max-w-[280px]'} rounded-[18px] px-4 py-3 shadow-sm
                      ${message.from === 'user' 
                        ? 'bg-blue-500 text-white ml-12' 
                        : 'bg-gray-100 text-gray-900 mr-12'
                      }`}
                  >
                    <div className="text-sm whitespace-pre-wrap">{message.content}</div>
                    {message.source && message.source !== 'none' && (
                      <div className="text-xs opacity-70 mt-1 text-right">
                        {message.source === 'knowledge' ? 'Aus dem Wissenssystem' : 'Mit GPT generiert'}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-gray-100 rounded-[18px] px-4 py-3 max-w-[280px]">
                <div className="flex space-x-2 items-center h-6">
                  <div className="w-2 h-2 rounded-full bg-blue-400 animate-bounce"></div>
                  <div className="w-2 h-2 rounded-full bg-blue-400 animate-bounce [animation-delay:0.2s]"></div>
                  <div className="w-2 h-2 rounded-full bg-blue-400 animate-bounce [animation-delay:0.4s]"></div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="p-4 bg-white border-t border-gray-100">
        <div className="flex items-center space-x-2 mb-3">
          <Checkbox 
            id="gpt-fallback" 
            checked={useGPTFallback} 
            onCheckedChange={checked => setUseGPTFallback(checked === true)} 
            className="border-blue-200" 
          />
          <Label htmlFor="gpt-fallback" className="text-xs text-gray-600">
            Bei fehlenden Einträgen GPT nutzen
          </Label>
        </div>

        <div className="relative">
          <Textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ihre Frage..."
            className="pr-16 resize-none min-h-[50px] max-h-[120px] text-sm border-gray-200 shadow-sm focus-visible:ring-blue-500 px-4 py-3"
            rows={1}
            disabled={isLoading}
            iconRight={
              <Button
                onClick={() => handleSend()}
                disabled={!input.trim() || isLoading}
                className="absolute bottom-1.5 right-1.5 h-10 w-10 rounded-full bg-blue-500 hover:bg-blue-600 p-0 flex items-center justify-center shadow-md"
                aria-label="Senden"
              >
                {isLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin text-white" />
                ) : (
                  <Send className="h-5 w-5 text-white" />
                )}
              </Button>
            }
          />
        </div>
      </div>
    </Card>
  );
}

export default FloatingChatPanel;
