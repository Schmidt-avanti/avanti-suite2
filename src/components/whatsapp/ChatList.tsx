
import React from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, AlertCircle, RefreshCw } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { WhatsappChat } from "@/hooks/useWhatsappChats";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import { de } from "date-fns/locale";

type ChatListProps = {
  chats: WhatsappChat[];
  loading: boolean;
  onSelectChat: (chat: WhatsappChat) => void;
  selectedChatId?: string|null;
  onRefresh: () => void;
};

const ChatList: React.FC<ChatListProps> = ({ 
  chats, 
  loading, 
  onSelectChat, 
  selectedChatId,
  onRefresh
}) => {
  // Format in menschenlesbares Datum
  const formatLastMessageTime = (timestamp: string | null) => {
    if (!timestamp) return "";
    
    try {
      const date = new Date(timestamp);
      return formatDistanceToNow(date, { 
        addSuffix: true,
        locale: de 
      });
    } catch (err) {
      return "";
    }
  };
  
  // Funktion um Initialen zu erzeugen
  const getInitials = (name: string) => {
    if (!name) return "?";
    
    // Behandle WhatsApp-Nummern
    if (name.startsWith("whatsapp:")) {
      return "W";
    }

    // Ansonsten ersten Buchstaben nehmen oder Ersatz
    return name.charAt(0).toUpperCase() || "?";
  };

  // Funktion um einen lesbaren Namen zu erzeugen
  const getDisplayName = (chat: WhatsappChat) => {
    if (chat.contact_name.startsWith("whatsapp:")) {
      return chat.contact_number.replace("whatsapp:", "");
    }
    return chat.contact_name;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32 text-muted-foreground">
        <MessageSquare className="h-6 w-6 mr-2 animate-pulse" />
        Lade Chats…
      </div>
    );
  }

  if (chats.length === 0) {
    return (
      <div className="text-center text-muted-foreground p-8 flex flex-col items-center">
        <MessageSquare className="h-8 w-8 mx-auto mb-2 text-gray-400" />
        <p className="mb-2">Keine WhatsApp-Chats vorhanden.</p>
        
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mt-4 max-w-xs text-sm text-left">
          <div className="flex gap-2">
            <AlertCircle className="h-5 w-5 text-yellow-500 flex-shrink-0" />
            <div>
              <p className="font-medium text-yellow-800 mb-1">Hinweis zur Testumgebung</p>
              <p className="text-yellow-700">
                Sende zuerst eine Nachricht an die Twilio-Nummer mit dem Code "join company-conversation"
                und klicke dann auf "Aktualisieren".
              </p>
            </div>
          </div>
        </div>
        
        <Button 
          className="mt-4 flex items-center gap-2"
          onClick={onRefresh}
          variant="outline"
        >
          <RefreshCw className="h-4 w-4" />
          Aktualisieren
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col divide-y">
      {chats.map(chat => (
        <button
          key={chat.id}
          className={`flex items-center gap-3 text-left p-4 hover:bg-gray-100 transition
            ${chat.id === selectedChatId ? "bg-avanti-50 border border-avanti-200" : ""}
          `}
          onClick={() => onSelectChat(chat)}
          style={{ borderRadius: "0.75rem", margin: "2px" }}
        >
          <Avatar className={`h-10 w-10 ${chat.unread_count > 0 ? "bg-avanti-100 text-avanti-800" : "bg-gray-100 text-gray-700"}`}>
            <AvatarFallback>{getInitials(chat.contact_name)}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-center">
              <span className={`font-semibold truncate ${chat.unread_count > 0 ? "text-avanti-900" : ""}`}>
                {getDisplayName(chat)}
              </span>
              <span className="text-xs text-gray-400">
                {chat.last_message_time ? formatLastMessageTime(chat.last_message_time) : ""}
              </span>
            </div>
            <p className={`text-sm truncate ${chat.unread_count > 0 ? "text-avanti-800" : "text-gray-600"}`}>
              {chat.last_message || "–"}
            </p>
          </div>
          {chat.unread_count > 0 && (
            <Badge className="bg-avanti-600 text-white">{chat.unread_count}</Badge>
          )}
        </button>
      ))}
    </div>
  );
};

export default ChatList;
