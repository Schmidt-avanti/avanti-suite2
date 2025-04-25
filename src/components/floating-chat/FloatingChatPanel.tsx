
import React, { useState, useRef, useEffect } from 'react';
import { X, Send, Loader2, MessageSquare, AlertCircle, RefreshCcw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

interface Message {
  id: string;
  from: 'user' | 'bot' | 'error';
  content: string;
  source?: 'knowledge' | 'gpt' | 'none';
}

interface FloatingChatPanelProps {
  onClose: () => void;
}

export function FloatingChatPanel({ onClose }: FloatingChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [useGPTFallback, setUseGPTFallback] = useState(false);
  const [lastQuery, setLastQuery] = useState<string | null>(null);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  
  // Focus input on mount
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      const scrollArea = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollArea) {
        scrollArea.scrollTop = scrollArea.scrollHeight;
      }
    }
  }, [messages]);

  const handleSend = async (retryQuery?: string) => {
    const queryText = retryQuery || input.trim();
    
    if ((!queryText && !retryQuery) || isLoading) return;
    
    // If this is a new query (not a retry), add the user message
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
      const { data, error } = await supabase.functions.invoke('knowledge-chat', {
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
        content: `Fehler beim Abrufen der Antwort: ${err.message || 'Unbekannter Fehler'}`,
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
    <Card className="w-[380px] h-[500px] shadow-xl rounded-2xl overflow-hidden flex flex-col border border-gray-200">
      <CardHeader className="p-4 bg-slate-50 border-b flex flex-row items-center justify-between">
        <CardTitle className="text-base font-medium flex items-center">
          <MessageSquare className="h-4 w-4 mr-2 text-blue-500" />
          Wissensassistent
        </CardTitle>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-full" onClick={onClose}>
          <X className="h-4 w-4" />
          <span className="sr-only">Schließen</span>
        </Button>
      </CardHeader>
      
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center text-center p-4">
            <p className="text-slate-500 text-sm">
              Frag mich etwas über Prozesse, Begriffe oder Abläufe...
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${
                  message.from === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                {message.from === 'error' ? (
                  <div className="max-w-[280px] rounded-xl px-4 py-2 bg-red-50 border border-red-200 text-red-800">
                    <div className="flex items-start">
                      <AlertCircle className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                      <div className="whitespace-pre-wrap text-sm">{message.content}</div>
                    </div>
                    <div className="mt-2 flex justify-end">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={handleRetry} 
                        className="h-7 text-xs px-2 py-1"
                      >
                        <RefreshCcw className="h-3 w-3 mr-1" />
                        Wiederholen
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div
                    className={`max-w-[280px] rounded-xl px-4 py-2 ${
                      message.from === 'user'
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 text-gray-900'
                    }`}
                  >
                    <div className="whitespace-pre-wrap text-sm">{message.content}</div>
                    {message.source && message.source !== 'none' && (
                      <div className="text-xs opacity-70 mt-1 text-right">
                        {message.source === 'knowledge' ? 'Aus dem Wissenssystem' : 'Mit GPT generiert'}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 rounded-xl px-4 py-2 max-w-[280px]">
                  <div className="flex space-x-2 items-center h-6">
                    <div className="w-2 h-2 rounded-full bg-slate-300 animate-bounce"></div>
                    <div className="w-2 h-2 rounded-full bg-slate-300 animate-bounce delay-75"></div>
                    <div className="w-2 h-2 rounded-full bg-slate-300 animate-bounce delay-150"></div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </ScrollArea>
      
      <CardFooter className="flex flex-col gap-3 p-4 pt-2 bg-gray-50 border-t">
        <div className="flex items-center space-x-2 text-sm">
          <Checkbox 
            id="gpt-fallback" 
            checked={useGPTFallback} 
            onCheckedChange={(checked) => setUseGPTFallback(checked === true)}
          />
          <Label htmlFor="gpt-fallback" className="text-xs text-gray-600">
            Bei fehlenden Einträgen GPT nutzen
          </Label>
        </div>
        
        <div className="flex gap-2 w-full">
          <Textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ihre Frage..."
            className="flex-1 resize-none min-h-[40px] max-h-[120px] text-sm"
            rows={1}
            disabled={isLoading}
          />
          <Button
            onClick={() => handleSend()}
            disabled={!input.trim() || isLoading}
            size="sm"
            className="h-10 w-10"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}

export default FloatingChatPanel;
