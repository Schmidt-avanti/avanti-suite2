
import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { InboxIcon, CheckCircleIcon } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/hooks/useNotifications';
import { formatDistanceToNow } from 'date-fns';
import { de } from 'date-fns/locale';
import { RemindersList } from '@/components/reminders/RemindersList';
import { useIsMobile } from '@/hooks/use-mobile';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DashboardSkeleton } from '@/components/ui/dashboard-skeleton';
import { useTaskCounts } from '@/hooks/useTaskCounts';
import { useQueryClient } from '@tanstack/react-query';

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const { counts, isLoading: isTaskCountsLoading } = useTaskCounts();
  const { notifications, markAsRead, isLoading: isNotificationsLoading } = useNotifications();
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();

  // Prefetch notifications and task counts when dashboard loads
  useEffect(() => {
    queryClient.prefetchQuery({
      queryKey: ['notifications'],
      staleTime: 10000 // 10 seconds
    });
    
    queryClient.prefetchQuery({
      queryKey: ['taskCounts', user?.id],
      staleTime: 30000 // 30 seconds
    });
  }, [queryClient, user?.id]);

  const unreadNotifications = notifications
    .filter(n => !n.read_at)
    .slice(0, 5);

  const handleNotificationClick = async (notification: any) => {
    if (!notification.read_at) {
      await markAsRead(notification.id);
    }
    
    if (notification.task_id) {
      // Navigate handled by the Link component
    }
  };

  const firstName = user?.firstName || user?.["Full Name"]?.split(' ')[0] || '';

  if (isTaskCountsLoading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="space-y-6">
      <h1 className={`text-2xl font-bold ${isMobile ? 'text-xl mb-4' : ''}`}>
        Willkommen zurück, {firstName}!
      </h1>
      
      <div className={`grid grid-cols-1 ${isMobile ? '' : 'md:grid-cols-2'} gap-6`}>
        <Link to="/tasks" className="block">
          <Card className="hover:shadow-md transition-shadow bg-avanti-50/50">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className={`${isMobile ? 'text-base' : 'text-lg'} font-semibold text-avanti-800 uppercase tracking-wide`}>
                Neue Aufgaben
              </CardTitle>
              <InboxIcon className="absolute top-4 right-4 text-avanti-600 h-6 w-6" />
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold mt-2 text-avanti-900">{counts.new}</div>
              <p className="text-sm text-avanti-600">Aufgaben mit Status "neu"</p>
            </CardContent>
          </Card>
        </Link>

        <Link to="/tasks/completed" className="block">
          <Card className="hover:shadow-md transition-shadow bg-avanti-50/50">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className={`${isMobile ? 'text-base' : 'text-lg'} font-semibold text-avanti-800 uppercase tracking-wide`}>
                Erledigte Aufgaben
              </CardTitle>
              <CheckCircleIcon className="absolute top-4 right-4 text-avanti-600 h-6 w-6" />
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold mt-2 text-avanti-900">{counts.completed}</div>
              <p className="text-sm text-avanti-600">Aufgaben mit Status "abgeschlossen"</p>
            </CardContent>
          </Card>
        </Link>
      </div>
      
      <Card className="bg-avanti-50/30">
        <CardHeader>
          <CardTitle className={`${isMobile ? 'text-base' : 'text-lg'} font-semibold text-avanti-800 uppercase tracking-wide`}>
            Ungelesene Benachrichtigungen
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isNotificationsLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : unreadNotifications.length === 0 ? (
            <p className="text-center text-avanti-600 py-4">Keine ungelesenen Benachrichtigungen</p>
          ) : (
            <ScrollArea className={`${isMobile ? 'max-h-[200px]' : ''}`}>
              <div className="space-y-4">
                {unreadNotifications.map((notification) => (
                  <Link 
                    key={notification.id} 
                    to={notification.task_id ? `/tasks/${notification.task_id}` : '#'}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="flex flex-col bg-white p-3 rounded-lg hover:bg-avanti-50 cursor-pointer shadow-sm">
                      <div className="text-sm text-avanti-900">{notification.message}</div>
                      <div className="text-xs text-avanti-600 mt-1">
                        {notification.created_at && formatDistanceToNow(new Date(notification.created_at), { 
                          addSuffix: true,
                          locale: de 
                        })}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      <RemindersList />
    </div>
  );
};

export default Dashboard;
