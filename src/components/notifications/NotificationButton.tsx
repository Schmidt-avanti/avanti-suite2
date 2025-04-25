
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNotifications } from '@/hooks/useNotifications';
import { useIsMobile } from '@/hooks/use-mobile';

export function NotificationButton() {
  const { notifications } = useNotifications();
  const unreadCount = notifications?.filter(n => !n.read_at)?.length || 0;
  const isMobile = useIsMobile();

  return (
    <div className="relative">
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
    </div>
  );
}
