import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { AlertTriangle, Loader2, Paperclip, Mail, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";
import { SpellChecker } from '@/components/ui/spell-checker';
import { v4 as uuidv4 } from 'uuid';

interface EmailToCustomerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taskId: string;
  recipientEmail: string | undefined;
  taskMessages: any[] | null;
  onEmailSent: (emailDetails: { recipient: string, subject: string }) => void;
}

export function EmailToCustomerDialog({
  open,
  onOpenChange,
  taskId,
  recipientEmail,
  taskMessages,
  onEmailSent
}: EmailToCustomerDialogProps) {
  const [recipient, setRecipient] = useState(recipientEmail || "");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [includeHistory, setIncludeHistory] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  
  // Reset form when dialog opens/closes
  useEffect(() => {
    if (open) {
      setRecipient(recipientEmail || "");
      setSubject("");
      setBody("");
      setIncludeHistory(false);
      setAttachments([]);
      setError(null);
      setUploadProgress(0);
    }
  }, [open, recipientEmail]);
  
  const recipientMinLength = 5; // Basic validation for email (e.g., a@b.c)
  const subjectMinLength = 3;
  const bodyMinLength = 10;

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

  const addChatHistoryToBody = () => {
    if (includeHistory && taskMessages && taskMessages.length > 0) {
      // Include placeholder that will be replaced by the edge function
      // We handle the actual formatting on the server side
      return `${body}\n\n---------- Chat-Verlauf ----------`;
    }
    return body;
  };

  const uploadAttachments = async (): Promise<string[]> => {
    if (attachments.length === 0) return [];
    
    const uploadedUrls: string[] = [];
    let progressIncrement = 70 / attachments.length;
    
    try {
      for (let i = 0; i < attachments.length; i++) {
        const file = attachments[i];
        const fileExt = file.name.split('.').pop();
        const fileName = `${taskId}/${uuidv4()}.${fileExt}`;
        
        setUploadProgress(Math.round(progressIncrement * i));
        
        // Create email-attachments bucket if it doesn't exist
        try {
          const { data: bucketData, error: bucketError } = await supabase.storage
            .getBucket('email-attachments');
          
          // If bucket doesn't exist, create it
          if (bucketError && bucketError.message.includes('not found')) {
            await supabase.storage
              .createBucket('email-attachments', { public: true });
          }
        } catch (error) {
          console.error('Error checking or creating bucket:', error);
        }
        
        const { data, error } = await supabase.storage
          .from('email-attachments')
          .upload(fileName, file, {
            cacheControl: '3600',
            upsert: false
          });
        
        if (error) {
          console.error('Upload error:', error);
          throw new Error(`Failed to upload ${file.name}: ${error.message}`);
        }
        
        // Get public URL
        const { data: urlData } = supabase.storage
          .from('email-attachments')
          .getPublicUrl(fileName);
        
        uploadedUrls.push(urlData.publicUrl);
      }
      
      return uploadedUrls;
    } catch (error: any) {
      console.error('Error in uploadAttachments:', error);
      toast({
        variant: "destructive",
        title: "Fehler beim Hochladen der Anhänge",
        description: error.message || 'Unbekannter Fehler beim Hochladen',
      });
      return [];
    }
  };

  const handleSend = async () => {
    setError(null);
    
    // Validation
    if (!recipient || recipient.trim().length < recipientMinLength) {
      setError("Bitte geben Sie eine gültige E-Mail-Adresse ein.");
      return;
    }
    
    if (!subject || subject.trim().length < subjectMinLength) {
      setError("Bitte geben Sie einen Betreff ein.");
      return;
    }
    
    if (!body || body.trim().length < bodyMinLength) {
      setError("Bitte geben Sie eine Nachricht ein.");
      return;
    }

    try {
      setIsSending(true);
      
      // Upload attachments first
      setUploadProgress(5);
      console.log(`Uploading ${attachments.length} attachments...`);
      const attachmentUrls = await uploadAttachments();
      console.log(`Uploaded ${attachmentUrls.length} attachments successfully:`, attachmentUrls);
      
      setUploadProgress(80);
      
      // Prepare the email body with optional chat history
      const emailBody = addChatHistoryToBody();
      
      console.log('Sending email with body length:', emailBody.length);
      console.log('Attachment URLs:', attachmentUrls);
      
      // Send email via edge function
      const { data, error } = await supabase.functions.invoke('send-reply-email', {
        body: {
          task_id: taskId,
          recipient_email: recipient,
          subject: subject,
          body: emailBody,
          attachments: attachmentUrls
        }
      });
      
      setUploadProgress(100);

      if (error || data?.error) {
        console.error('Error response from function:', error || data?.error);
        throw new Error(error?.message || data?.error || 'Fehler beim Senden der E-Mail');
      }
      
      toast({
        title: 'E-Mail gesendet',
        description: `Die E-Mail wurde erfolgreich an ${recipient} gesendet.`,
      });
      
      // Notify parent component
      onEmailSent({ recipient, subject });
      
      // Close dialog
      handleClose();
      
    } catch (error: any) {
      console.error('Email sending error:', error);
      setError(error.message || 'Es ist ein Fehler aufgetreten. Bitte versuchen Sie es erneut.');
      
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>E-Mail an Kunde</DialogTitle>
          <DialogDescription>
            Senden Sie eine E-Mail direkt an den Kunden.
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4 space-y-4">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm flex items-start">
              <AlertTriangle className="h-4 w-4 mt-0.5 mr-2 flex-shrink-0" />
              <div>{error}</div>
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
              placeholder="kunde@beispiel.de"
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
            
            {/* ALWAYS show spell checking tool when there's text to check */}
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
                onClick={() => document.getElementById('file-upload')?.click()}
                disabled={isSending}
              >
                <Paperclip className="h-4 w-4 mr-2" />
                Datei hinzufügen
              </Button>
              <input
                id="file-upload"
                type="file"
                multiple
                onChange={handleFileChange}
                className="hidden"
                disabled={isSending}
              />
            </div>
            
            {attachments.length > 0 && (
              <div className="mt-3 space-y-2 bg-gray-50 p-3 rounded-md">
                <p className="text-sm text-muted-foreground font-medium">Anhänge ({attachments.length}):</p>
                <ul className="space-y-2">
                  {attachments.map((file, index) => (
                    <li key={index} className="text-sm flex justify-between items-center bg-white p-2 rounded border border-gray-200">
                      <span className="truncate flex-1">{file.name}</span>
                      <span className="text-gray-400 text-xs mr-3">({Math.round(file.size / 1024)} KB)</span>
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
          
          <div className="flex items-center space-x-2 pt-2">
            <input
              type="checkbox"
              id="include-history"
              checked={includeHistory}
              onChange={(e) => setIncludeHistory(e.target.checked)}
              disabled={isSending || !taskMessages || taskMessages.length === 0}
              className="rounded border-gray-300"
            />
            <Label
              htmlFor="include-history"
              className={`text-sm ${!taskMessages || taskMessages.length === 0 ? 'text-gray-400' : ''}`}
            >
              Chat-Verlauf in die E-Mail einfügen
            </Label>
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
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isSending}
          >
            Abbrechen
          </Button>
          <Button
            onClick={handleSend}
            disabled={isSending || !recipient || !subject || !body}
          >
            {isSending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Senden...
              </>
            ) : (
              <>
                <Mail className="h-4 w-4 mr-2" />
                Senden
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
