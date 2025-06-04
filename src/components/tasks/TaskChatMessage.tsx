import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { useIsMobile } from '@/hooks/use-mobile';
import { useAuth } from '@/contexts/AuthContext';
import { Mail } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface TaskChatMessageProps {
  message: any;
  selectedOptions: Set<string>;
  onOptionSelect: (option: string) => void;
  taskId?: string;
  taskTitle?: string;
  readableId?: string;
  endkundeOrt?: string;
  isLastAssistantMessage?: boolean;
}

export const TaskChatMessage: React.FC<TaskChatMessageProps> = ({ 
  message, 
  selectedOptions, 
  onOptionSelect,
  taskId = "",
  taskTitle = "",
  readableId = "",
  endkundeOrt = "",
  isLastAssistantMessage = false
}) => {
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [emailTo, setEmailTo] = useState('hausmeister@ffo-verwaltung.de'); // Default to Frankfurt contact
  const [emailCc, setEmailCc] = useState('info@hv-nuernberg.de'); // Default CC to Mr. Nürnberg
  const [sendingEmail, setSendingEmail] = useState(false);
  
  // Parse JSON content and extract text and options
  const parseMessageContent = () => {
    if (message.role !== "assistant") {
      return { text: message.content, options: [] };
    }
    
    try {
      // Try to parse the content as JSON
      const parsedContent = JSON.parse(message.content);
      return { 
        text: parsedContent.text || message.content, 
        options: Array.isArray(parsedContent.options) ? parsedContent.options : [] 
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
          
          return { text: content, options };
        } catch (err) {
          return { text: content, options: [] };
        }
      } else {
        // Check for key list patterns that might contain key options
        const listMatch = content.match(/(?:\d+\.\s+(.*?)(?:\n|$))+/g);
        if (listMatch && content.toLowerCase().includes('schlüssel')) {
          const defaultOptions = ["Hausschlüssel", "Wohnungsschlüssel", "Briefkastenschlüssel"];
          return { text: content, options: defaultOptions };
        }
        
        return { text: content, options: [] };
      }
    }
  };

  const { text, options } = parseMessageContent();
  
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
  const displayName = message.creatorName || (message.role === "assistant" ? "Assistentin" : (user?.fullName || user?.email || "Benutzer"));
  
  // Message is from assistant
  const isAssistantMessage = message.role === "assistant" && message.content;
  
  // Check if the message indicates a forwarding to Hausmeister situation
  const shouldShowEmailButton = () => {
    if (!isAssistantMessage) return false;
    
    const lowerContent = displayText.toLowerCase();
    
    // Keywords that indicate the message should be forwarded to a Hausmeister
    const forwardingKeywords = [
      "weitergeleitet",
      "hausmeister",
      "weiterleiten",
      "reparatur", 
      "instandsetzung",
      "sanierung",
      "handwerker", 
      "techniker",
      "termin vereinbar"
    ];
    
    // Check if any of the forwarding keywords are present in the message
    return forwardingKeywords.some(keyword => lowerContent.includes(keyword));
  };

  // Function to get email contact based on location
  const getContactInfo = () => {
    const location = (endkundeOrt || '').toLowerCase().trim();
    
    // If Berlin, use Sven Gärtner
    if (location && location.includes('berlin')) {
      return {
        email: 'gaertner@nuernberg.berlin',
        name: 'Sven Gärtner'
      };
    }
    
    // Default to Frankfurt/Fürstenwalde contact
    return {
      email: 'hausmeister@ffo-verwaltung.de',
      name: 'Herr Gora'
    };
  };
  
  // Handle preparing and opening email dialog
  const handleEmailClick = () => {
    // Get contact information based on location
    const { email: contactEmail, name: contactName } = getContactInfo();
    
    // Create subject line
    const subject = taskTitle ? `Weiterleitung: ${taskTitle}` : 'Weiterleitung einer Kundenanfrage';
    
    // Create email body with message content
    let body = '';
    
    if (readableId) {
      body += `Aufgabe: #${readableId}\n`;
    }
    
    body += displayText;
    
    // Set email dialog content
    setEmailTo(contactEmail);
    setEmailCc('info@hv-nuernberg.de');
    setEmailSubject(subject);
    setEmailBody(body);
    
    // Open the email dialog
    setEmailDialogOpen(true);
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
        <div className="flex items-center gap-2 mb-1">
          <span className="font-semibold text-sm">
            {displayName}
          </span>
        </div>
        <div className="text-sm whitespace-pre-wrap">
          {displayText}
        </div>
        {availableOptions.length > 0 && (
          <div className={`flex flex-wrap gap-2 mt-3 ${isMobile ? 'flex-col' : ''}`}>
            {availableOptions.map((option, idx) => (
              <Button
                key={idx}
                variant="outline"
                onClick={() => onOptionSelect(option)}
                className="rounded text-sm px-4 py-1 hover:bg-blue-100"
                size={isMobile ? "sm" : "default"}
              >
                {option}
              </Button>
            ))}
          </div>
        )}
        
        {/* Email button for messages that need to be forwarded */}
        {isAssistantMessage && shouldShowEmailButton() && (
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
