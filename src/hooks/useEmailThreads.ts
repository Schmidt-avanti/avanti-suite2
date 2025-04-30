import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { EmailThread, Json } from '@/types';

// Helper function to ensure attachments are handled correctly
const normalizeThreadData = (data: any[]): EmailThread[] => {
  console.log("Normalizing thread data:", data);
  
  return data.map(thread => {
    console.log("Processing thread:", thread.id, "attachments:", thread.attachments);
    
    return {
      ...thread,
      // Keep attachments as they are, they'll be processed in the component
      attachments: thread.attachments
    };
  });
};

export const useEmailThreads = (taskId?: string) => {
  const [threads, setThreads] = useState<EmailThread[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!taskId) {
      setThreads([]);
      setLoading(false);
      return;
    }

    console.log("Fetching email threads for task:", taskId);
    
    const fetchEmailThreads = async () => {
      try {
        setLoading(true);
        setError(null);

        const { data, error } = await supabase
          .from('email_threads')
          .select('*')
          .eq('task_id', taskId)
          .order('created_at', { ascending: false });

        if (error) throw error;

        console.log("Raw email threads data:", data);
        
        const normalizedData = normalizeThreadData(data || []);
        console.log("Normalized email threads:", normalizedData);
        
        setThreads(normalizedData);
      } catch (err: any) {
        console.error('Error fetching email threads:', err);
        setError(err.message);
        setThreads([]);
      } finally {
        setLoading(false);
      }
    };

    fetchEmailThreads();
  }, [taskId]);

  const refreshThreads = async () => {
    if (!taskId) return;
    
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('email_threads')
        .select('*')
        .eq('task_id', taskId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setThreads(normalizeThreadData(data || []));
    } catch (err: any) {
      console.error('Error refreshing email threads:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return { threads, loading, error, refreshThreads };
};
