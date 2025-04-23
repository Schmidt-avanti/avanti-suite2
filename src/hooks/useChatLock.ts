import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const useChatLock = (chatId: string | null) => {
  const [isLocked, setIsLocked] = useState(false);
  const [lockedByUser, setLockedByUser] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    if (!chatId || !user) return;

    const acquireLock = async () => {
      try {
        // Check if a session exists for this chat
        const { data: sessions, error: sessionsError } = await supabase
          .from('whatsapp_chat_sessions')
          .select('user_id, last_activity')
          .eq('chat_id', chatId)
          .maybeSingle();

        if (sessionsError) {
          console.error('Error checking session:', sessionsError);
          return;
        }

        const now = new Date();
        const SESSION_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

        // If there's a session and it's not expired and not owned by the current user
        if (sessions && 
            sessions.user_id !== user.id && 
            new Date(sessions.last_activity).getTime() > now.getTime() - SESSION_TIMEOUT_MS) {
          // Chat is locked by another user
          setIsLocked(true);
          setLockedByUser(sessions.user_id);
          return;
        }

        // If no valid session exists or the session is ours, try to create/update one
        if (!sessions || sessions.user_id === user.id) {
          const { error: upsertError } = await supabase
            .from('whatsapp_chat_sessions')
            .upsert({ 
              chat_id: chatId,
              user_id: user.id, 
              last_activity: new Date().toISOString()
            })
            .select();

          if (upsertError) {
            console.error('Error acquiring lock:', upsertError);
            if (upsertError.code === '23505') { // Unique constraint violation
              setIsLocked(true);
            }
            return;
          }

          setIsLocked(false);
          setLockedByUser(null);
        }
      } catch (error) {
        console.error('Unexpected error:', error);
      }
    };

    // Initial lock acquisition
    acquireLock();

    // Keep session alive with periodic updates
    const interval = setInterval(async () => {
      if (!isLocked && user) {
        const { error } = await supabase
          .from('whatsapp_chat_sessions')
          .update({ last_activity: new Date().toISOString() })
          .eq('chat_id', chatId)
          .eq('user_id', user.id);

        if (error) console.error('Error updating session:', error);
      }
    }, 30000); // Every 30 seconds

    // Subscribe to changes
    const channel = supabase
      .channel('chat_locks')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'whatsapp_chat_sessions',
        filter: `chat_id=eq.${chatId}`
      }, 
      (payload) => {
        if (payload.eventType === 'DELETE' && lockedByUser) {
          acquireLock();
        }
      })
      .subscribe();

    return () => {
      clearInterval(interval);
      if (!isLocked && chatId && user) {
        // Release our lock
        supabase
          .from('whatsapp_chat_sessions')
          .delete()
          .eq('chat_id', chatId)
          .eq('user_id', user.id);
      }
      supabase.removeChannel(channel);
    };
  }, [chatId, user, isLocked, lockedByUser]);

  return { isLocked, lockedByUser };
};
