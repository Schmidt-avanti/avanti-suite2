
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { InboxIcon, CheckCircleIcon, UserCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useTasks } from '@/hooks/useTasks';
import { useNotifications } from '@/hooks/useNotifications';
import { formatDistanceToNow } from 'date-fns';
import { de } from 'date-fns/locale';

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { tasks: allTasks, isLoading: isTasksLoading } = useTasks(null, true); // Get all tasks
  const { notifications, markAsRead } = useNotifications();
  const [newTasksCount, setNewTasksCount] = useState<number>(0);
  const [completedTasksCount, setCompletedTasksCount] = useState<number>(0);
  
  // Get new and completed task counts
  useEffect(() => {
    if (!isTasksLoading && allTasks) {
      const newTasks = allTasks.filter(task => task.status === 'new');
      const completedTasks = allTasks.filter(task => task.status === 'completed');
      
      setNewTasksCount(newTasks.length);
      setCompletedTasksCount(completedTasks.length);
    }
  }, [allTasks, isTasksLoading]);

  // Filter unread notifications
  const unreadNotifications = notifications.filter(n => !n.read_at).slice(0, 5);

  const handleNotificationClick = async (notification: any) => {
    if (!notification.read_at) {
      await markAsRead(notification.id);
    }
    
    if (notification.task_id) {
      navigate(`/tasks/${notification.task_id}`);
    }
  };

  const firstName = user?.firstName || user?.["Full Name"]?.split(' ')[0] || '';

  if (isTasksLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-avanti-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <UserCircle className="h-8 w-8 text-muted-foreground" />
        <h1 className="text-2xl font-bold">Willkommen zurück, {firstName}!</h1>
      </div>
      
      {/* Task statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="hover:shadow-md transition-shadow bg-muted/10">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg font-semibold text-muted-foreground uppercase tracking-wide">Neue Aufgaben</CardTitle>
            <InboxIcon className="absolute top-4 right-4 text-muted-foreground h-6 w-6" />
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold mt-2">{newTasksCount}</div>
            <p className="text-sm text-muted-foreground">Aufgaben mit Status "neu"</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow bg-emerald-100/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg font-semibold text-muted-foreground uppercase tracking-wide">Erledigte Aufgaben</CardTitle>
            <CheckCircleIcon className="absolute top-4 right-4 text-muted-foreground h-6 w-6" />
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold mt-2">{completedTasksCount}</div>
            <p className="text-sm text-muted-foreground">Aufgaben mit Status "abgeschlossen"</p>
          </CardContent>
        </Card>
      </div>
      
      {/* Recent notifications */}
      <Card className="bg-orange-50/50">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-muted-foreground uppercase tracking-wide">Ungelesene Benachrichtigungen</CardTitle>
        </CardHeader>
        <CardContent>
          {unreadNotifications.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">Keine ungelesenen Benachrichtigungen</p>
          ) : (
            <div className="space-y-4">
              {unreadNotifications.map((notification) => (
                <div 
                  key={notification.id} 
                  className="flex flex-col bg-white p-3 rounded-lg hover:bg-gray-50 cursor-pointer shadow-sm"
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="text-sm">{notification.message}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {notification.created_at && formatDistanceToNow(new Date(notification.created_at), { 
                      addSuffix: true,
                      locale: de 
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
