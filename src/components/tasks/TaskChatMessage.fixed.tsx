import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Message } from '@/hooks/useTaskMessages';
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
  message: Message;
  selectedOptions: Set<string>;
  onOptionSelect: (option: string) => void;
  taskId?: string;
  taskTitle?: string;
  readableId?: string;
  endkundeOrt?: string;
}

export const TaskChatMessage: React.FC<TaskChatMessageProps> = ({ 
  message, 
  selectedOptions, 
  onOptionSelect,
  taskId = "",
  taskTitle = "",
  readableId = "",
  endkundeOrt = ""
}) => {
  const isMobile = useIsMobile();
  const { user } = useAuth();
  
  // Email dialog state
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [emailTo, setEmailTo] = useState("");
  const [emailCc, setEmailCc] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
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
    return text
      .replace(/^\s*{/, '') // Öffnende Klammer am Anfang entfernen
      .replace(/}\s*$/, '') // Schließende Klammer am Ende entfernen
      .replace(/"text"\s*:\s*"/, '') // "text": " entfernen
      .replace(/"options"\s*:\s*\[.*?\]/, '') // "options": [...] entfernen
      .replace(/",\s*$/, '') // ", am Ende entfernen
      .trim();
  };
  
  // Check if the message contains escalation or forwarding content
  const shouldShowEmailButton = () => {
    if (message.role !== "assistant") return false;
    
    const escalationKeywords = [
      // Repair/maintenance keywords
      "Reparatur", "Wartung", "defekt", "kaputt", "beschädigt", "Verstopfung",
      "Abflussreiniger", "reparieren", "beheben",
      
      // Facility management keywords
      "Hausmeister", "Facility Manager", "Hausverwaltung", "Verwaltung",
      
      // Escalation terms
      "weitergeleitet", "weiterleiten", "eskalieren", "Zuständigkeit",
      
      // Service providers
      "Dienstleister", "Handwerker", "Techniker", "Fachmann", "Reparaturdienstleister",
      
      // Action terms
      "Termin vereinbaren", "vor Ort", "Begutachtung", "Prüfung", "umgehend"
    ];
    
    return escalationKeywords.some(keyword => 
      displayText.toLowerCase().includes(keyword.toLowerCase())
    );
  };
  
  // Prepare email content and open the email dialog
  const handlePrepareEmail = () => {
    // Get contact information based on location
    const contactInfo = getContactInfo();
    
    // Format email body with relevant information
    let body = '';
    
    if (readableId) {
      body += `Aufgabe: #${readableId}\n\n`;
    }
    
    // Use the AVA message as the main content
    body += displayText;
    
    // Set email dialog content
    const subject = taskTitle ? `Weiterleitung: ${taskTitle}` : 'Weiterleitung einer Kundenanfrage';
    setEmailTo(contactInfo.email);
    setEmailSubject(subject);
    setEmailBody(body);
    
    // Open the email dialog
    setEmailDialogOpen(true);
  };
  
  // Get contact info based on location
  const getContactInfo = () => {
    // Check if we can determine the location
    const berlinKeywords = ['Berlin', 'Charlottenburg', 'Spandau', 'Mitte'];
    const frankfurtKeywords = ['Frankfurt', 'FFO', 'Fürstenwalde'];
    
    let detectedLocation = null;
    
    // Check for Berlin-related keywords in the customer location
    if (endkundeOrt && berlinKeywords.some(keyword => 
      endkundeOrt.toLowerCase().includes(keyword.toLowerCase()))) {
      detectedLocation = 'Berlin';
    }
    
    // Check for Frankfurt-related keywords in the customer location
    if (endkundeOrt && frankfurtKeywords.some(keyword => 
      endkundeOrt.toLowerCase().includes(keyword.toLowerCase()))) {
      detectedLocation = 'Frankfurt';
    }
    
    // Return contact info based on location
    if (detectedLocation === 'Berlin') {
      return {
        email: 'gaertner@nuernberg.berlin',
        name: 'Sven Gärtner'
      };
    } else if (detectedLocation === 'Frankfurt') {
      return {
        email: 'hausmeister@ffo-verwaltung.de',
        name: 'Herr Gora'
      };
    } else {
      // Default contact
      return {
        email: 'service@avanti.cx',
        name: 'Avanti Service'
      };
    }
  };
  
  // Send email function
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
        console.error('Error from edge function:', error);
        throw new Error(error.message || 'Failed to send email');
      }
      
      if (data?.error) {
        console.error('Error data from edge function:', data.error);
        throw new Error(data.error || 'Failed to send email');
      }
      
      // Close dialog and show success message
      setEmailDialogOpen(false);
      toast({
        title: "E-Mail gesendet",
        description: "Die E-Mail wurde erfolgreich versendet.",
      });
      
      // Dispatch event to notify system that an email was sent
      const emailSentEvent = new CustomEvent('email-sent', {
        detail: {
          recipient: emailTo,
          task_id: taskId
        }
      });
      window.dispatchEvent(emailSentEvent);
      
    } catch (error: any) {
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

  const displayText = cleanupText(text);
  
  // Use the message's creator name if available, otherwise fallback to current user
  const displayName = message.creatorName || (message.role === "assistant" ? "Assistentin" : (user?.fullName || user?.email || "Benutzer"));

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
        
        {/* Email button for escalation/forwarding scenarios */}
        {message.role === "assistant" && shouldShowEmailButton() && (
          <div className="mt-3">
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-1 rounded bg-blue-50 hover:bg-blue-100 border-blue-200"
              onClick={handlePrepareEmail}
            >
              <Mail className="h-4 w-4" />
              <span>E-Mail weiterleiten</span>
            </Button>
          </div>
        )}
      </div>
      
      {/* Email Dialog */}
      <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>E-Mail weiterleiten</span>
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="email-to">An</Label>
              <Input 
                id="email-to"
                value={emailTo}
                onChange={(e) => setEmailTo(e.target.value)}
                disabled={sendingEmail}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email-cc">CC</Label>
              <Input 
                id="email-cc"
                value={emailCc}
                onChange={(e) => setEmailCc(e.target.value)}
                disabled={sendingEmail}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email-subject">Betreff</Label>
              <Input 
                id="email-subject"
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                disabled={sendingEmail}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email-body">Nachricht</Label>
              <Textarea 
                id="email-body"
                value={emailBody}
                onChange={(e) => setEmailBody(e.target.value)}
                className="min-h-[200px]"
                disabled={sendingEmail}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setEmailDialogOpen(false)}
              disabled={sendingEmail}
            >
              Abbrechen
            </Button>
            <Button 
              onClick={handleSendEmail}
              disabled={!emailTo || !emailSubject || !emailBody || sendingEmail}
              className="flex items-center gap-1"
            >
              <Mail className="h-4 w-4" />
              {sendingEmail ? "Wird gesendet..." : "Senden"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
