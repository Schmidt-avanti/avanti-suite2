
import React from 'react';
import { Link } from 'react-router-dom'; 
import { formatDistanceToNow } from 'date-fns';
import { de } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';

interface Notification {
  id: string;
  message: string;
  created_at: string;
  task_id?: string; 
  read_at: string | null;
}

interface NotificationListProps {
  notifications: Notification[];
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  isLoading?: boolean;
}

export const NotificationList: React.FC<NotificationListProps> = ({ 
  notifications, 
  markAsRead, 
  markAllAsRead,
  isLoading = false
}) => {
  if (isLoading) {
    return (
      <div className="p-4 space-y-3">
        <div className="flex justify-between items-center pb-2 border-b">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-6 w-32" />
        </div>
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  if (notifications.length === 0) {
    return (
      <div className="p-4">
        <div className="flex justify-between items-center pb-2 border-b">
          <h3 className="font-medium">Benachrichtigungen</h3>
        </div>
        <div className="py-4 text-center">
          <p className="text-sm text-muted-foreground">Keine Benachrichtigungen</p>
        </div>
      </div>
    );
  }

  const unreadExists = notifications.some(n => !n.read_at);
  
  return (
    <div>
      <div className="flex justify-between items-center p-4 pb-2 border-b">
        <h3 className="font-medium">Benachrichtigungen</h3>
        {unreadExists && (
          <Button variant="ghost" size="sm" onClick={markAllAsRead}>
            Alle als gelesen markieren
          </Button>
        )}
      </div>
      <ScrollArea className="h-[400px]">
        <div className="space-y-1 p-2">
          {notifications.map((notification) => (
            <NotificationItem
              key={notification.id}
              notification={notification}
              markAsRead={markAsRead}
            />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};

const NotificationItem: React.FC<{ 
  notification: Notification;
  markAsRead: (id: string) => void;
}> = ({ notification, markAsRead }) => {
  const handleClick = () => {
    if (!notification.read_at) {
      markAsRead(notification.id);
    }
  };

  const NotificationContent = () => (
    <div className={`p-3 rounded-md text-sm ${!notification.read_at ? 'bg-avanti-50' : 'hover:bg-gray-50'}`}>
      <div className={`${!notification.read_at ? 'font-medium' : ''}`}>
        {notification.message}
      </div>
      <div className="text-xs text-muted-foreground mt-1">
        {formatDistanceToNow(new Date(notification.created_at), { 
          addSuffix: true,
          locale: de 
        })}
      </div>
    </div>
  );

  if (notification.task_id) {
    return (
      <Link to={`/tasks/${notification.task_id}`} onClick={handleClick}>
        <NotificationContent />
      </Link>
    );
  }

  return (
    <div onClick={handleClick} className="cursor-pointer">
      <NotificationContent />
    </div>
  );
};
