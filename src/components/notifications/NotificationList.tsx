
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { de } from 'date-fns/locale';
import type { Notification } from '@/types';
import { useNotifications } from '@/hooks/useNotifications';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Check } from 'lucide-react';

interface NotificationListProps {
  notifications: Notification[];
}

export const NotificationList: React.FC<NotificationListProps> = ({ notifications }) => {
  const navigate = useNavigate();
  const { markAsRead, markAllAsRead } = useNotifications();

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.read_at) {
      await markAsRead(notification.id);
    }
    
    if (notification.task_id) {
      navigate(`/tasks/${notification.task_id}`);
    }
  };

  // Filter out read notifications
  const unreadNotifications = notifications.filter(n => !n.read_at);

  if (notifications.length === 0) {
    return (
      <div className="py-6 px-4 text-center text-sm text-gray-500">
        Keine neuen Benachrichtigungen
      </div>
    );
  }

  return (
    <>
      <div className="py-2 px-4 border-b border-gray-100 flex justify-between items-center">
        <h3 className="text-sm font-medium">Benachrichtigungen</h3>
        {unreadNotifications.length > 0 && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={markAllAsRead} 
            className="text-xs h-7 flex items-center"
          >
            <Check className="h-3 w-3 mr-1" />
            Alle lesen
          </Button>
        )}
      </div>
      <ScrollArea className="max-h-[300px]">
        {unreadNotifications.length === 0 ? (
          <div className="py-6 px-4 text-center text-sm text-gray-500">
            Keine ungelesenen Benachrichtigungen
          </div>
        ) : (
          unreadNotifications.map((notification) => (
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
          ))
        )}
      </ScrollArea>
    </>
  );
};
