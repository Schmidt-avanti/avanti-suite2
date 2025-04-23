
import React, { useState, useRef, useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { de } from 'date-fns/locale';
import { Send, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from "@/hooks/use-toast";

interface User {
  id: string;
  fullName: string;
}

interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  timestamp: Date;
}

interface SupervisorChatProps {
  open: boolean;
  onClose: () => void;
  agent: User;
  supervisor: User;
}

const SupervisorChat = ({ open, onClose, agent, supervisor }: SupervisorChatProps) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load previous messages when chat opens
  useEffect(() => {
    if (open && agent) {
      const fetchMessages = async () => {
        try {
          const { data, error } = await supabase
            .from('supervisor_messages')
            .select('*')
            .or(`sender_id.eq.${supervisor.id},recipient_id.eq.${supervisor.id}`)
            .or(`sender_id.eq.${agent.id},recipient_id.eq.${agent.id}`)
            .order('created_at', { ascending: true });

          if (error) throw error;

          if (data) {
            setMessages(data.map(msg => ({
              id: msg.id,
              senderId: msg.sender_id,
              senderName: msg.sender_id === supervisor.id ? supervisor.fullName : agent.fullName,
              content: msg.content,
              timestamp: new Date(msg.created_at)
            })));
          }
        } catch (error) {
          console.error('Error loading messages:', error);
        }
      };

      fetchMessages();

      // Subscribe to new messages
      const channel = supabase
        .channel('supervisor-chat')
        .on('postgres_changes', { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'supervisor_messages',
          filter: `recipient_id=eq.${supervisor.id}` 
        }, payload => {
          const newMsg = payload.new as any;
          if (newMsg.sender_id === agent.id) {
            setMessages(prev => [...prev, {
              id: newMsg.id,
              senderId: newMsg.sender_id,
              senderName: agent.fullName,
              content: newMsg.content,
              timestamp: new Date(newMsg.created_at)
            }]);
          }
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [open, agent, supervisor]);

  const sendMessage = async () => {
    if (!newMessage.trim() || sending) return;
    
    setSending(true);
    
    try {
      const { data, error } = await supabase
        .from('supervisor_messages')
        .insert({
          content: newMessage.trim(),
          sender_id: supervisor.id,
          recipient_id: agent.id,
          is_read: false
        })
        .select()
        .single();
      
      if (error) throw error;
      
      if (data) {
        setMessages(prev => [...prev, {
          id: data.id,
          senderId: data.sender_id,
          senderName: supervisor.fullName,
          content: data.content,
          timestamp: new Date(data.created_at)
        }]);
        
        setNewMessage('');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Fehler",
        description: "Die Nachricht konnte nicht gesendet werden.",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatMessageTime = (timestamp: Date) => {
    return formatDistanceToNow(timestamp, { 
      addSuffix: true, 
      locale: de 
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md max-h-[600px] flex flex-col">
        <DialogHeader>
          <DialogTitle>Chat mit {agent.fullName}</DialogTitle>
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-4 top-4"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Schließen</span>
          </Button>
        </DialogHeader>
        
        <div className="flex-grow overflow-y-auto p-4 space-y-4 bg-gray-50 rounded-md mb-4 max-h-[400px]">
          {messages.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              Noch keine Nachrichten. Schreib die erste Nachricht!
            </div>
          ) : (
            messages.map(message => (
              <div 
                key={message.id} 
                className={`flex flex-col ${
                  message.senderId === supervisor.id ? 'items-end' : 'items-start'
                }`}
              >
                <div className="max-w-[80%] bg-white rounded-lg shadow-sm px-4 py-2">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium text-avanti-700">
                      {message.senderName}
                    </span>
                    <span className="text-xs text-gray-400">
                      {formatMessageTime(message.timestamp)}
                    </span>
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
        
        <div className="flex items-end gap-2">
          <Textarea
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Nachricht eingeben..."
            className="resize-none flex-grow"
            rows={2}
          />
          <Button 
            type="button" 
            onClick={sendMessage}
            disabled={!newMessage.trim() || sending}
            className="rounded-full h-10 w-10 flex items-center justify-center p-0"
          >
            <Send className="h-5 w-5" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SupervisorChat;
