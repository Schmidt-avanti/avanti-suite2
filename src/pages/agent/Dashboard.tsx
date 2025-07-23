import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Building, CheckSquare, Clock, AlertCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useCustomers } from '@/hooks/useCustomers';
import { useAgentTaskCounts, DateFilter } from '@/hooks/useAgentTaskCounts';
import { DateFilterComponent } from '@/components/ui/date-filter';
import { Link } from 'react-router-dom';
import { Skeleton } from "@/components/ui/skeleton";
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

const AgentDashboard: React.FC = () => {
  const { user } = useAuth();
  const { customers, isLoading: isCustomersLoading } = useCustomers();
  
  // Date filter state
  const [dateFilter, setDateFilter] = useState<DateFilter>('current_month');
  const [customStartDate, setCustomStartDate] = useState<Date | undefined>();
  const [customEndDate, setCustomEndDate] = useState<Date | undefined>();
  
  // Use the new agent-specific hook
  const { data: agentData, isLoading: isAgentDataLoading } = useAgentTaskCounts({
    dateFilter,
    customStartDate,
    customEndDate,
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
    
    if (!isAgentDataLoading && agentData) {
      console.log('Agent Dashboard - Agent data:', agentData);
    }
  }, [user, customers, agentData, isCustomersLoading, isAgentDataLoading]);

  return (
    <div className="dashboard-container">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Agent Dashboard</h1>
        <div className="bg-white p-4 rounded-lg border">
          <DateFilterComponent
            dateFilter={dateFilter}
            onDateFilterChange={setDateFilter}
            customStartDate={customStartDate}
            customEndDate={customEndDate}
            onCustomStartDateChange={setCustomStartDate}
            onCustomEndDateChange={setCustomEndDate}
          />
        </div>
      </div>
      
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
            <div className="text-2xl font-bold">{isAgentDataLoading ? <Skeleton className="h-8 w-16" /> : agentData?.completedTasks || 0}</div>
            <CardDescription>
              {isAgentDataLoading ? <Skeleton className="h-4 w-24 mt-1" /> : `${agentData?.completedTasks || 0} abgeschlossen`}
            </CardDescription>
          </CardContent>
        </Card>
        
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Neue Aufgaben</CardTitle>
            <Clock className="h-6 w-6 text-avanti-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isAgentDataLoading ? <Skeleton className="h-8 w-16" /> : agentData?.currentTasks.filter(t => t.status === 'new').length || 0}</div>
            <CardDescription>
              {isAgentDataLoading ? <Skeleton className="h-4 w-24 mt-1" /> : `${agentData?.currentTasks.filter(t => t.status === 'in_progress').length || 0} in Bearbeitung`}
            </CardDescription>
          </CardContent>
        </Card>
        
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Follow-up Aufgaben</CardTitle>
            <AlertCircle className="h-6 w-6 text-avanti-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isAgentDataLoading ? <Skeleton className="h-8 w-16" /> : agentData?.followupTasks || 0}</div>
            <CardDescription>
              {isAgentDataLoading ? <Skeleton className="h-4 w-24 mt-1" /> : `benötigen Rückmeldung`}
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
              Ihre aktuellen Aufgaben und neue Aufgaben Ihrer Kunden
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isAgentDataLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : agentData?.currentTasks && agentData.currentTasks.length > 0 ? (
              <div className="space-y-2">
                {agentData.currentTasks.slice(0, 10).map((task: any) => (
                  <Link to={`/tasks/${task.id}`} key={task.id}>
                    <div className="p-3 bg-gray-50 rounded-lg border border-gray-100 hover:bg-gray-100">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="font-medium">{task.readable_id || 'Aufgabe'}</div>
                          <div className="text-sm truncate">{task.title}</div>
                          <div className="text-xs text-gray-500">{task.customer?.name || ''}</div>
                        </div>
                        <div className="flex flex-col items-end text-right">
                          <div className="text-sm text-gray-500">{task.updated_at ? format(new Date(task.updated_at), 'dd.MM.yyyy', { locale: de }) : ''}</div>
                          <div className={`text-xs px-2 py-1 rounded-full ${
                            task.status === 'new' ? 'bg-blue-100 text-blue-800' :
                            task.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' :
                            task.status === 'followup' ? 'bg-orange-100 text-orange-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {task.status === 'new' ? 'Neu' :
                             task.status === 'in_progress' ? 'In Bearbeitung' :
                             task.status === 'followup' ? 'Follow-up' :
                             task.status}
                          </div>
                        </div>
                      </div>
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
