
import { useState, useRef, useEffect } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { UserSelect } from "./UserSelect";

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  message: string;
  timestamp: string;
  read_status: boolean;
  senderName?: string;
}

interface User {
  id: string;
  fullName: string;
  role: string;
}

export function UserChat() {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  // Lade Benutzer beim ersten Render
  useEffect(() => {
    fetchUsers();
  }, []);

  // Lade Nachrichten und abonniere Updates, wenn ein Benutzer ausgewählt wird
  useEffect(() => {
    if (selectedUserId) {
      fetchMessages();
      const subscription = subscribeToMessages();
      return () => {
        if (subscription) supabase.removeChannel(subscription);
      };
    }
  }, [selectedUserId]);

  // Scroll zum Ende der Nachrichtenliste, wenn neue Nachrichten hinzukommen
  useEffect(() => {
    if (scrollRef.current) {
      const scrollArea = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollArea) {
        scrollArea.scrollTop = scrollArea.scrollHeight;
      }
    }
  }, [messages]);

  const fetchUsers = async () => {
    try {
      setLoadingUsers(true);
      if (!user) return;
      
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id, "Full Name", role')
        .eq('is_active', true)
        .neq('id', user.id);

      if (error) throw error;

      if (profiles) {
        const formattedUsers = profiles.map(p => ({
          id: p.id,
          fullName: p["Full Name"],
          role: p.role
        }));
        setUsers(formattedUsers);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        variant: "destructive",
        title: "Fehler beim Laden der Benutzer",
        description: "Die Benutzerliste konnte nicht geladen werden."
      });
    } finally {
      setLoadingUsers(false);
    }
  };

  const fetchMessages = async () => {
    if (!selectedUserId || !user) return;

    try {
      setLoading(true);
      
      // Hole Nachrichten zwischen dem aktuellen Benutzer und dem ausgewählten Benutzer
      const { data, error } = await supabase
        .from('user_chats')
        .select(`
          *,
          sender:profiles!user_chats_sender_id_fkey("Full Name")
        `)
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${selectedUserId}),and(sender_id.eq.${selectedUserId},receiver_id.eq.${user.id})`)
        .order('timestamp', { ascending: true });

      if (error) throw error;

      if (data) {
        setMessages(data.map(msg => ({
          ...msg,
          senderName: msg.sender["Full Name"]
        })));
        
        // Markiere empfangene Nachrichten als gelesen
        await markMessagesAsRead();
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
      toast({
        variant: "destructive",
        title: "Fehler beim Laden der Nachrichten",
        description: "Die Nachrichten konnten nicht geladen werden."
      });
    } finally {
      setLoading(false);
    }
  };

  const subscribeToMessages = () => {
    if (!user || !selectedUserId) return null;

    const channel = supabase
      .channel('user-chat')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'user_chats',
        filter: `receiver_id=eq.${user.id}`
      }, payload => {
        if (payload.new.sender_id === selectedUserId) {
          fetchMessages();
        }
      })
      .subscribe();

    return channel;
  };

  const markMessagesAsRead = async () => {
    if (!selectedUserId || !user) return;
    
    try {
      // Markiere alle Nachrichten vom ausgewählten Benutzer an den aktuellen Benutzer als gelesen
      const { error } = await supabase
        .from('user_chats')
        .update({ read_status: true })
        .eq('sender_id', selectedUserId)
        .eq('receiver_id', user.id)
        .eq('read_status', false);

      if (error) throw error;
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || !selectedUserId || !user) return;
    setLoading(true);

    try {
      const { error } = await supabase
        .from('user_chats')
        .insert({
          sender_id: user.id,
          receiver_id: selectedUserId,
          message: input.trim()
        });

      if (error) throw error;

      setInput('');
      await fetchMessages();
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        variant: "destructive",
        title: "Fehler beim Senden",
        description: "Die Nachricht konnte nicht gesendet werden."
      });
    } finally {
      setLoading(false);
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex flex-col h-full space-y-4">
      <UserSelect
        users={users}
        selectedUserId={selectedUserId}
        onUserSelect={setSelectedUserId}
      />

      {selectedUserId ? (
        <>
          <ScrollArea className="flex-1" ref={scrollRef}>
            <div className="space-y-4 p-4">
              {loading && messages.length === 0 ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                </div>
              ) : messages.length > 0 ? (
                messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.sender_id === user?.id ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-xl px-4 py-2 ${
                        message.sender_id === user?.id
                          ? 'bg-blue-500 text-white ml-12'
                          : 'bg-gray-100 text-gray-900 mr-12'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium">
                          {message.senderName}
                        </span>
                        <span className="text-xs opacity-70">
                          {formatTimestamp(message.timestamp)}
                        </span>
                      </div>
                      <p className="text-sm">{message.message}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-10 text-muted-foreground">
                  Keine Nachrichten in diesem Chat. Schreibe etwas, um die Konversation zu beginnen!
                </div>
              )}
            </div>
          </ScrollArea>

          <div className="p-4 border-t bg-white">
            <div className="flex gap-2">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Deine Nachricht..."
                className="flex-1 resize-none border-gray-200 min-h-[44px]"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
              />
              <Button
                onClick={sendMessage}
                disabled={!input.trim() || loading}
                className="self-end bg-blue-500 hover:bg-blue-600"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </>
      ) : (
        <div className="flex-1 flex items-center justify-center p-6 text-center text-muted-foreground">
          Wähle eine:n Kolleg:in aus, um den Chat zu starten
        </div>
      )}
    </div>
  );
}
