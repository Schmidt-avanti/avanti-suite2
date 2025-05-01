
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface Notification {
  id: string;
  message: string;
  created_at: string;
  task_id?: string;
  read_at: string | null;
}

export const useNotifications = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  // Fetch notifications with React Query
  const fetchNotifications = async (): Promise<Notification[]> => {
    if (!user) {
      console.log('No user found, skipping notification fetch');
      return [];
    }

    try {
      console.info(`Fetching notifications for user: ${user.id}`);
      
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching notifications:', error);
        return [];
      }
      
      const unreadCount = data ? data.filter(n => !n.read_at).length : 0;
      console.info(`Fetched notifications: ${data?.length} Unread: ${unreadCount}`);
      
      return data || [];
    } catch (error) {
      console.error('Exception in fetchNotifications:', error);
      return [];
    }
  };
  
  // Use React Query for data fetching and caching
  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: fetchNotifications,
    staleTime: 30000, // 30 seconds
    enabled: !!user
  });

  // Mark notification as read with mutation
  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('id', notificationId);
      
      if (error) throw error;
      return notificationId;
    },
    onSuccess: () => {
      // Invalidate and refetch notifications after marking as read
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }
  });

  // Mark all notifications as read with mutation
  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      if (!user) return;
      
      const { error } = await supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .is('read_at', null);
      
      if (error) throw error;
    },
    onSuccess: () => {
      // Invalidate and refetch notifications after marking all as read
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }
  });

  // Calculate unread count
  const unreadCount = notifications.filter(n => !n.read_at).length;

  // Manual refresh function (can be used for pull-to-refresh)
  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ['notifications'] });
  };

  return {
    notifications,
    unreadCount,
    isLoading,
    refresh,
    markAsRead: (id: string) => markAsReadMutation.mutate(id),
    markAllAsRead: () => markAllAsReadMutation.mutate()
  };
};
