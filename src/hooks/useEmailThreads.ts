
import { useState, useEffect } from 'react';
import { EmailThread } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';

export const useEmailThreads = (taskId: string | null) => {
  const [threads, setThreads] = useState<EmailThread[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const fetchThreads = async () => {
      if (!taskId) {
        setThreads([]);
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('email_threads')
          .select('*')
          .eq('task_id', taskId)
          .order('created_at', { ascending: false });
          
        if (error) throw error;
        
        // Type validation and casting
        if (data) {
          const typedThreads = data.map(thread => {
            // Ensure direction is either "inbound" or "outbound"
            const direction = thread.direction === 'inbound' ? 'inbound' : 'outbound';
            
            return {
              ...thread,
              direction
            } as EmailThread;
          });
          
          setThreads(typedThreads);
        } else {
          setThreads([]);
        }
      } catch (error: any) {
        console.error('Error fetching email threads:', error);
        toast({
          variant: "destructive",
          title: "Fehler",
          description: "E-Mail-Verlauf konnte nicht geladen werden.",
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchThreads();
  }, [taskId]);
  
  return { threads, loading };
};
