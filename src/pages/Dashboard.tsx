
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/contexts/AuthContext';
import { Inbox, CheckCircle, UserCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { de } from 'date-fns/locale';
import { useTasks } from '@/hooks/useTasks';
import { useNotifications } from '@/hooks/useNotifications';
import { cn } from '@/lib/utils';

const Dashboard = () => {
  const { user } = useAuth();
  const { tasks: allTasks, isLoading: isTasksLoading } = useTasks(null, true);
  const { notifications, markAsRead } = useNotifications();
  const [newTasksCount, setNewTasksCount] = React.useState<number>(0);
  const [completedTasksCount, setCompletedTasksCount] = React.useState<number>(0);

  React.useEffect(() => {
    if (!isTasksLoading && allTasks) {
      setNewTasksCount(allTasks.filter(task => task.status === 'new').length);
      setCompletedTasksCount(allTasks.filter(task => task.status === 'completed').length);
    }
  }, [allTasks, isTasksLoading]);

  const handleNotificationClick = async (notification: any) => {
    if (!notification.read_at) {
      await markAsRead(notification.id);
    }
  };

  const firstName = user?.firstName || user?.["Full Name"]?.split(' ')[0] || '';
  const unreadNotifications = notifications.filter(n => !n.read_at).slice(0, 5);

  if (isTasksLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-avanti-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <UserCircle className="h-10 w-10 text-avanti-600" />
        <h1 className="text-3xl font-bold">👋 Willkommen zurück, {firstName}!</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* New Tasks Card */}
        <Card className="relative hover:shadow-md transition-shadow duration-200 hover:border-avanti-200">
          <CardContent className="p-6">
            <Inbox className="absolute top-4 right-4 h-8 w-8 text-muted-foreground/20" />
            <h3 className="text-lg font-semibold">Neue Aufgaben</h3>
            <p className="text-4xl font-bold mt-4 text-avanti-600">{newTasksCount}</p>
            <p className="text-sm text-muted-foreground mt-2">Aufgaben mit Status "neu"</p>
          </CardContent>
        </Card>

        {/* Completed Tasks Card */}
        <Card className="relative hover:shadow-md transition-shadow duration-200 hover:border-emerald-200 bg-emerald-50/20">
          <CardContent className="p-6">
            <CheckCircle className="absolute top-4 right-4 h-8 w-8 text-muted-foreground/20" />
            <h3 className="text-lg font-semibold">Erledigte Aufgaben</h3>
            <p className="text-4xl font-bold mt-4 text-emerald-600">{completedTasksCount}</p>
            <p className="text-sm text-muted-foreground mt-2">Aufgaben mit Status "abgeschlossen"</p>
          </CardContent>
        </Card>

        {/* Notifications Card */}
        <Card className={cn(
          "lg:row-span-2",
          "hover:shadow-md transition-shadow duration-200 hover:border-orange-200 bg-orange-50/10"
        )}>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">
              Ungelesene Benachrichtigungen
            </CardTitle>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">
              Letzte Aktivitäten
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {unreadNotifications.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                🚫 Keine ungelesenen Benachrichtigungen
              </div>
            ) : (
              <div className="space-y-4">
                {unreadNotifications.map((notification) => (
                  <div
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className="flex flex-col bg-background/50 p-4 rounded-lg hover:bg-background/80 cursor-pointer transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium">{notification.message}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {notification.source && `Quelle: ${notification.source}`}
                        </p>
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {notification.created_at && formatDistanceToNow(new Date(notification.created_at), {
                          addSuffix: true,
                          locale: de
                        })}
                      </span>
                    </div>
                    <Separator className="mt-3" />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
