
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckSquare, Clock, AlertCircle, RotateCcw, Calendar, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { cn } from '@/lib/utils';

type TaskStatus = 'new' | 'in_progress' | 'completed' | 'followup';
type FilterType = 'all' | 'open' | 'completed' | 'followup';

interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  created_at: string;
  follow_up_date: string | null;
  assigned_to: string | null;
  customer_id: string;
  profiles?: {
    "Full Name": string;
  } | null;
  customers?: {
    name: string;
  } | null;
}

interface TaskStats {
  total: number;
  open: number;
  completed: number;
  followup: number;
}

const ClientDashboard: React.FC = () => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filteredTasks, setFilteredTasks] = useState<Task[]>([]);
  const [stats, setStats] = useState<TaskStats>({ total: 0, open: 0, completed: 0, followup: 0 });
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTasks();
  }, [user]);

  useEffect(() => {
    filterTasks();
  }, [tasks, activeFilter]);

  const fetchTasks = async () => {
    if (!user) return;

    try {
      let query = supabase
        .from('tasks')
        .select(`
          id,
          title,
          description,
          status,
          created_at,
          follow_up_date,
          assigned_to,
          customer_id,
          profiles!assigned_to("Full Name"),
          customers!customer_id(name)
        `)
        .order('created_at', { ascending: false })
        .limit(50); // Get more tasks to have enough for filtering

      // Filter based on user role
      if (user.role === 'customer') {
        // Get customer's assigned customer_id
        const { data: assignment } = await supabase
          .from('user_customer_assignments')
          .select('customer_id')
          .eq('user_id', user.id)
          .single();
        
        if (assignment) {
          query = query.eq('customer_id', assignment.customer_id);
        }
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching tasks:', error);
        return;
      }

      const taskData = (data || []) as unknown as Task[];
      setTasks(taskData);

      // Calculate stats
      const newStats = {
        total: taskData.length,
        open: taskData.filter(t => t.status === 'new' || t.status === 'in_progress').length,
        completed: taskData.filter(t => t.status === 'completed').length,
        followup: taskData.filter(t => t.status === 'followup').length,
      };
      setStats(newStats);

    } catch (error) {
      console.error('Error in fetchTasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterTasks = () => {
    let filtered = [...tasks];

    switch (activeFilter) {
      case 'open':
        filtered = tasks.filter(t => t.status === 'new' || t.status === 'in_progress');
        break;
      case 'completed':
        filtered = tasks.filter(t => t.status === 'completed');
        break;
      case 'followup':
        filtered = tasks.filter(t => t.status === 'followup');
        break;
      case 'all':
      default:
        filtered = tasks;
        break;
    }

    // Limit to last 10 tasks
    setFilteredTasks(filtered.slice(0, 10));
  };

  const handleFilterClick = (filter: FilterType) => {
    setActiveFilter(filter);
  };

  const getStatusColor = (status: TaskStatus) => {
    switch (status) {
      case 'new': return 'text-blue-600';
      case 'in_progress': return 'text-yellow-600';
      case 'completed': return 'text-green-600';
      case 'followup': return 'text-purple-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusText = (status: TaskStatus) => {
    switch (status) {
      case 'new': return 'Neu';
      case 'in_progress': return 'In Bearbeitung';
      case 'completed': return 'Erledigt';
      case 'followup': return 'Wiedervorlage';
      default: return status;
    }
  };

  const metricCards = [
    {
      title: 'Aufgaben Gesamt',
      value: stats.total.toString(),
      description: 'Alle Aufgaben',
      icon: <CheckSquare className="h-6 w-6 text-avanti-600" />,
      filter: 'all' as FilterType,
      isActive: activeFilter === 'all',
    },
    {
      title: 'Offene Aufgaben',
      value: stats.open.toString(),
      description: 'Neu oder in Bearbeitung',
      icon: <Clock className="h-6 w-6 text-avanti-600" />,
      filter: 'open' as FilterType,
      isActive: activeFilter === 'open',
    },
    {
      title: 'Erledigte Aufgaben',
      value: stats.completed.toString(),
      description: 'Abgeschlossen',
      icon: <AlertCircle className="h-6 w-6 text-avanti-600" />,
      filter: 'completed' as FilterType,
      isActive: activeFilter === 'completed',
    },
    {
      title: 'Wiedervorlage',
      value: stats.followup.toString(),
      description: 'Zur Nachverfolgung',
      icon: <RotateCcw className="h-6 w-6 text-avanti-600" />,
      filter: 'followup' as FilterType,
      isActive: activeFilter === 'followup',
    },
  ];

  if (loading) {
    return (
      <div className="dashboard-container">
        <h1 className="text-2xl font-bold mb-6">Client Dashboard</h1>
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Lade Dashboard...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <h1 className="text-2xl font-bold mb-6">Client Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {metricCards.map((metric, index) => (
          <Card 
            key={index} 
            className={cn(
              "cursor-pointer transition-all duration-200 hover:shadow-md",
              metric.isActive ? "ring-2 ring-avanti-500 bg-avanti-50" : "hover:bg-gray-50"
            )}
            onClick={() => handleFilterClick(metric.filter)}
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">{metric.title}</CardTitle>
              {metric.icon}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metric.value}</div>
              <CardDescription>{metric.description}</CardDescription>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6">
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>
              Letzte 10 Aufgaben
              {activeFilter !== 'all' && (
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  ({activeFilter === 'open' ? 'Offene' : 
                    activeFilter === 'completed' ? 'Erledigte' : 
                    activeFilter === 'followup' ? 'Wiedervorlage' : 'Alle'})
                </span>
              )}
            </CardTitle>
            <CardDescription>
              {filteredTasks.length === 0 ? 'Keine Aufgaben gefunden' : `${filteredTasks.length} Aufgaben angezeigt`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filteredTasks.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Keine Aufgaben für den gewählten Filter gefunden.
              </p>
            ) : (
              <div className="space-y-4">
                {filteredTasks.map((task) => (
                  <div key={task.id} className="border-l-4 border-l-avanti-200 pl-4 py-2">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium text-sm">{task.title}</h4>
                        {task.description && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {task.description}
                          </p>
                        )}
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(task.created_at), 'dd.MM.yyyy', { locale: de })}
                          </div>
                          {task.profiles && (
                            <div className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {task.profiles["Full Name"]}
                            </div>
                          )}
                          {task.customers && (
                            <div className="text-xs">
                              {task.customers.name}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className={cn("text-xs font-medium px-2 py-1 rounded", getStatusColor(task.status))}>
                        {getStatusText(task.status)}
                      </div>
                    </div>
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

export default ClientDashboard;
