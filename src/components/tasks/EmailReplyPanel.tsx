
import React, { useState, useEffect } from 'react';
import { CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Send, Loader2, AlertTriangle, Paperclip, X, MessageSquare } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { SpellChecker } from '@/components/ui/spell-checker';
import { v4 as uuidv4 } from "uuid";
import { EmailThread } from '@/types';
import { Card } from "@/components/ui/card";

interface EmailReplyPanelProps {
  taskId: string;
  replyTo: string;
  setReplyTo: (email: string) => void;
  activeThread?: EmailThread | null;
  clearActiveThread?: () => void;
}

export const EmailReplyPanel: React.FC<EmailReplyPanelProps> = ({ 
  taskId, 
  replyTo, 
  setReplyTo, 
  activeThread,
  clearActiveThread 
}) => {
  const [replyBody, setReplyBody] = useState('');
  const [subject, setSubject] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Set subject and recipient when activeThread changes
  useEffect(() => {
    if (activeThread) {
      // Extract the subject from the active thread
      let threadSubject = activeThread.subject || '';
      
      // If the subject doesn't already start with "Re:", add it
      if (!threadSubject.startsWith('Re:')) {
        setSubject(`Re: ${threadSubject}`);
      } else {
        setSubject(threadSubject);
      }
      
      // Set the recipient to the sender of the active thread
      if (activeThread.direction === 'inbound') {
        setReplyTo(activeThread.sender);
      }
    }
  }, [activeThread, setReplyTo]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const fileList = Array.from(e.target.files);
      setAttachments([...attachments, ...fileList]);
    }
  };

  const removeAttachment = (index: number) => {
    const newAttachments = [...attachments];
    newAttachments.splice(index, 1);
    setAttachments(newAttachments);
  };

  const uploadAttachments = async (): Promise<string[]> => {
    if (attachments.length === 0) return [];

    const uploadedUrls: string[] = [];
    let progressIncrement = 70 / attachments.length;

    try {
      for (let i = 0; i < attachments.length; i++) {
        const file = attachments[i];
        const fileExt = file.name.split(".").pop();
        const fileName = `${taskId}/${uuidv4()}.${fileExt}`;

        setUploadProgress(Math.round(progressIncrement * i));

        const { data, error } = await supabase.storage
          .from("email-attachments")
          .upload(fileName, file, {
            cacheControl: "3600",
            upsert: false,
          });

        if (error) {
          console.error("Upload error:", error);
          throw new Error(`Failed to upload ${file.name}: ${error.message}`);
        }

        // Get public URL
        const { data: urlData } = supabase.storage
          .from("email-attachments")
          .getPublicUrl(fileName);

        uploadedUrls.push(urlData.publicUrl);
      }

      return uploadedUrls;
    } catch (error: any) {
      console.error("Error in uploadAttachments:", error);
      toast({
        variant: "destructive",
        title: "Fehler beim Hochladen der Anhänge",
        description: error.message || "Unbekannter Fehler beim Hochladen",
      });
      return [];
    }
  };

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
      setUploadProgress(0);
      
      // Upload attachments if any
      let attachmentUrls: string[] = [];
      if (attachments.length > 0) {
        setUploadProgress(5);
        console.log(`Uploading ${attachments.length} attachments...`);
        attachmentUrls = await uploadAttachments();
        console.log(`Uploaded ${attachmentUrls.length} attachments successfully:`, attachmentUrls);
      }
      
      setUploadProgress(80);
      
      const { data, error } = await supabase.functions.invoke('send-reply-email', {
        body: {
          task_id: taskId,
          recipient_email: replyTo,
          subject: subject || null, // Use custom subject if available
          body: replyBody,
          attachments: attachmentUrls,
          // Add reply_to_thread_id if we're replying to a specific thread
          reply_to_thread_id: activeThread?.id || null
        }
      });

      setUploadProgress(100);

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
      setSubject('');
      setAttachments([]);
      setUploadProgress(0);
      
      // Clear active thread if present
      if (clearActiveThread) {
        clearActiveThread();
      }
      
    } catch (error: any) {
      console.error('Email sending error:', error);
      const errorMessage = error.message || 'Fehler beim E-Mail Versand';
      
      // More specific error handling
      let userErrorMessage = errorMessage;
      
      // Check for common SendGrid errors
      if (errorMessage.includes('verified Sender Identity') || errorMessage.includes('does not match a verified')) {
        userErrorMessage = 'Der Domain des Absenders ist nicht verifiziert. Bitte kontaktieren Sie den Administrator, um die SendGrid-Domain-Verifizierung zu überprüfen.';
      } else if (errorMessage.includes('rate limit')) {
        userErrorMessage = 'SendGrid Ratelimit erreicht. Bitte versuchen Sie es später erneut.';
      } else if (errorMessage.includes('blocked')) {
        userErrorMessage = 'Der Empfänger hat E-Mails von dieser Domain blockiert.';
      }
      
      setSendError(userErrorMessage);
      
      toast({
        variant: 'destructive',
        title: 'Fehler beim Senden',
        description: 'E-Mail konnte nicht gesendet werden. Details finden Sie im Formular.',
      });
    } finally {
      setIsSending(false);
      setUploadProgress(0);
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
        {/* Show active thread indicator if replying to a specific thread */}
        {activeThread && (
          <Card className="mb-4 bg-blue-50 border-blue-200">
            <div className="p-3 flex items-center justify-between">
              <div className="flex items-center">
                <MessageSquare className="h-4 w-4 mr-2 text-blue-600" />
                <span className="text-sm font-medium text-blue-700">
                  Antwort auf E-Mail von {activeThread.sender}
                </span>
              </div>
              {clearActiveThread && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={clearActiveThread}
                  className="h-7 w-7 p-0 rounded-full"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </Card>
        )}

        <label className="text-sm text-muted-foreground mb-1 font-medium">Empfänger</label>
        <input
          type="email"
          value={replyTo}
          onChange={(e) => setReplyTo(e.target.value)}
          className="w-full border border-gray-300 rounded-md px-4 py-2 text-sm mb-4 bg-white"
          disabled={isSending}
        />

        {/* Add subject field */}
        <label className="text-sm text-muted-foreground mb-1 font-medium">Betreff</label>
        <input
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
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
                die Domain (inbox.avanti.cx) korrekt verifiziert wurde. Ein Administrator kann dies in den SendGrid-Einstellungen prüfen.
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
        
        {/* Always show Spell checking tool when there's text */}
        {replyBody.trim().length > 0 && (
          <div className="mb-4">
            <SpellChecker text={replyBody} onCorrect={setReplyBody} />
          </div>
        )}
        
        {/* File attachment section */}
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => document.getElementById("file-upload-reply")?.click()}
              disabled={isSending}
              className="flex items-center text-sm"
            >
              <Paperclip className="h-4 w-4 mr-2" />
              Datei anhängen
            </Button>
            <input
              id="file-upload-reply"
              type="file"
              multiple
              onChange={handleFileChange}
              className="hidden"
              disabled={isSending}
            />
          </div>
          
          {attachments.length > 0 && (
            <div className="space-y-2 bg-gray-50 p-3 rounded-md">
              <p className="text-sm text-muted-foreground font-medium">
                Anhänge ({attachments.length}):
              </p>
              <ul className="space-y-2">
                {attachments.map((file, index) => (
                  <li
                    key={index}
                    className="text-sm flex justify-between items-center bg-white p-2 rounded border border-gray-200"
                  >
                    <span className="truncate flex-1">{file.name}</span>
                    <span className="text-gray-400 text-xs mr-3">
                      ({Math.round(file.size / 1024)} KB)
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeAttachment(index)}
                      disabled={isSending}
                      className="h-6 w-6 p-0 rounded-full"
                    >
                      <X className="h-4 w-4 text-gray-500" />
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        
        {uploadProgress > 0 && (
          <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            ></div>
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
