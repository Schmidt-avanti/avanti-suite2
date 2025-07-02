import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils'; // Added import for cn
import { useAuth } from '@/contexts/AuthContext';
import { Mail } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useTaskChatMessages } from '../../hooks/useTaskChatMessages';

interface TaskChatMessageProps {
  message: any;
  selectedOptions: Set<string>;
  onOptionSelect: (option: string) => void;
  taskId?: string;
  taskTitle?: string;
  readableId?: string;
  endkundeOrt?: string;
  isLastAssistantMessage?: boolean;
  isReadOnly?: boolean; // Added isReadOnly prop
  onSendMessage: (text: string) => void; // NEU
}

export const TaskChatMessage: React.FC<TaskChatMessageProps> = ({ 
  message, 
  selectedOptions, 
  onOptionSelect,
  taskId = "",
  taskTitle = "",
  readableId = "",
  endkundeOrt = "",
  isLastAssistantMessage = false,
  isReadOnly = false,
  onSendMessage
}) => {
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [emailTo, setEmailTo] = useState('');
  const [emailCc, setEmailCc] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);
  const { sendMessage } = useTaskChatMessages(taskId);
  
  // Parse JSON content and extract text and options
  const parseMessageContent = () => {
    if (message.role !== "assistant") {
      return { text: message.content, options: [], suggested_confirmation_text: null, actions: [] };
    }
    
    try {
      // Try to parse the content as JSON
      const parsedContent = JSON.parse(message.content);
      return { 
        text: parsedContent.text || message.content, 
        options: Array.isArray(parsedContent.options) ? parsedContent.options : [],
        suggested_confirmation_text: parsedContent.suggested_confirmation_text || null,
        actions: parsedContent.actions || []
      };
    } catch (e) {
      // Not valid JSON, try to extract options from text
      const content = message.content;
      const optionsMatch = content.match(/\[(.*?)\]/);
      
      if (optionsMatch) {
        try {
          const optionsText = optionsMatch[1];
          const options = optionsText.split(',').map(o => 
            o.trim().replace(/"/g, '').replace(/^\[|\]$/g, '')
          );
          
          return { text: content, options, suggested_confirmation_text: null, actions: [] };
        } catch (err) {
          return { text: content, options: [], suggested_confirmation_text: null, actions: [] };
        }
      } else {
        // Check for key list patterns that might contain key options
        const listMatch = content.match(/(?:\d+\.\s+(.*?)(?:\n|$))+/g);
        if (listMatch && content.toLowerCase().includes('schlüssel')) {
          const defaultOptions = ["Hausschlüssel", "Wohnungsschlüssel", "Briefkastenschlüssel"];
          return { text: content, options: defaultOptions, suggested_confirmation_text: null, actions: [] };
        }
        
        return { text: content, options: [], suggested_confirmation_text: null, actions: [] };
      }
    }
  };

  const { text, options, suggested_confirmation_text, actions } = parseMessageContent();
  
  // Filter out options that have already been selected
  const availableOptions = options.filter(option => !selectedOptions.has(option));

  // Für Assistentennachrichten, entferne JSON-artige Formatierung, wenn vorhanden
  const cleanupText = (text: string) => {
    if (message.role !== "assistant") return text;
    
    // Entferne JSON-Artefakte aus dem Text
    let cleanedText = text
      .replace(/^\s*{/, '') // Öffnende Klammer am Anfang entfernen
      .replace(/}\s*$/, '') // Schließende Klammer am Ende entfernen
      .replace(/"text"\s*:\s*"/, '') // "text": " entfernen
      .replace(/"options"\s*:\s*\[.*?\]/, '') // "options": [...] entfernen
      .replace(/",\s*$/, '') // ", am Ende entfernen
      .trim();
      
    // Replace "Reparaturdienstleister" with "Hausmeister" in all assistant messages
    cleanedText = cleanedText.replace(/Reparaturdienstleister/g, "Hausmeister");
    
    return cleanedText;
  };
  
  const displayText = cleanupText(text);
  
  // Use the message's creator name if available, otherwise fallback to current user
  const displayName = message.creatorName || 
                      (message.role === "assistant" ? "Ava" : 
                      (user?.fullName || user?.email || "Benutzer"));
  
  // Message is from assistant
  const isAssistantMessage = message.role === "assistant" && message.content;
  
  // Neue Logik: Button 'E-Mail senden' anzeigen, wenn die KI explizit 'E-Mail senden' als Option/Aktion liefert
  const shouldShowEmailButton = () => {
    if (!isAssistantMessage) return false;
    // Prüfe, ob im JSON-Content 'options' oder 'actions' das Signal 'E-Mail senden' oder 'send_email' enthalten ist
    const { options = [], actions = [] } = parseMessageContent();
    return (
      options.includes('E-Mail senden') ||
      options.includes('Email senden') ||
      options.includes('send_email') ||
      actions.includes('E-Mail senden') ||
      actions.includes('Email senden') ||
      actions.includes('send_email')
    );
  };

  // Handle preparing and opening email dialog
  const handleEmailClick = async () => {
    try {
      setSendingEmail(true);
      // Hole die E-Mail-Daten dynamisch von der Edge Function
      const { data, error } = await supabase.functions.invoke('handle-task-chat', {
        body: {
          taskId,
          generate_email_content: true
        }
      });
      if (error) throw error;
      if (!data || !data.content) throw new Error('Keine E-Mail-Daten vom Server erhalten');
      const parsed = JSON.parse(data.content);
      setEmailTo(parsed.email_to || '');
      setEmailCc(parsed.email_cc || '');
      setEmailSubject(parsed.email_subject || '');
      setEmailBody(parsed.email_body || '');
      setEmailDialogOpen(true);
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Fehler beim Laden der E-Mail-Daten",
        description: (err as Error).message || 'Unbekannter Fehler'
      });
    } finally {
      setSendingEmail(false);
    }
  };
  
  // Send email using Supabase Edge Function
  const handleSendEmail = async () => {
    try {
      setSendingEmail(true);
      
      // Call the Supabase edge function to send the email
      const { data, error } = await supabase.functions.invoke('send-email', {
        body: {
          to: emailTo,
          cc: emailCc || undefined,
          subject: emailSubject,
          text: emailBody,
          taskId: taskId || '',
          readableId: readableId || ''
        }
      });
      
      if (error) {
        throw new Error(error.message || 'Failed to send email');
      }
      
      if (data?.error) {
        throw new Error(data.error || 'Failed to send email');
      }
      
      // Close email dialog
      setEmailDialogOpen(false);
      
      // Show success message
      toast({
        title: "E-Mail gesendet",
        description: "Die E-Mail wurde erfolgreich versendet.",
      });
      
      // Dispatch custom event to notify that email was sent
      const event = new CustomEvent('email-sent', {
        detail: { task_id: taskId }
      });
      window.dispatchEvent(event);
      
      onSendMessage(`E-Mail wurde an ${emailTo} gesendet.`);
      
    } catch (error) {
      console.error('Error sending email:', error);
      toast({
        variant: "destructive",
        title: "Fehler beim Senden",
        description: "Die E-Mail konnte nicht gesendet werden. Bitte versuchen Sie es später erneut.",
      });
    } finally {
      setSendingEmail(false);
    }
  };

  // Beim Rendern der Optionen:
  // Wenn 'E-Mail senden' in den Optionen enthalten ist, zeige NICHT den generischen Button, sondern NUR den eigenen E-Mail-Button mit Icon an.
  const showCustomEmailButton = isAssistantMessage && (options.includes('E-Mail senden') || options.includes('Email senden') || options.includes('send_email'));
  const filteredOptions = options.filter(option => option !== 'E-Mail senden' && option !== 'Email senden' && option !== 'send_email');

  return (
    <div className={`flex flex-col mb-4 ${message.role === "assistant" ? "items-start" : "items-end"}`}>
      <div className={`
        ${isMobile ? 'max-w-[90%]' : 'max-w-[80%]'} p-4 rounded
        ${message.role === "assistant"
          ? "bg-blue-100 text-gray-900"
          : "bg-gray-100 text-gray-900"
        }
        border border-blue-50/40
      `}>
        <div className="flex flex-col mb-1">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm">
              {displayName}
            </span>
            <span className="text-xs text-gray-500">
              {message.created_at && new Date(message.created_at).toLocaleString('de-DE', {
                day: '2-digit',
                month: '2-digit',
                year: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
              })}
            </span>
          </div>
        </div>
        <div className="text-sm whitespace-pre-wrap">
          {displayText}
        </div>
        {filteredOptions.length > 0 && (
          <div className={`flex flex-wrap gap-2 mt-3 ${isMobile ? 'flex-col' : ''}`}>
            {filteredOptions.map((option, idx) => (
              <Button
                key={idx}
                variant="outline"
                onClick={() => !isReadOnly && onOptionSelect(option)}
                disabled={isReadOnly}
                className={cn(
                  "bg-blue-500 hover:bg-blue-600 text-white",
                  selectedOptions.has(option) && "bg-blue-700 ring-2 ring-blue-400 ring-offset-2",
                  "transition-all duration-150 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 shadow-md hover:shadow-lg rounded-lg px-4 py-2 text-sm font-medium m-1 flex-grow sm:flex-grow-0 min-w-[120px] text-center justify-center",
                  isReadOnly && "opacity-50 cursor-not-allowed"
                )}
              >
                {option}
              </Button>
            ))}
          </div>
        )}
        {/* Suggested confirmation button */} 
        {isAssistantMessage && suggested_confirmation_text && availableOptions.length === 0 && (
          <div className={`flex flex-wrap gap-2 mt-3 ${isMobile ? 'flex-col items-stretch' : ''}`}>
            <Button
              variant="outline"
              size="sm"
              onClick={() => !isReadOnly && onOptionSelect(suggested_confirmation_text)}
              disabled={isReadOnly}
              className="whitespace-normal text-left h-auto rounded text-sm px-4 py-1 hover:bg-blue-100"
            >
              {suggested_confirmation_text}
            </Button>
          </div>
        )}
        
        {/* E-Mail Button nur anzeigen, wenn Option vorhanden */}
        {showCustomEmailButton && (
          <div className="flex mt-3">
            <Button
              variant="secondary"
              size="sm"
              className="flex items-center gap-1 text-xs"
              onClick={handleEmailClick}
            >
              <Mail className="h-3 w-3" />
              Email senden
            </Button>
          </div>
        )}
      </div>

      {/* Email Dialog */}
      <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>E-Mail senden</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email-to">An</Label>
              <Input
                id="email-to"
                value={emailTo}
                onChange={(e) => setEmailTo(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email-cc">CC</Label>
              <Input
                id="email-cc"
                value={emailCc}
                onChange={(e) => setEmailCc(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email-subject">Betreff</Label>
              <Input
                id="email-subject"
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email-body">Nachricht</Label>
              <Textarea
                id="email-body"
                value={emailBody}
                onChange={(e) => setEmailBody(e.target.value)}
                className="min-h-[150px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEmailDialogOpen(false)} disabled={sendingEmail}>
              Abbrechen
            </Button>
            <Button onClick={handleSendEmail} disabled={sendingEmail}>
              {sendingEmail ? "Wird gesendet..." : "Senden"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
