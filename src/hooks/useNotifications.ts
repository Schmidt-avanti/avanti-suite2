import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import type { Notification } from '@/types';
import { toast } from "@/hooks/use-toast";

export const useNotifications = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = useCallback(async () => {
    if (!user) return;

    try {
      console.log('Fetching notifications for user:', user.id);
      
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error fetching notifications:', error);
        return;
      }

      // Only show unread notifications
      const unreadNotifications = data?.filter(n => !n.read_at) || [];
      console.log('Fetched unread notifications:', unreadNotifications.length);
      
      setNotifications(data || []);
      setUnreadCount(unreadNotifications.length);
    } catch (err) {
      console.error('Exception when fetching notifications:', err);
    }
  }, [user]);

  const markAsRead = async (notificationId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('id', notificationId);

      if (error) {
        console.error('Error marking notification as read:', error);
        return;
      }

      await fetchNotifications();
    } catch (err) {
      console.error('Exception when marking notification as read:', err);
    }
  };

  const markAllAsRead = async () => {
    if (!user || notifications.length === 0) return;

    try {
      const unreadIds = notifications
        .filter(n => !n.read_at)
        .map(n => n.id);

      if (unreadIds.length === 0) return;

      const { error } = await supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .in('id', unreadIds);

      if (error) {
        console.error('Error marking all notifications as read:', error);
        toast({
          title: "Fehler",
          description: "Benachrichtigungen konnten nicht als gelesen markiert werden.",
          variant: "destructive"
        });
        return;
      }

      await fetchNotifications();
      
      if (unreadIds.length > 0) {
        toast({
          title: "Erfolg",
          description: `${unreadIds.length} Benachrichtigung(en) als gelesen markiert.`,
        });
      }
    } catch (err) {
      console.error('Exception when marking all notifications as read:', err);
    }
  };

  useEffect(() => {
    if (user) {
      fetchNotifications();

      // Set up real-time subscription
      const channel = supabase
        .channel('notifications-changes')
        .on('postgres_changes', 
          {
            event: '*',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`
          },
          (payload) => {
            console.log('Notification change detected:', payload);
            fetchNotifications();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user, fetchNotifications]);

  return {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    refresh: fetchNotifications
  };
};
