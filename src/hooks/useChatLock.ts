
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
        // Prüfen, ob eine bestehende Session existiert
        const { data: existingSession, error: sessionError } = await supabase
          .rpc('get_chat_session', { chat_id_param: chatId })
          .single();

        if (sessionError && sessionError.code !== 'PGRST116') {
          console.error('Fehler beim Prüfen der Session:', sessionError);
          return;
        }

        if (existingSession) {
          // Session existiert, prüfen ob sie vom aktuellen Nutzer ist
          const sessionUserId = existingSession.user_id;
          setIsLocked(sessionUserId !== user.id);
          setLockedByUser(sessionUserId);
          return;
        }

        // Keine bestehende Session, versuchen eine neue zu erstellen
        const { error: insertError } = await supabase
          .rpc('create_chat_session', { 
            chat_id_param: chatId, 
            user_id_param: user.id 
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
      if (!isLocked && user) {
        const { error } = await supabase
          .rpc('update_chat_session', { 
            chat_id_param: chatId, 
            user_id_param: user.id 
          });

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
      if (!isLocked && chatId && user) {
        supabase
          .rpc('release_chat_session', { 
            chat_id_param: chatId, 
            user_id_param: user.id 
          });
      }
      supabase.removeChannel(channel);
    };
  }, [chatId, user, isLocked, lockedByUser]);

  return { isLocked, lockedByUser };
};
