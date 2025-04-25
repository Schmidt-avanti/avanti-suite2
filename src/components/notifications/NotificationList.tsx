
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { de } from 'date-fns/locale';
import type { Notification } from '@/types';
import { useNotifications } from '@/hooks/useNotifications';

interface NotificationListProps {
  notifications: Notification[];
}

export const NotificationList: React.FC<NotificationListProps> = ({ notifications }) => {
  const navigate = useNavigate();
  const { markAsRead } = useNotifications();

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.read_at) {
      await markAsRead(notification.id);
    }
    
    if (notification.task_id) {
      navigate(`/tasks/${notification.task_id}`);
    }
  };

  if (notifications.length === 0) {
    return (
      <div className="py-6 px-4 text-center text-sm text-gray-500">
        Keine neuen Benachrichtigungen
      </div>
    );
  }

  // Filter out read notifications
  const unreadNotifications = notifications.filter(n => !n.read_at);

  if (unreadNotifications.length === 0) {
    return (
      <div className="py-6 px-4 text-center text-sm text-gray-500">
        Keine ungelesenen Benachrichtigungen
      </div>
    );
  }

  return (
    <div className="max-h-[300px] overflow-y-auto">
      {unreadNotifications.map((notification) => (
        <div 
          key={notification.id} 
          className="p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-0 bg-gray-50"
          onClick={() => handleNotificationClick(notification)}
        >
          <div className="text-sm">{notification.message}</div>
          <div className="text-xs text-gray-500 mt-1">
            {notification.created_at && formatDistanceToNow(new Date(notification.created_at), { 
              addSuffix: true,
              locale: de 
            })}
          </div>
        </div>
      ))}
    </div>
  );
};
