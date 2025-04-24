
import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/sonner'; // Changed from use-toast to sonner
import { Input } from '@/components/ui/input';

// Function to fetch task details by ID
const fetchTaskById = async (taskId: string) => {
  const { data, error } = await supabase
    .from('tasks')
    .select(`
      *,
      customer:customer_id (id, name),
      creator:created_by (id, "Full Name")
    `)
    .eq('id', taskId)
    .single();

  if (error) throw error;
  return data;
};

const TaskDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [replyTo, setReplyTo] = useState('');
  const [replyBody, setReplyBody] = useState('');

  // Fetch task data
  const { data: task, isLoading, error } = useQuery({
    queryKey: ['task', id],
    queryFn: () => fetchTaskById(id || ''),
    enabled: !!id,
  });

  const handleSendEmail = async () => {
    if (!replyTo || !replyBody) {
      toast({
        variant: 'destructive',
        title: 'Fehler',
        description: 'Bitte Empfänger und Nachricht angeben.'
      });
      return;
    }

    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      const { error } = await supabase.functions.invoke('send-reply-email', {
        body: {
          to: replyTo,
          subject: `Re: ${task.subject || 'Ihre Anfrage'}`,
          body: replyBody,
        },
        headers: {
          Authorization: `Bearer ${session?.access_token ?? import.meta.env.VITE_SUPABASE_ANON_KEY}`
        }
      });

      if (error) {
        toast({
          variant: 'destructive',
          title: 'Fehler beim Senden',
          description: error.message,
        });
      } else {
        toast({
          title: 'E-Mail gesendet',
          description: `Antwort an ${replyTo} wurde gesendet.`,
        });
        setReplyBody('');
      }
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Unbekannter Fehler',
        description: String(err),
      });
    }
  };

  if (isLoading) {
    return <div className="animate-pulse">Lade Aufgabendetails...</div>;
  }

  if (error || !task) {
    return <div className="text-red-500">Fehler beim Laden der Aufgabe: {(error as Error)?.message || 'Unbekannter Fehler'}</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-2">{task.title}</h1>
        <div className="flex items-center text-sm text-muted-foreground">
          <span>Erstellt am {new Date(task.created_at).toLocaleDateString('de-DE')}</span>
          {task.customer && (
            <span className="ml-2">• Kunde: {task.customer.name}</span>
          )}
        </div>
      </div>

      {task.description && (
        <div className="bg-gray-50 p-4 rounded-lg">
          <h2 className="text-lg font-medium mb-2">Beschreibung</h2>
          <div className="whitespace-pre-wrap">{task.description}</div>
        </div>
      )}
      
      {(task.endkunde_email || task.from_email) && (
        <div className="bg-gray-50 p-4 rounded-lg">
          <h2 className="text-lg font-medium mb-2">E-Mail Informationen</h2>
          {task.endkunde_email && <p><strong>Empfänger:</strong> {task.endkunde_email}</p>}
          {task.from_email && <p><strong>Absender:</strong> {task.from_email}</p>}
        </div>
      )}

      <div className="space-y-4 border-t pt-4">
        <h2 className="text-lg font-medium">Antwort senden</h2>
        <div className="grid gap-2">
          <label htmlFor="replyTo">Empfänger</label>
          <Input 
            id="replyTo" 
            value={replyTo} 
            onChange={(e) => setReplyTo(e.target.value)} 
            placeholder="email@domain.com"
            defaultValue={task.endkunde_email || ''}
          />
        </div>
        
        <div className="grid gap-2">
          <label htmlFor="replyBody">Nachricht</label>
          <Textarea 
            id="replyBody" 
            value={replyBody} 
            onChange={(e) => setReplyBody(e.target.value)} 
            placeholder="Geben Sie hier Ihre Nachricht ein..." 
            className="min-h-[200px]"
          />
        </div>
        
        <Button onClick={handleSendEmail}>Antwort senden</Button>
      </div>
    </div>
  );
};

export default TaskDetail;
