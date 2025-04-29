
import React, { useState } from 'react';
import { CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Send, Loader2, AlertTriangle } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { SpellChecker } from '@/components/ui/spell-checker';

interface EmailReplyPanelProps {
  taskId: string;
  replyTo: string;
  setReplyTo: (email: string) => void;
}

export const EmailReplyPanel: React.FC<EmailReplyPanelProps> = ({ taskId, replyTo, setReplyTo }) => {
  const [replyBody, setReplyBody] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  const handleSendEmail = async () => {
    if (!replyBody) {
      toast({
        variant: 'destructive',
        title: 'Fehler',
        description: 'Bitte Nachricht angeben.'
      });
      return;
    }

    try {
      setIsSending(true);
      setSendError(null);
      
      const { data, error } = await supabase.functions.invoke('send-reply-email', {
        body: {
          task_id: taskId,
          recipient_email: replyTo,
          subject: null, // Let the backend use the default subject based on task
          body: replyBody
        }
      });

      if (error) {
        throw new Error(error.message || 'Fehler beim E-Mail Versand');
      }
      
      if (data?.error) {
        throw new Error(data.error);
      }

      toast({
        title: 'E-Mail gesendet',
        description: `Antwort an ${replyTo} wurde erfolgreich gesendet.`,
      });
      
      setReplyBody('');
      
    } catch (error: any) {
      console.error('Email sending error:', error);
      setSendError(error.message || 'Fehler beim E-Mail Versand');
      toast({
        variant: 'destructive',
        title: 'Fehler beim Senden',
        description: error.message || 'Fehler beim E-Mail Versand',
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <>
      <CardHeader className="p-0 pb-2 flex flex-row items-center border-none">
        <CardTitle className="text-xl font-semibold text-blue-900">
          E-Mail Antwort
        </CardTitle>
      </CardHeader>

      <div className="flex-1 flex flex-col justify-start mt-4">
        <label className="text-sm text-muted-foreground mb-1 font-medium">Empfänger</label>
        <input
          type="email"
          value={replyTo}
          onChange={(e) => setReplyTo(e.target.value)}
          className="w-full border border-gray-300 rounded-md px-4 py-2 text-sm mb-4 bg-white"
          disabled={isSending}
        />

        {sendError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm flex items-start">
            <AlertTriangle className="h-4 w-4 mt-0.5 mr-2 flex-shrink-0" />
            <div>
              <p className="font-medium">Fehler beim Senden</p>
              <p className="mt-1">{sendError}</p>
              <p className="mt-2 text-xs">
                Bitte stellen Sie sicher, dass die E-Mail-Adresse korrekt ist und dass in der SendGrid-Konfiguration 
                die Absender-E-Mail verifiziert wurde.
              </p>
            </div>
          </div>
        )}

        <textarea
          rows={12}
          placeholder="Antwort verfassen..."
          value={replyBody}
          onChange={(e) => setReplyBody(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 mb-4 bg-white"
          disabled={isSending}
        />
        
        {/* Spell checking tool - only display when there's text to check */}
        {replyBody.trim().length > 0 && (
          <div className="mb-4">
            <SpellChecker text={replyBody} onCorrect={setReplyBody} />
          </div>
        )}
        
        <Button
          className="w-fit bg-blue-600 hover:bg-blue-700 text-white self-start"
          onClick={handleSendEmail}
          disabled={isSending || !replyBody.trim()}
        >
          {isSending ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Senden...
            </>
          ) : (
            <>
              <Send className="h-4 w-4 mr-2" />
              Senden
            </>
          )}
        </Button>
      </div>
    </>
  );
};
