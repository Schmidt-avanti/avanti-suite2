
import React, { useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Building, CheckSquare, Clock, AlertCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useTaskCounts } from '@/hooks/useTaskCounts';
import { useCustomers } from '@/hooks/useCustomers';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from "@/components/ui/skeleton";
import { format } from 'date-fns';
import { AssignmentsDiagnostic } from '@/components/diagnostic/AssignmentsDiagnostic';

const AgentDashboard: React.FC = () => {
  const { user } = useAuth();
  const { counts, isLoading: isTaskCountsLoading } = useTaskCounts();
  const { customers, isLoading: isCustomersLoading } = useCustomers();
  
  // Fetch recent tasks assigned to this agent
  const { data: recentTasks, isLoading: isRecentTasksLoading } = useQuery({
    queryKey: ['agentRecentTasks', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('tasks')
        .select(`
          id, 
          title, 
          status, 
          created_at,
          readable_id,
          customer:customer_id(name)
        `)
        .eq('assigned_to', user.id)
        .order('created_at', { ascending: false })
        .limit(5);
        
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Log diagnostic information
  useEffect(() => {
    if (user) {
      console.log('Agent Dashboard - Current user:', {
        id: user.id,
        email: user.email,
        role: user.role,
        name: user.firstName || user["Full Name"]
      });
    }
    
    if (!isCustomersLoading) {
      console.log('Agent Dashboard - Assigned customers:', customers);
    }
    
    if (!isTaskCountsLoading) {
      console.log('Agent Dashboard - Task counts:', counts);
    }
  }, [user, customers, counts, isCustomersLoading, isTaskCountsLoading]);

  return (
    <div className="dashboard-container">
      <h1 className="text-2xl font-bold mb-6">Agent Dashboard</h1>
      
      {/* Add diagnostic component to help troubleshoot */}
      <AssignmentsDiagnostic />
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 mt-6">
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Zugewiesene Kunden</CardTitle>
            <Building className="h-6 w-6 text-avanti-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isCustomersLoading ? <Skeleton className="h-8 w-16" /> : customers.length}</div>
            <CardDescription>
              {isCustomersLoading ? <Skeleton className="h-4 w-24 mt-1" /> : `${customers.length} aktive Zuweisungen`}
            </CardDescription>
          </CardContent>
        </Card>
        
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Aufgaben gesamt</CardTitle>
            <CheckSquare className="h-6 w-6 text-avanti-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isTaskCountsLoading ? <Skeleton className="h-8 w-16" /> : counts.total}</div>
            <CardDescription>
              {isTaskCountsLoading ? <Skeleton className="h-4 w-24 mt-1" /> : `${counts.completed} abgeschlossen`}
            </CardDescription>
          </CardContent>
        </Card>
        
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Neue Aufgaben</CardTitle>
            <Clock className="h-6 w-6 text-avanti-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isTaskCountsLoading ? <Skeleton className="h-8 w-16" /> : counts.new}</div>
            <CardDescription>
              {isTaskCountsLoading ? <Skeleton className="h-4 w-24 mt-1" /> : `${counts.in_progress} in Bearbeitung`}
            </CardDescription>
          </CardContent>
        </Card>
        
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Follow-up Aufgaben</CardTitle>
            <AlertCircle className="h-6 w-6 text-avanti-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isTaskCountsLoading ? <Skeleton className="h-8 w-16" /> : counts.followup}</div>
            <CardDescription>
              {isTaskCountsLoading ? <Skeleton className="h-4 w-24 mt-1" /> : `benötigen Rückmeldung`}
            </CardDescription>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Meine Kunden</CardTitle>
            <CardDescription>
              Ihnen zugewiesene Kunden
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isCustomersLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : customers.length > 0 ? (
              <div className="space-y-2">
                {customers.map((customer) => (
                  <div key={customer.id} className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                    <div className="font-medium">{customer.name}</div>
                    <div className="text-sm text-gray-500">{customer.branch || 'Keine Branche angegeben'}</div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Ihnen sind aktuell keine Kunden zugewiesen.
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="col-span-1">
          <CardHeader>
            <Link to="/tasks" className="hover:text-avanti-700">
              <CardTitle>Aktuelle Aufgaben</CardTitle>
            </Link>
            <CardDescription>
              Ihre neuesten Aufgaben
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isRecentTasksLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : recentTasks && recentTasks.length > 0 ? (
              <div className="space-y-2">
                {recentTasks.map((task: any) => (
                  <Link to={`/tasks/${task.id}`} key={task.id}>
                    <div className="p-3 bg-gray-50 rounded-lg border border-gray-100 hover:bg-gray-100">
                      <div className="flex justify-between">
                        <div className="font-medium">{task.readable_id || 'Aufgabe'}</div>
                        <div className="text-sm text-gray-500">{task.created_at ? format(new Date(task.created_at), 'dd.MM.yyyy') : ''}</div>
                      </div>
                      <div className="text-sm truncate">{task.title}</div>
                      <div className="text-xs text-gray-500">{task.customer?.name || ''}</div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Sie haben aktuell keine Aufgaben.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AgentDashboard;
