
import React from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { MessageSquare } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { WhatsappChat } from "@/hooks/useWhatsappChats";

type ChatListProps = {
  chats: WhatsappChat[];
  loading: boolean;
  onSelectChat: (chat: WhatsappChat) => void;
  selectedChatId?: string|null;
};

const ChatList: React.FC<ChatListProps> = ({ chats, loading, onSelectChat, selectedChatId }) => {
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
      <div className="text-center text-muted-foreground p-8">
        <MessageSquare className="h-8 w-8 mx-auto mb-2 text-gray-400" />
        <p>Keine WhatsApp-Chats vorhanden.</p>
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
