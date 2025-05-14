
import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { formatDistanceToNow } from "date-fns";
import { de } from "date-fns/locale";
import { ArrowDownLeft, ArrowUpRight, Paperclip } from "lucide-react";
import { EmailThread } from "@/types";
import { Separator } from "@/components/ui/separator";

interface EmailThreadHistoryProps {
  threads: EmailThread[];
}

export const EmailThreadHistory: React.FC<EmailThreadHistoryProps> = ({ threads }) => {
  if (!threads || threads.length === 0) {
    return (
      <Card className="bg-white rounded-lg shadow-sm p-4 mb-4">
        <CardContent className="p-2 text-center text-gray-500">
          Keine E-Mail-Historie vorhanden
        </CardContent>
      </Card>
    );
  }

  // Sort threads by created_at in descending order (newest first)
  const sortedThreads = [...threads].sort((a, b) => 
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium mb-2">E-Mail-Verlauf</h3>
      
      <div className="space-y-3">
        {sortedThreads.map((thread, index) => (
          <Card key={thread.id} className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="flex items-center p-3 bg-gray-50 border-b border-gray-100">
              <div className="flex items-center">
                {thread.direction === 'inbound' ? (
                  <ArrowDownLeft className="h-4 w-4 mr-2 text-blue-500" />
                ) : (
                  <ArrowUpRight className="h-4 w-4 mr-2 text-green-500" />
                )}
                <span className={`text-sm font-medium ${thread.direction === 'inbound' ? 'text-blue-600' : 'text-green-600'}`}>
                  {thread.direction === 'inbound' ? 'Eingehend' : 'Ausgehend'}
                </span>
              </div>
              <span className="mx-2 text-gray-300">•</span>
              <span className="text-sm text-gray-500">
                {formatDistanceToNow(new Date(thread.created_at), { addSuffix: true, locale: de })}
              </span>
            </div>
            
            <CardContent className="p-4">
              <div className="mb-3">
                <div className="flex justify-between flex-wrap gap-2">
                  <div>
                    <div className="text-sm font-medium">Von: {thread.sender}</div>
                    <div className="text-sm text-gray-500 mt-1">An: {thread.recipient}</div>
                  </div>
                  {thread.subject && (
                    <div className="text-sm font-medium text-gray-700">
                      Betreff: {thread.subject}
                    </div>
                  )}
                </div>
              </div>
              
              <Separator className="my-3" />
              
              <div className="text-sm whitespace-pre-wrap text-gray-700 break-words">
                {thread.content}
              </div>
              
              {thread.attachments && thread.attachments.length > 0 && (
                <div className="mt-4">
                  <div className="text-sm font-medium text-gray-500 mb-2 flex items-center">
                    <Paperclip className="h-4 w-4 mr-1" />
                    <span>Anhänge ({thread.attachments.length})</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {thread.attachments.map((url, i) => {
                      const filename = url.split('/').pop() || `Anhang ${i + 1}`;
                      return (
                        <a
                          key={i}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded text-sm text-blue-600"
                        >
                          <Paperclip className="h-3 w-3 mr-1.5 flex-shrink-0" />
                          <span className="truncate max-w-[150px]">{filename}</span>
                        </a>
                      );
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
