
import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { send, Loader2, Paperclip, X, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";
import { SpellChecker } from "@/components/ui/spell-checker";
import { v4 as uuidv4 } from "uuid";
import { EmailThread } from "@/types";
import { Card } from "@/components/ui/card";
import { MessageSquare } from "lucide-react";

interface EmailReplyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taskId: string;
  thread: EmailThread | null;
  onEmailSent: () => void;
}

export function EmailReplyDialog({
  open,
  onOpenChange,
  taskId,
  thread,
  onEmailSent,
}: EmailReplyDialogProps) {
  const [recipient, setRecipient] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [sendError, setSendError] = useState<string | null>(null);

  // Reset form and prepopulate with thread data when dialog opens
  useEffect(() => {
    if (open && thread) {
      // Set recipient to the sender of the thread if it's inbound
      if (thread.direction === 'inbound') {
        setRecipient(thread.sender);
      }
      
      // Set subject with "Re:" prefix if needed
      let threadSubject = thread.subject || '';
      if (!threadSubject.startsWith('Re:') && threadSubject) {
        setSubject(`Re: ${threadSubject}`);
      } else {
        setSubject(threadSubject);
      }
      
      // Reset other fields
      setBody("");
      setAttachments([]);
      setSendError(null);
      setUploadProgress(0);
    }
  }, [open, thread]);

  const handleClose = () => {
    onOpenChange(false);
  };

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
    if (!body) {
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
          recipient_email: recipient,
          subject: subject || null,
          body: body,
          attachments: attachmentUrls,
          // Pass the thread ID to maintain thread relationship
          reply_to_thread_id: thread?.id || null
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
        description: `Antwort an ${recipient} wurde erfolgreich gesendet.`,
      });
      
      // Close dialog and notify parent component
      handleClose();
      onEmailSent();
      
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
        description: 'E-Mail konnte nicht gesendet werden. Details finden Sie im Dialog.',
      });
    } finally {
      setIsSending(false);
      setUploadProgress(0);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>E-Mail Antwort</DialogTitle>
          {thread && (
            <DialogDescription>
              Antwort auf E-Mail von {thread.sender}
            </DialogDescription>
          )}
        </DialogHeader>

        <div className="py-4 space-y-4">
          {/* Thread indicator */}
          {thread && (
            <Card className="bg-blue-50 border-blue-200">
              <div className="p-3 flex items-center">
                <MessageSquare className="h-4 w-4 mr-2 text-blue-600" />
                <span className="text-sm font-medium text-blue-700">
                  Antwort auf E-Mail von {thread.sender}
                </span>
              </div>
            </Card>
          )}

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

          <div className="space-y-2">
            <Label htmlFor="email-recipient">
              Empfänger <span className="text-red-500">*</span>
            </Label>
            <Input
              id="email-recipient"
              type="email"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder="empfänger@beispiel.de"
              disabled={isSending}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email-subject">
              Betreff <span className="text-red-500">*</span>
            </Label>
            <Input
              id="email-subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Betreff der E-Mail"
              disabled={isSending}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email-body">
              Nachricht <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="email-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Geben Sie hier Ihre Nachricht ein..."
              className="min-h-[150px]"
              disabled={isSending}
            />

            {body.trim().length > 0 && (
              <div className="mt-2">
                <SpellChecker text={body} onCorrect={setBody} />
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="attachments">Anhänge</Label>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => document.getElementById("dialog-file-upload")?.click()}
                disabled={isSending}
              >
                <Paperclip className="h-4 w-4 mr-2" />
                Datei hinzufügen
              </Button>
              <input
                id="dialog-file-upload"
                type="file"
                multiple
                onChange={handleFileChange}
                className="hidden"
                disabled={isSending}
              />
            </div>

            {attachments.length > 0 && (
              <div className="mt-3 space-y-2 bg-gray-50 p-3 rounded-md">
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
        </div>

        {uploadProgress > 0 && (
          <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            ></div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isSending}>
            Abbrechen
          </Button>
          <Button
            onClick={handleSendEmail}
            disabled={isSending || !recipient || !body}
          >
            {isSending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Senden...
              </>
            ) : (
              <>
                <send className="h-4 w-4 mr-2" />
                Senden
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
