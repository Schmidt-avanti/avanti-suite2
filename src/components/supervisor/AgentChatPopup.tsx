
import React, { useState, useEffect } from 'react';
import { X, MinusCircle, Send, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface Message {
  id: string;
  content: string;
  sender_id: string;
  recipient_id: string;
  created_at: string;
  is_read: boolean;
  sender_name?: string; // Optional field for sender name
}

interface AgentChatPopupProps {
  onClose: () => void;
}

const AgentChatPopup: React.FC<AgentChatPopupProps> = ({ onClose }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isMinimized, setIsMinimized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  // Load messages on component mount
  useEffect(() => {
    if (!user?.id) return;
    
    const fetchMessages = async () => {
      setIsLoading(true);
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

      // Then fetch profiles separately to get sender names
      if (data && data.length > 0) {
        const senderIds = data.map(msg => msg.sender_id)
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
        const messagesWithSenderNames = data.map(msg => ({
          ...msg,
          sender_name: profileMap.get(msg.sender_id) || "Unbekannter Nutzer"
        }));

        setMessages(messagesWithSenderNames);
        
        // Mark messages as read
        const unreadMsgIds = data
          ?.filter(msg => msg.recipient_id === user.id && !msg.is_read)
          .map(msg => msg.id) || [];
          
        if (unreadMsgIds.length > 0) {
          await supabase
            .from('supervisor_messages')
            .update({ is_read: true })
            .in('id', unreadMsgIds);
        }
      } else {
        setMessages([]);
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
        // Fetch the new message with sender info
        const { data: newMsg, error } = await supabase
          .from('supervisor_messages')
          .select('*')
          .eq('id', payload.new.id)
          .single();
          
        if (!error && newMsg) {
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
        }
      })
      .subscribe();
      
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, toast]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !user?.id) return;
    
    try {
      // Find the supervisor who sent the most recent message
      const supervisors = messages
        .filter(msg => msg.recipient_id === user.id)
        .map(msg => msg.sender_id);
        
      const lastSupervisorId = supervisors[supervisors.length - 1];
      
      if (!lastSupervisorId) {
        toast({
          variant: "destructive",
          title: "Fehler",
          description: "Kein Supervisor gefunden, um zu antworten."
        });
        return;
      }
      
      const { error } = await supabase
        .from('supervisor_messages')
        .insert({
          content: newMessage.trim(),
          sender_id: user.id,
          recipient_id: lastSupervisorId,
          is_read: false
        });
        
      if (error) throw error;
      
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

  return (
    <div className={`fixed bottom-4 right-4 w-80 z-50 shadow-lg transition-all duration-300 ${isMinimized ? 'h-12' : 'h-96'}`}>
      <Card className="h-full flex flex-col">
        <CardHeader className="p-3 flex flex-row items-center justify-between space-y-0 border-b">
          <CardTitle className="text-sm font-medium flex items-center">
            <MessageCircle className="h-4 w-4 mr-2" />
            Supervisor Chat
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
                  Keine Nachrichten vorhanden
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
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
            
            <div className="p-3 border-t">
              <div className="flex">
                <Textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Antworten..."
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
