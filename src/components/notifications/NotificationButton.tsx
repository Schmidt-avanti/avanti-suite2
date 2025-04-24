
import React, { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { 
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { NotificationList } from './NotificationList';
import { useNotifications } from '@/hooks/useNotifications';

export const NotificationButton: React.FC = () => {
  const { user } = useAuth();
  const { notifications, unreadCount, markAllAsRead } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);

  const handleMarkAllAsRead = async () => {
    await markAllAsRead();
    setIsOpen(false);
  };

  if (!user) return null;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-9 w-9 bg-gray-100 rounded-full">
          <Bell className="h-5 w-5 text-gray-600 hover:text-gray-800" />
          {unreadCount > 0 && (
            <Badge 
              className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 p-0 text-xs text-white"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="p-4 border-b border-gray-100">
          <h3 className="font-medium text-sm">Benachrichtigungen</h3>
        </div>
        <NotificationList notifications={notifications} />
        {notifications.length > 0 && (
          <div className="p-2 border-t border-gray-100">
            <Button 
              variant="ghost" 
              size="sm" 
              className="w-full text-xs"
              onClick={handleMarkAllAsRead}
            >
              Alle als gelesen markieren
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
};
