import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";
import { Bot, AlertTriangle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";

interface AvaTaskSummaryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taskTitle?: string;
  taskId?: string;
  readableId?: string;
  initialComment?: string;
  onContinue: () => void;
  onCancel: () => void;
  onCloseTask: (comment: string) => Promise<void>;
}

interface AvaMessage {
  content: string;
  type: 'ava' | 'user' | 'system';
  timestamp: string;
}

interface SummaryItem {
  key: string;
  value: string;
}

export function AvaTaskSummaryDialog({
  open,
  onOpenChange,
  taskTitle,
  taskId,
  readableId,
  initialComment = "",
  onContinue,
  onCancel,
  onCloseTask
}: AvaTaskSummaryDialogProps) {
  const [avaMessages, setAvaMessages] = useState<AvaMessage[]>([]);
  const [summaryItems, setSummaryItems] = useState<SummaryItem[]>([]);
  const [comment, setComment] = useState(initialComment);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const commentMinLength = 10;
  
  // Fetch AVA's messages from the task chat history
  useEffect(() => {
    if (open && taskId) {
      fetchAvaMessages();
      setComment(initialComment);
    }
  }, [open, taskId, initialComment]);
  
  const fetchAvaMessages = async () => {
    if (!taskId) return;
    
    try {
      const { data, error } = await supabase
        .from('task_messages')
        .select('id, content, created_at, role')
        .eq('task_id', taskId)
        .eq('role', 'assistant')
        .order('created_at', { ascending: true });
        
      if (error) throw error;
      
      if (data && data.length > 0) {
        const messages: AvaMessage[] = data.map(msg => ({
          content: msg.content || '',
          type: 'ava',
          timestamp: msg.created_at
        }));
        
        setAvaMessages(messages);
        
        // Create a smart summary from AVA's messages
        generateSmartSummary(messages);
      }
    } catch (error) {
      console.error('Error fetching AVA messages:', error);
    }
  };
  
  const generateSmartSummary = (messages: AvaMessage[]) => {
    // Skip welcome and generic messages
    const contentMessages = messages.filter(msg => 
      !msg.content.includes("Ich bin Ava") && 
      !msg.content.includes("Hallo") && 
      !msg.content.includes("wie kann ich helfen") &&
      msg.content.length > 20
    );
    
    // Find key information in the messages
    const summaryPoints: SummaryItem[] = [];
    
    // Extract only the most important information
    if (contentMessages.length > 0) {
      // Take the most recent substantial message
      const latestSubstantial = contentMessages[contentMessages.length - 1];
      
      // Remove markdown formatting and JSON structures
      let cleanContent = latestSubstantial.content
        .replace(/\*\*/g, '')
        .replace(/\\n/g, ' ')
        .replace(/\{"text":"([^"]+)"/g, '$1');
      
      // Try to extract clean JSON if present
      try {
        if (cleanContent.includes('"{"') || cleanContent.includes('{"text"')) {
          const jsonMatch = cleanContent.match(/\{.*\}/s);
          if (jsonMatch) {
            const jsonStr = jsonMatch[0].replace(/\\"|\\\\/g, '');
            const parsed = JSON.parse(jsonStr);
            if (parsed.text) {
              cleanContent = parsed.text;
            }
          }
        }
      } catch (e) {
        // If JSON parsing fails, continue with the cleaned content
        console.log('Could not parse JSON in message:', e);
      }
      
      // Add the key message as a summary item
      summaryPoints.push({
        key: 'Hauptinformation',
        value: cleanContent
      });
      
      // If we have additional messages, add context
      if (contentMessages.length > 1) {
        const contextMessage = contentMessages[contentMessages.length - 2];
        let contextContent = contextMessage.content
          .replace(/\*\*/g, '')
          .replace(/\\n/g, ' ')
          .substring(0, 150) + (contextMessage.content.length > 150 ? '...' : '');
        
        summaryPoints.push({
          key: 'Zusätzlicher Kontext',
          value: contextContent
        });
      }
    } else {
      // Fallback if no substantial messages found
      summaryPoints.push({
        key: 'Zusammenfassung',
        value: 'Die Anfrage wurde bearbeitet und dokumentiert.'
      });
    }
    
    setSummaryItems(summaryPoints);
  };
  
  const handleClose = async () => {
    if (comment.trim().length < commentMinLength) return;
    
    try {
      setIsSubmitting(true);
      await onCloseTask(comment);
      setComment("");
      onContinue();
      toast({
        title: "Aufgabe abgeschlossen",
        description: "Die Aufgabe wurde erfolgreich abgeschlossen und dokumentiert.",
      });
    } catch (error) {
      console.error("Error closing task:", error);
      toast({
        variant: "destructive",
        title: "Fehler",
        description: "Die Aufgabe konnte nicht abgeschlossen werden."
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleCancel = () => {
    setComment("");
    onCancel();
  };
  
  return (
    <Dialog open={open} onOpenChange={(value) => {
      if (!value && !isSubmitting) {
        handleCancel();
      }
    }}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-full">
              <Bot className="h-6 w-6 text-blue-700" />
            </div>
            <DialogTitle>Zusammenfassung von Ava</DialogTitle>
          </div>
        </DialogHeader>

        <div className="py-4 space-y-6">
          <div className="space-y-2">
            <h3 className="text-lg font-medium">Aufgabe ID: {readableId || taskId}</h3>
            <p className="text-base text-gray-700">{taskTitle}</p>
          </div>
          
          <Card className="p-4 bg-blue-50 border-blue-200">
            <div className="space-y-4">              
              <div>
                <h4 className="text-sm font-medium text-gray-500">Ava Zusammenfassung:</h4>
                <div className="text-sm mt-1 space-y-2">
                  {summaryItems.length > 0 ? (
                    <div className="mt-2 space-y-3">
                      {summaryItems.map((item, index) => (
                        <div key={index}>
                          <h5 className="font-medium text-gray-700">{item.key}:</h5>
                          <p className="whitespace-pre-wrap">{item.value}</p>
                        </div>
                      ))}
                      <p className="mt-3 italic text-blue-700">
                        "Gibt es noch etwas anderes, womit ich Ihnen heute helfen kann?"
                      </p>
                    </div>
                  ) : (
                    <p>
                      Die Anfrage wurde erfolgreich bearbeitet und dokumentiert.
                    </p>
                  )}
                </div>
              </div>
              
              <div className="space-y-2 pt-2">
                <Label htmlFor="closing-comment">
                  Dokumentation <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  id="closing-comment"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Bitte geben Sie hier eine Dokumentation des Kundenkontakts ein..."
                  className="min-h-[120px]"
                />
                
                {comment.trim().length < commentMinLength && (
                  <div className="flex items-center gap-2 text-amber-600 text-sm mt-2">
                    <AlertTriangle className="h-4 w-4" />
                    <span>
                      Mindestens {commentMinLength} Zeichen erforderlich
                      ({comment.trim().length}/{commentMinLength})
                    </span>
                  </div>
                )}
              </div>
            </div>
          </Card>
        </div>

        <DialogFooter className="flex justify-between">
          <Button variant="outline" onClick={handleCancel} disabled={isSubmitting}>
            Zurück
          </Button>
          <Button 
            onClick={handleClose} 
            disabled={comment.trim().length < commentMinLength || isSubmitting}
          >
            {isSubmitting ? "Wird abgeschlossen..." : "Aufgabe abschließen"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
