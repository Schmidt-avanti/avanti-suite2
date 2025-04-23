
import React from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, AlertCircle, RefreshCw } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { WhatsappChat } from "@/hooks/useWhatsappChats";
import { Button } from "@/components/ui/button";

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
          className={`flex items-center gap-3 text-left p-4 hover:bg-gray-100 transition rounded-xl
            ${chat.id === selectedChatId ? "bg-green-50 border border-green-200" : ""}
          `}
          onClick={() => onSelectChat(chat)}
          style={{ borderRadius: "1rem" }}
        >
          <Avatar className="h-10 w-10 bg-green-100 text-green-800">
            <AvatarFallback>{chat.contact_name.charAt(0)}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-center">
              <span className="font-semibold truncate">{chat.contact_name}</span>
              <span className="text-xs text-gray-400">
                {chat.last_message_time ? new Date(chat.last_message_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ""}
              </span>
            </div>
            <p className="text-sm text-gray-600 truncate">{chat.last_message || "–"}</p>
          </div>
          {chat.unread_count > 0 && (
            <Badge className="bg-green-500 text-white">{chat.unread_count}</Badge>
          )}
        </button>
      ))}
    </div>
  );
};

export default ChatList;
