
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Building, CheckSquare, Clock, AlertCircle } from 'lucide-react';

const AgentDashboard: React.FC = () => {
  // This would come from an API in a real app
  const stats = [
    {
      title: 'Assigned Customers',
      value: '5',
      description: '1 new assignment',
      icon: <Building className="h-6 w-6 text-avanti-600" />,
    },
    {
      title: 'Total Tasks',
      value: '42',
      description: '12 completed this week',
      icon: <CheckSquare className="h-6 w-6 text-avanti-600" />,
    },
    {
      title: 'Due Soon',
      value: '7',
      description: 'Due in the next 48 hours',
      icon: <Clock className="h-6 w-6 text-avanti-600" />,
    },
    {
      title: 'Urgent Tasks',
      value: '3',
      description: 'High priority items',
      icon: <AlertCircle className="h-6 w-6 text-avanti-600" />,
    },
  ];

  return (
    <div className="dashboard-container">
      <h1 className="text-2xl font-bold mb-6">Agent Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              {stat.icon}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <CardDescription>{stat.description}</CardDescription>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>My Customers</CardTitle>
            <CardDescription>
              Customers assigned to you
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Customer list will be loaded here from Supabase in the future implementation.
            </p>
          </CardContent>
        </Card>

        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Recent Tasks</CardTitle>
            <CardDescription>
              Your most recent tasks
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Task list will be loaded here from Supabase in the future implementation.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AgentDashboard;
