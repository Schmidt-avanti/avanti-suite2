
import React, { useEffect, useState } from "react";
import { MessageSquare, User, Phone, Calendar } from "lucide-react";
import { useWhatsappAccounts } from "@/hooks/useWhatsappAccounts";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Loader2 } from "lucide-react";

const WhatsappPage: React.FC = () => {
  const { accounts, loading } = useWhatsappAccounts();
  const [activeTab, setActiveTab] = useState<string>("all");

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 text-muted-foreground animate-spin" />
        <span className="ml-2 text-muted-foreground">Lade WhatsApp Konten...</span>
      </div>
    );
  }

  if (accounts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full w-full text-center py-8">
        <div className="flex flex-col items-center gap-4">
          <div className="bg-green-100 rounded-full p-4 mb-2">
            <MessageSquare className="w-10 h-10 text-green-600" />
          </div>
          <h1 className="text-2xl font-semibold text-gray-800">WhatsApp Integration</h1>
          <p className="text-base text-gray-600 max-w-lg">
            Hier kannst du in Zukunft alle angebundenen WhatsApp-Chats verschiedener Firmen zentral einsehen und beantworten.
          </p>
          <div className="mt-6 bg-white rounded-2xl border border-gray-100 shadow-soft p-8 min-h-[120px] flex items-center justify-center w-full max-w-md">
            <span className="text-gray-400">Noch keine Chats verbunden.<br/>Integration & Chat-Übersicht folgen.</span>
          </div>
        </div>
      </div>
    );
  }

  // Dummy Chats für die Vorschau (in der realen Implementierung würden diese von der API kommen)
  const dummyChats = [
    {
      id: "1",
      name: "Max Mustermann",
      lastMessage: "Vielen Dank für die Hilfe!",
      time: "10:45",
      unread: 0,
      accountId: accounts[0]?.id
    },
    {
      id: "2",
      name: "Laura Schmidt",
      lastMessage: "Ich habe eine Frage zu meiner Bestellung...",
      time: "Gestern",
      unread: 2,
      accountId: accounts[0]?.id
    },
    {
      id: "3",
      name: "Thomas Weber",
      lastMessage: "Können Sie mir mit einem Problem helfen?",
      time: "Gestern",
      unread: 1,
      accountId: accounts[0]?.id
    }
  ];

  return (
    <div className="container mx-auto p-6">
      <Card className="border shadow-sm rounded-2xl">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl font-semibold flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-green-600" />
              WhatsApp Chat-Übersicht
            </CardTitle>
            <Badge variant="outline" className="bg-green-50 text-green-700 hover:bg-green-100">
              {accounts.length} {accounts.length === 1 ? 'Konto' : 'Konten'} verbunden
            </Badge>
          </div>
        </CardHeader>

        <CardContent>
          <Tabs defaultValue="all" className="w-full" onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="all">Alle Chats</TabsTrigger>
              {accounts.map(account => (
                <TabsTrigger key={account.id} value={account.id}>
                  {account.name || account.pphone_number || "Konto"}
                </TabsTrigger>
              ))}
            </TabsList>
            
            <TabsContent value="all" className="space-y-4">
              {dummyChats.length > 0 ? (
                <div className="bg-white rounded-xl border">
                  {dummyChats.map((chat, idx) => (
                    <React.Fragment key={chat.id}>
                      <div className="p-4 hover:bg-gray-50 cursor-pointer">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10 bg-green-100 text-green-800">
                            <AvatarFallback>{chat.name.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="flex justify-between items-center">
                              <span className="font-medium">{chat.name}</span>
                              <span className="text-xs text-gray-500">{chat.time}</span>
                            </div>
                            <p className="text-sm text-gray-600 truncate">{chat.lastMessage}</p>
                          </div>
                          {chat.unread > 0 && (
                            <Badge className="bg-green-500">{chat.unread}</Badge>
                          )}
                        </div>
                      </div>
                      {idx < dummyChats.length - 1 && <Separator />}
                    </React.Fragment>
                  ))}
                </div>
              ) : (
                <div className="text-center p-8 bg-gray-50 rounded-xl border">
                  <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <h3 className="text-lg font-medium">Keine Chats vorhanden</h3>
                  <p className="text-gray-500 max-w-md mx-auto mt-1">
                    Es wurden noch keine WhatsApp-Nachrichten empfangen. Sobald Kunden Ihr WhatsApp-Konto kontaktieren, erscheinen die Chats hier.
                  </p>
                </div>
              )}
            </TabsContent>
            
            {accounts.map(account => (
              <TabsContent key={account.id} value={account.id} className="space-y-4">
                <div className="bg-white p-4 rounded-xl border mb-4">
                  <div className="flex items-center gap-4">
                    <div className="bg-green-100 rounded-full p-3">
                      <Phone className="h-6 w-6 text-green-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium">{account.name || "Unbenanntes Konto"}</h3>
                      <p className="text-sm text-gray-600">{account.pphone_number || "Keine Nummer hinterlegt"}</p>
                    </div>
                    <Badge variant={account.status === "active" ? "default" : "outline"}>
                      {account.status === "active" ? "Aktiv" : account.status}
                    </Badge>
                  </div>
                </div>
                
                {dummyChats
                  .filter(chat => chat.accountId === account.id)
                  .length > 0 ? (
                  <div className="bg-white rounded-xl border">
                    {dummyChats
                      .filter(chat => chat.accountId === account.id)
                      .map((chat, idx, filteredChats) => (
                        <React.Fragment key={chat.id}>
                          <div className="p-4 hover:bg-gray-50 cursor-pointer">
                            <div className="flex items-center gap-3">
                              <Avatar className="h-10 w-10 bg-green-100 text-green-800">
                                <AvatarFallback>{chat.name.charAt(0)}</AvatarFallback>
                              </Avatar>
                              <div className="flex-1">
                                <div className="flex justify-between items-center">
                                  <span className="font-medium">{chat.name}</span>
                                  <span className="text-xs text-gray-500">{chat.time}</span>
                                </div>
                                <p className="text-sm text-gray-600 truncate">{chat.lastMessage}</p>
                              </div>
                              {chat.unread > 0 && (
                                <Badge className="bg-green-500">{chat.unread}</Badge>
                              )}
                            </div>
                          </div>
                          {idx < filteredChats.length - 1 && <Separator />}
                        </React.Fragment>
                      ))}
                  </div>
                ) : (
                  <div className="text-center p-8 bg-gray-50 rounded-xl border">
                    <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <h3 className="text-lg font-medium">Keine Chats vorhanden</h3>
                    <p className="text-gray-500 max-w-md mx-auto mt-1">
                      Für dieses Konto wurden noch keine WhatsApp-Nachrichten empfangen.
                    </p>
                  </div>
                )}
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>

      <div className="mt-4 text-center text-sm text-gray-500">
        <p className="flex items-center justify-center gap-1">
          <Calendar className="h-3 w-3" />
          <span>Diese Ansicht zeigt Beispiel-Chats zu Demonstrationszwecken.</span>
        </p>
      </div>
    </div>
  );
};

export default WhatsappPage;
