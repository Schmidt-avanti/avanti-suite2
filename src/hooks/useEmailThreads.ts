
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { EmailThread, Json } from '@/types';

// Helper function to ensure attachments are string arrays
const normalizeThreadData = (data: any[]): EmailThread[] => {
  return data.map(thread => ({
    ...thread,
    // Convert attachments to string[] if it exists, otherwise set to undefined
    attachments: thread.attachments ? 
      (Array.isArray(thread.attachments) ? thread.attachments : [String(thread.attachments)]) 
      : undefined
  }));
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

        setThreads(normalizeThreadData(data || []));
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
