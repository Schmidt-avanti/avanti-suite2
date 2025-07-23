
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNotifications } from '@/hooks/useNotifications';
import { useIsMobile } from '@/hooks/use-mobile';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { NotificationList } from './NotificationList';
import { useEffect, useState, useCallback } from 'react';
import { toast } from '@/hooks/use-toast';
import type { Notification } from '@/types';

export function NotificationButton() {
  const { notifications, unreadCount, isLoading, markAsRead, markAllAsRead } = useNotifications();
  const isMobile = useIsMobile();
  const [lastNotifiedId, setLastNotifiedId] = useState<string | null>(null);

  // Memoized function to check for new task notifications
  const checkForNewTaskNotifications = useCallback((currentNotifications: Notification[] | undefined) => {
    if (!currentNotifications || currentNotifications.length === 0) return;

    // Find the newest task assignment notification
    const taskAssignments = currentNotifications.filter(n => 
      n.message.includes('wurde Ihnen') && 
      !n.read_at &&
      // Only show notifications from the last minute to avoid showing old ones on page load
      (new Date().getTime() - new Date(n.created_at).getTime() < 60000)
    );
    
    if (taskAssignments && taskAssignments.length > 0) {
      // Get the newest assignment
      const newestAssignment = taskAssignments[0];
      
      // Only show toast if this is a new notification
      if (newestAssignment.id !== lastNotifiedId) {
        toast({
          title: "Neue Aufgabenzuweisung",
          description: newestAssignment.message,
          duration: 5000
        });
        
        // Remember this notification was shown
        setLastNotifiedId(newestAssignment.id);
      }
    }
  }, [lastNotifiedId]);

  // Show a toast when new notifications arrive
  useEffect(() => {
    if (notifications && notifications.length > 0) {
      checkForNewTaskNotifications(notifications);
    }
  }, [notifications, checkForNewTaskNotifications]);

  return (
    <div className="relative">
      <Popover>
        <PopoverTrigger asChild>
          <Button 
            variant="ghost" 
            className={`relative ${isMobile ? 'h-8 w-8' : 'h-9 w-9'} bg-gray-100 rounded-full flex items-center justify-center`}
          >
            <Bell className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'} text-gray-600`} />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-medium rounded-full w-5 h-5 flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
            {isLoading && unreadCount === 0 && (
              <span className="absolute -top-1 -right-1 bg-gray-300 text-white text-xs font-medium rounded-full w-5 h-5 flex items-center justify-center">
                ...
              </span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-96 p-0" align="end">
          <NotificationList 
            notifications={notifications} 
            markAsRead={markAsRead}
            markAllAsRead={markAllAsRead}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
