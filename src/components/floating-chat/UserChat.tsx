
import { useState, useRef, useEffect } from "react";
import { Send, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/components/ui/use-toast";
import { UserSelect } from "./UserSelect";
import { toast as sonnerToast } from "sonner";

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
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const { toast } = useToast();
  
  // 1. Lade Benutzer beim ersten Render
  useEffect(() => {
    fetchUsers();
  }, []);

  // 2. Lade Nachrichten und abonniere Updates, wenn ein Benutzer ausgewählt wird
  useEffect(() => {
    if (selectedUserId) {
      setLoadingMessages(true);
      setMessages([]); // Nachrichten zurücksetzen
      fetchMessages().catch(err => {
        console.error("Fehler beim Laden der Nachrichten:", err);
        setError("Fehler beim Laden der Nachrichten. Bitte versuchen Sie es später erneut.");
        setLoadingMessages(false);
      });
      
      const subscription = subscribeToMessages();
      return () => {
        if (subscription) supabase.removeChannel(subscription);
      };
    }
  }, [selectedUserId]);

  // 3. Scroll zum Ende der Nachrichtenliste, wenn neue Nachrichten hinzukommen
  useEffect(() => {
    if (scrollRef.current && !loadingMessages) {
      setTimeout(() => {
        const scrollArea = scrollRef.current?.querySelector('[data-radix-scroll-area-viewport]');
        if (scrollArea) {
          scrollArea.scrollTop = scrollArea.scrollHeight;
        }
      }, 100);
    }
  }, [messages, loadingMessages]);

  const fetchUsers = async () => {
    try {
      setError(null);
      setLoadingUsers(true);
      
      if (!user) {
        setLoadingUsers(false);
        return;
      }
      
      console.log("Lade Benutzer...");
      
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id, "Full Name", role')
        .eq('is_active', true)
        .neq('id', user.id);

      if (error) {
        console.error('Fehler beim Laden der Benutzer:', error);
        throw error;
      }

      if (profiles && Array.isArray(profiles)) {
        console.log(`${profiles.length} Benutzer geladen`);
        const formattedUsers = profiles.map(p => ({
          id: p.id,
          fullName: p["Full Name"] || "Unbekannter Nutzer",
          role: p.role || "Unbekannt"
        }));
        setUsers(formattedUsers);
      } else {
        console.log("Keine Benutzer gefunden oder ungültiges Format");
        setUsers([]);
      }
    } catch (error: any) {
      console.error('Error fetching users:', error);
      setError("Fehler beim Laden der Benutzer: " + (error.message || "Unbekannter Fehler"));
      sonnerToast.error("Fehler beim Laden der Benutzer", {
        description: "Die Benutzerliste konnte nicht geladen werden."
      });
    } finally {
      setLoadingUsers(false);
    }
  };

  const fetchMessages = async () => {
    if (!selectedUserId || !user) {
      setLoadingMessages(false);
      return;
    }

    try {
      setError(null);
      console.log(`Lade Nachrichten für Chat mit Benutzer ${selectedUserId}`);
      
      // Hole Nachrichten zwischen dem aktuellen Benutzer und dem ausgewählten Benutzer
      const { data, error } = await supabase
        .from('user_chats')
        .select(`
          *,
          sender:profiles!user_chats_sender_id_fkey("Full Name")
        `)
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${selectedUserId}),and(sender_id.eq.${selectedUserId},receiver_id.eq.${user.id})`)
        .order('timestamp', { ascending: true });

      if (error) {
        console.error('Fehler beim Laden der Nachrichten:', error);
        throw error;
      }

      if (data && Array.isArray(data)) {
        console.log(`${data.length} Nachrichten geladen`);
        setMessages(data.map(msg => ({
          ...msg,
          senderName: msg.sender && msg.sender["Full Name"] ? msg.sender["Full Name"] : "Unbekannter Nutzer"
        })));
        
        // Markiere empfangene Nachrichten als gelesen
        await markMessagesAsRead();
      } else {
        console.log("Keine Nachrichten gefunden oder ungültiges Format");
        setMessages([]);
      }
    } catch (error: any) {
      console.error('Error fetching messages:', error);
      setError("Fehler beim Laden der Nachrichten: " + (error.message || "Unbekannter Fehler"));
      sonnerToast.error("Fehler beim Laden der Nachrichten", {
        description: "Die Nachrichten konnten nicht geladen werden."
      });
      throw error;
    } finally {
      setLoadingMessages(false);
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
        if (payload.new && payload.new.sender_id === selectedUserId) {
          fetchMessages().catch(console.error);
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

      if (error) {
        console.error('Fehler beim Markieren der Nachrichten als gelesen:', error);
      }
    } catch (error: any) {
      console.error('Error marking messages as read:', error);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || !selectedUserId || !user) return;
    setLoading(true);

    try {
      const messageData = {
        sender_id: user.id,
        receiver_id: selectedUserId,
        message: input.trim(),
        timestamp: new Date().toISOString(),
        read_status: false
      };
      
      const { error } = await supabase
        .from('user_chats')
        .insert(messageData);

      if (error) {
        console.error('Fehler beim Senden der Nachricht:', error);
        throw error;
      }

      setInput('');
      await fetchMessages();
    } catch (error: any) {
      console.error('Error sending message:', error);
      sonnerToast.error("Fehler beim Senden", {
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

  const handleUserSelect = (userId: string) => {
    console.log("Benutzer ausgewählt:", userId);
    setSelectedUserId(userId);
    setMessages([]);
    setLoadingMessages(true);
  };

  return (
    <div className="flex flex-col h-full space-y-4 p-4">
      <UserSelect
        users={users}
        selectedUserId={selectedUserId}
        onUserSelect={handleUserSelect}
        isLoading={loadingUsers}
      />

      {error && (
        <Alert variant="destructive" className="mt-2 py-2">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {selectedUserId ? (
        <>
          <ScrollArea className="flex-1 bg-gray-50 rounded-xl shadow-inner" ref={scrollRef}>
            <div className="space-y-4 p-4">
              {loadingMessages ? (
                <div className="flex justify-center py-8">
                  <div className="flex flex-col items-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mb-2"></div>
                    <span className="text-sm text-gray-500">Nachrichten werden geladen...</span>
                  </div>
                </div>
              ) : messages.length > 0 ? (
                messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.sender_id === user?.id ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-xl px-4 py-2 shadow-sm ${
                        message.sender_id === user?.id
                          ? 'bg-blue-500 text-white'
                          : 'bg-white text-gray-900'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs font-medium ${message.sender_id === user?.id ? 'text-blue-50' : 'text-gray-700'}`}>
                          {message.senderName}
                        </span>
                        <span className={`text-xs ${message.sender_id === user?.id ? 'text-blue-100' : 'text-gray-500'}`}>
                          {formatTimestamp(message.timestamp)}
                        </span>
                      </div>
                      <p className="text-sm whitespace-pre-wrap break-words">{message.message}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-10 text-muted-foreground">
                  Noch keine Nachrichten in diesem Chat. Schreibe etwas, um die Konversation zu beginnen!
                </div>
              )}
            </div>
          </ScrollArea>

          <div className="bg-white rounded-xl shadow-sm p-3">
            <div className="flex gap-2">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Deine Nachricht..."
                className="flex-1 resize-none border-gray-200 min-h-[44px] rounded-xl"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if (!loading && input.trim()) {
                      sendMessage();
                    }
                  }
                }}
                disabled={loading}
              />
              <Button
                onClick={sendMessage}
                disabled={!input.trim() || loading}
                className="self-end bg-blue-500 hover:bg-blue-600 rounded-xl"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </>
      ) : (
        <div className="flex-1 flex items-center justify-center p-6 text-center text-muted-foreground bg-gray-50 rounded-xl">
          Wähle eine:n Kolleg:in aus, um den Chat zu starten
        </div>
      )}
    </div>
  );
}
