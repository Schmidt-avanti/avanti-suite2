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
        const { data: existingSession, error: sessionError } = await supabase
          .from('whatsapp_chat_sessions')
          .select('user_id')
          .eq('chat_id', chatId)
          .single();

        if (sessionError && sessionError.code !== 'PGRST116') {
          console.error('Fehler beim Prüfen der Session:', sessionError);
          return;
        }

        if (existingSession) {
          setIsLocked(existingSession.user_id !== user.id);
          setLockedByUser(existingSession.user_id);
          return;
        }

        const { error: insertError } = await supabase
          .from('whatsapp_chat_sessions')
          .insert({
            chat_id: chatId,
            user_id: user.id
          });

        if (insertError) {
          if (insertError.code === '23505') { // Unique violation
            setIsLocked(true);
          }
          console.error('Fehler beim Erstellen der Session:', insertError);
          return;
        }

        setIsLocked(false);
        setLockedByUser(null);
      } catch (error) {
        console.error('Unerwarteter Fehler:', error);
      }
    };

    // Initial lock
    acquireLock();

    // Keep session alive
    const interval = setInterval(async () => {
      if (!isLocked) {
        const { error } = await supabase
          .from('whatsapp_chat_sessions')
          .update({ last_activity: new Date().toISOString() })
          .eq('chat_id', chatId)
          .eq('user_id', user.id);

        if (error) console.error('Fehler beim Aktualisieren der Session:', error);
      }
    }, 30000);

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
      if (!isLocked && chatId) {
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
