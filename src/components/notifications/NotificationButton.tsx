
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNotifications } from '@/hooks/useNotifications';
import { useIsMobile } from '@/hooks/use-mobile';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { NotificationList } from './NotificationList';
import { useEffect } from 'react';
import { toast } from '@/hooks/use-toast';

export function NotificationButton() {
  const { notifications, unreadCount, refresh } = useNotifications();
  const isMobile = useIsMobile();

  // Refresh notifications on component mount
  useEffect(() => {
    refresh();
    
    // Set up refresh interval
    const intervalId = setInterval(refresh, 30000); // refresh every 30 seconds
    
    return () => clearInterval(intervalId);
  }, [refresh]);

  // Show a toast when new notifications arrive
  useEffect(() => {
    // Find the newest task assignment notification
    const taskAssignments = notifications?.filter(n => 
      n.message.includes('wurde Ihnen') && 
      !n.read_at &&
      // Only show notifications from the last minute to avoid showing old ones on page load
      (new Date().getTime() - new Date(n.created_at).getTime() < 60000)
    );
    
    if (taskAssignments && taskAssignments.length > 0) {
      // Show toast for the newest assignment
      const newestAssignment = taskAssignments[0];
      toast({
        title: "Neue Aufgabenzuweisung",
        description: newestAssignment.message,
        duration: 5000
      });
    }
  }, [notifications]);

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
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-0" align={isMobile ? "end" : "center"}>
          <NotificationList notifications={notifications} />
        </PopoverContent>
      </Popover>
    </div>
  );
}
