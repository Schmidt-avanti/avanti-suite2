import React, { useState, FormEvent, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/components/ui/use-toast";
import { EmailThreadHistory } from './EmailThreadHistory';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TaskStatus } from '@/types';

interface EmailReplyPanelProps {
  taskId: string;
  replyTo: { email: string; name?: string } | null;
  setReplyTo: (replyTo: { email: string; name?: string } | null) => void;
}

export const EmailReplyPanel: React.FC<EmailReplyPanelProps> = ({ taskId, replyTo, setReplyTo }: EmailReplyPanelProps) => {
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [emailThreads, setEmailThreads] = useState<any[]>([]);
  const { user } = useAuth();

  useEffect(() => {
    const fetchEmailThreads = async () => {
      const { data, error } = await supabase
        .from('email_threads')
        .select('*')
        .eq('task_id', taskId)
        .order('created_at', { ascending: false });
        
      if (error) {
        console.error('Error fetching email threads:', error);
        return;
      }
      
      setEmailThreads(data || []);
    };
    
    fetchEmailThreads();
  }, [taskId]);

  const sendEmail = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!subject || !body.trim()) {
      toast({
        title: "Fehler",
        description: "Betreff und Nachricht sind erforderlich.",
        variant: "destructive"
      });
      return;
    }
    
    // First, add the reply as a user message to the task_messages
    const { error: messageError } = await supabase
      .from("task_messages")
      .insert({
        task_id: taskId,
        role: "user",
        content: body,
        created_by: user?.id,
        metadata: { 
          is_email: true,
          subject,
          recipient: replyTo?.email
        }
      });
      
    if (messageError) {
      toast({
        title: "Fehler",
        description: "Die Nachricht konnte nicht gespeichert werden.",
        variant: "destructive"
      });
      console.error("Error adding message:", messageError);
      return;
    }
    
    setIsSending(true);
    
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          to: replyTo?.email,
          subject,
          text: body,
          taskId,
          userId: user?.id
        })
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Fehler beim Senden der E-Mail');
      }
      
      toast({
        title: "E-Mail gesendet",
        description: `E-Mail wurde erfolgreich an ${replyTo?.email} gesendet.`,
      });
      
      // Clear form
      setSubject('');
      setBody('');
      
      // Update task status to in_progress if it's new
      const { data: taskData } = await supabase
        .from('tasks')
        .select('status')
        .eq('id', taskId)
        .single();
        
      if (taskData?.status === 'new') {
        await supabase
          .from('tasks')
          .update({ status: 'in_progress' as TaskStatus })
          .eq('id', taskId);
      }
      
    } catch (error) {
      console.error('Error sending email:', error);
      toast({
        title: "Fehler",
        description: (error as Error).message,
        variant: "destructive"
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="mb-4">
        <h2 className="text-xl font-semibold text-blue-900 mb-2">E-Mail Antwort</h2>
        {replyTo && (
          <div className="text-sm text-gray-600 mb-2">
            Antwort an: {replyTo.name ? `${replyTo.name} (${replyTo.email})` : replyTo.email}
          </div>
        )}
      </div>
      
      <ScrollArea className="flex-1 mb-4 pr-4">
        {emailThreads.length > 0 && (
          <div className="mb-6">
            <EmailThreadHistory threads={emailThreads} compact={true} />
          </div>
        )}
      </ScrollArea>
      
      <form onSubmit={sendEmail} className="mt-auto">
        <div className="space-y-4">
          <div>
            <Input
              placeholder="Betreff"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full"
              required
            />
          </div>
          <div>
            <Textarea
              placeholder="Ihre Nachricht..."
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="w-full min-h-[200px]"
              required
            />
          </div>
          <div className="flex justify-end">
            <Button type="submit" disabled={isSending}>
              {isSending ? (
                "Wird gesendet..."
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Senden
                </>
              )}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
};
