
import React, { useState, useEffect, useRef } from 'react';
import { X, MinusCircle, Send, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { de } from 'date-fns/locale';

interface Message {
  id: string;
  content: string;
  sender_id: string;
  recipient_id: string;
  created_at: string;
  is_read: boolean;
  sender_name?: string;
}

interface AgentChatPopupProps {
  onClose: () => void;
}

const AgentChatPopup: React.FC<AgentChatPopupProps> = ({ onClose }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isMinimized, setIsMinimized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    console.log('AgentChatPopup mounted, user:', user?.id);
    if (!user?.id) return;
    
    const fetchMessages = async () => {
      setIsLoading(true);
      console.log('Fetching messages for user:', user.id);
      
      // First get messages
      const { data, error } = await supabase
        .from('supervisor_messages')
        .select('*')
        .or(`recipient_id.eq.${user.id},sender_id.eq.${user.id}`)
        .order('created_at', { ascending: true });
        
      if (error) {
        console.error('Error fetching messages:', error);
        toast({
          variant: "destructive",
          title: "Fehler",
          description: "Konnte keine Nachrichten laden."
        });
        setIsLoading(false);
        return;
      }

      console.log('Fetched messages:', data?.length);
      
      if (!data || data.length === 0) {
        setIsLoading(false);
        return;
      }

      // Then fetch profiles separately to get sender names
      const senderIds = data
        .map(msg => msg.sender_id)
        .filter((id, index, self) => self.indexOf(id) === index);

      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('"Full Name", id')
        .in('id', senderIds);
        
      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
      }

      // Create a map of id -> name for quick lookups
      const profileMap = new Map();
      if (profilesData) {
        profilesData.forEach(profile => {
          profileMap.set(profile.id, profile["Full Name"]);
        });
      }

      // Combine the messages with sender names
      const messagesWithNames = data.map(msg => ({
        ...msg,
        sender_name: profileMap.get(msg.sender_id) || "Unbekannter Nutzer"
      }));

      setMessages(messagesWithNames);
      
      // Mark messages as read
      const unreadMsgIds = data
        .filter(msg => msg.recipient_id === user.id && !msg.is_read)
        .map(msg => msg.id);
        
      if (unreadMsgIds.length > 0) {
        await supabase
          .from('supervisor_messages')
          .update({ is_read: true })
          .in('id', unreadMsgIds);
      }
      
      setIsLoading(false);
    };
    
    fetchMessages();
    
    // Subscribe to new messages
    const channel = supabase
      .channel('agent-chat-updates')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'supervisor_messages',
        filter: `recipient_id=eq.${user.id}` 
      }, async (payload) => {
        console.log('New chat message received:', payload);
        
        // Fetch the new message with sender info
        const { data: newMsg, error } = await supabase
          .from('supervisor_messages')
          .select('*')
          .eq('id', payload.new.id)
          .single();
          
        if (error || !newMsg) {
          console.error('Error getting new message details', error);
          return;
        }
        
        // Fetch sender name
        const { data: senderProfile } = await supabase
          .from('profiles')
          .select('"Full Name"')
          .eq('id', newMsg.sender_id)
          .single();
          
        // Add the new message to the state
        setMessages(prev => [...prev, {
          ...newMsg,
          sender_name: senderProfile ? senderProfile["Full Name"] : "Unbekannter Nutzer"
        }]);
        
        // Mark as read since chat is open
        await supabase
          .from('supervisor_messages')
          .update({ is_read: true })
          .eq('id', newMsg.id);
      })
      .subscribe();
      
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, toast]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !user?.id) return;
    
    try {
      // For demonstration, we'll send a message to ourselves if there's no previous message
      // In a real app, you'd have a way to determine the recipient
      
      // Find the other participant in the conversation
      let recipientId = user.id; // Default to self for testing
      
      // Try to find another user in previous messages
      const otherParticipant = messages.find(msg => 
        msg.sender_id !== user.id || msg.recipient_id !== user.id
      );
      
      if (otherParticipant) {
        recipientId = otherParticipant.sender_id === user.id 
          ? otherParticipant.recipient_id 
          : otherParticipant.sender_id;
      }
      
      console.log(`Sending message to: ${recipientId}`);
      
      const { data, error } = await supabase
        .from('supervisor_messages')
        .insert({
          content: newMessage.trim(),
          sender_id: user.id,
          recipient_id: recipientId,
          is_read: false
        })
        .select()
        .single();
        
      if (error) throw error;
      
      if (data) {
        // Add our own message to the messages array
        setMessages(prev => [...prev, {
          ...data,
          sender_name: user.role === 'admin' ? 'Admin' : user.email || 'You'
        }]);
      }
      
      setNewMessage('');
      
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        variant: "destructive",
        title: "Fehler",
        description: "Die Nachricht konnte nicht gesendet werden."
      });
    }
  };

  const toggleMinimize = () => {
    setIsMinimized(!isMinimized);
  };

  const formatMessageTime = (timestamp: string) => {
    return formatDistanceToNow(new Date(timestamp), { 
      addSuffix: true, 
      locale: de 
    });
  };

  return (
    <div className={`fixed bottom-4 right-4 w-80 z-50 shadow-lg transition-all duration-300 ${isMinimized ? 'h-12' : 'h-96'}`}>
      <Card className="h-full flex flex-col">
        <CardHeader className="p-3 flex flex-row items-center justify-between space-y-0 border-b">
          <CardTitle className="text-sm font-medium flex items-center">
            <MessageCircle className="h-4 w-4 mr-2" />
            Chat
          </CardTitle>
          <div className="flex items-center">
            <Button variant="ghost" size="sm" onClick={toggleMinimize} className="h-8 w-8 p-0">
              <MinusCircle className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        
        {!isMinimized && (
          <>
            <CardContent className="flex-1 overflow-auto p-3 space-y-4 flex flex-col">
              {isLoading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="animate-spin h-5 w-5 border-t-2 border-primary rounded-full" />
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  Keine Nachrichten vorhanden.<br/>
                  Schreibe eine Nachricht, um zu beginnen.
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((message) => (
                    <div 
                      key={message.id}
                      className={`flex ${message.sender_id === user?.id ? 'justify-end' : 'justify-start'}`}
                    >
                      <div 
                        className={`max-w-[80%] rounded-lg p-3 ${
                          message.sender_id === user?.id 
                            ? 'bg-primary text-primary-foreground' 
                            : 'bg-muted'
                        }`}
                      >
                        {message.sender_id !== user?.id && (
                          <div className="text-xs font-medium mb-1">
                            {message.sender_name || "Supervisor"}
                          </div>
                        )}
                        <div className="text-sm break-words">{message.content}</div>
                        <div className="text-xs mt-1 opacity-70">
                          {formatMessageTime(message.created_at)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div ref={messagesEndRef} />
            </CardContent>
            
            <div className="p-3 border-t">
              <div className="flex">
                <Textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Nachricht schreiben..."
                  className="min-h-8 text-sm resize-none"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                />
                <Button 
                  size="icon"
                  className="ml-2"
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim()}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        )}
      </Card>
    </div>
  );
};

export default AgentChatPopup;
