
import React, { useState, useEffect, useRef } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { de } from 'date-fns/locale';
import { Minimize2, Send, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from "@/hooks/use-toast";
import { useAuth } from '@/contexts/AuthContext';

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

interface AgentChatPopupProps {
  onClose: () => void;
}

const AgentChatPopup = ({ onClose }: AgentChatPopupProps) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);
  const [supervisor, setSupervisor] = useState<User | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (!minimized) {
      scrollToBottom();
      setHasUnread(false);
    }
  }, [messages, minimized]);

  useEffect(() => {
    if (!user?.id) return;
    
    // Play notification sound on new messages
    const audio = new Audio('/sounds/notification.mp3');
    
    const fetchMessages = async () => {
      try {
        // Find the most recent supervisor message first to get supervisor info
        const { data: latestMessage, error } = await supabase
          .from('supervisor_messages')
          .select('*, profiles:sender_id("Full Name")')
          .eq('recipient_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (error && error.code !== 'PGRST116') {
          console.error('Error fetching supervisor:', error);
          return;
        }

        if (latestMessage) {
          setSupervisor({
            id: latestMessage.sender_id,
            fullName: latestMessage.profiles["Full Name"]
          });
          
          // Now fetch all messages with this supervisor
          const { data: allMessages, error: messagesError } = await supabase
            .from('supervisor_messages')
            .select('*')
            .or(`sender_id.eq.${latestMessage.sender_id},recipient_id.eq.${latestMessage.sender_id}`)
            .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
            .order('created_at', { ascending: true });
            
          if (messagesError) throw messagesError;
          
          if (allMessages) {
            const formattedMessages = allMessages.map(msg => ({
              id: msg.id,
              senderId: msg.sender_id,
              senderName: msg.sender_id === user.id ? 'You' : `${latestMessage.profiles["Full Name"]} (Supervisor)`,
              content: msg.content,
              timestamp: new Date(msg.created_at)
            }));
            
            setMessages(formattedMessages);
            
            // Mark messages as read
            const unreadIds = allMessages
              .filter(msg => msg.recipient_id === user.id && !msg.is_read)
              .map(msg => msg.id);
              
            if (unreadIds.length > 0) {
              await supabase
                .from('supervisor_messages')
                .update({ is_read: true })
                .in('id', unreadIds);
            }
          }
        }
      } catch (error) {
        console.error('Error loading messages:', error);
      }
    };

    fetchMessages();

    // Subscribe to new messages from supervisors
    const channel = supabase
      .channel('agent-supervisor-chat')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'supervisor_messages',
        filter: `recipient_id=eq.${user.id}` 
      }, async payload => {
        const newMsg = payload.new;
        
        // Fetch sender name
        const { data: sender } = await supabase
          .from('profiles')
          .select('"Full Name"')
          .eq('id', newMsg.sender_id)
          .single();
          
        const senderName = sender ? `${sender["Full Name"]} (Supervisor)` : "Supervisor";
        
        // Add new message
        setMessages(prev => [...prev, {
          id: newMsg.id,
          senderId: newMsg.sender_id,
          senderName,
          content: newMsg.content,
          timestamp: new Date(newMsg.created_at)
        }]);
        
        // Show notification if minimized
        if (minimized) {
          setHasUnread(true);
          audio.play().catch(console.error);
        } else {
          // Mark as read immediately if chat is open
          await supabase
            .from('supervisor_messages')
            .update({ is_read: true })
            .eq('id', newMsg.id);
        }
        
        // Update supervisor info if needed
        if (!supervisor) {
          setSupervisor({
            id: newMsg.sender_id,
            fullName: senderName.replace(' (Supervisor)', '')
          });
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, supervisor, minimized]);

  const sendMessage = async () => {
    if (!newMessage.trim() || sending || !user?.id || !supervisor) return;
    
    setSending(true);
    
    try {
      const { data, error } = await supabase
        .from('supervisor_messages')
        .insert({
          content: newMessage.trim(),
          sender_id: user.id,
          recipient_id: supervisor.id,
          is_read: false
        })
        .select()
        .single();
      
      if (error) throw error;
      
      if (data) {
        setMessages(prev => [...prev, {
          id: data.id,
          senderId: data.sender_id,
          senderName: 'You',
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

  const toggleMinimize = () => {
    setMinimized(!minimized);
    if (minimized) {
      setHasUnread(false);
    }
  };

  if (!messages.length && !supervisor) {
    return null;
  }

  return (
    <Card className={`fixed right-6 bottom-6 shadow-lg transition-all duration-300 w-80 z-50 ${
      minimized ? 'h-14' : 'h-[450px]'
    }`}>
      <CardHeader 
        className={`p-3 cursor-pointer ${hasUnread ? 'bg-avanti-100' : 'bg-white'} border-b flex-row items-center justify-between`}
        onClick={toggleMinimize}
      >
        <CardTitle className="text-sm">
          {hasUnread && <span className="inline-block w-2 h-2 bg-avanti-600 rounded-full mr-2"></span>}
          {supervisor?.fullName || "Supervisor"} 
        </CardTitle>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={toggleMinimize}>
            <Minimize2 className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={onClose}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardHeader>
      
      {!minimized && (
        <>
          <CardContent className="flex-grow overflow-y-auto p-3 space-y-3 max-h-[330px]">
            {messages.map(message => (
              <div 
                key={message.id} 
                className={`flex flex-col ${
                  message.senderName === 'You' ? 'items-end' : 'items-start'
                }`}
              >
                <div className={`max-w-[85%] rounded-lg px-3 py-2 shadow-sm ${
                  message.senderName === 'You' 
                    ? 'bg-avanti-100 text-avanti-900' 
                    : 'bg-white border border-gray-100'
                }`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium">
                      {message.senderName}
                    </span>
                    <span className="text-xs text-gray-400">
                      {formatMessageTime(message.timestamp)}
                    </span>
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </CardContent>
          
          <CardFooter className="p-3 pt-0">
            <div className="flex items-end gap-2 w-full">
              <Textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Nachricht eingeben..."
                className="resize-none flex-grow text-sm min-h-[60px]"
                rows={2}
              />
              <Button 
                type="button" 
                onClick={sendMessage}
                disabled={!newMessage.trim() || sending}
                size="sm"
                className="h-8 w-8 rounded-full p-0 flex items-center justify-center"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </CardFooter>
        </>
      )}
    </Card>
  );
};

export default AgentChatPopup;
