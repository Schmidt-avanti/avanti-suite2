
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckSquare, Clock, AlertCircle, Users } from 'lucide-react';

const CustomerDashboard: React.FC = () => {
  // This would come from an API in a real app
  const stats = [
    {
      title: 'My Tasks',
      value: '12',
      description: '3 completed this week',
      icon: <CheckSquare className="h-6 w-6 text-avanti-600" />,
    },
    {
      title: 'Due Soon',
      value: '2',
      description: 'Due in the next 48 hours',
      icon: <Clock className="h-6 w-6 text-avanti-600" />,
    },
    {
      title: 'Urgent Tasks',
      value: '1',
      description: 'High priority items',
      icon: <AlertCircle className="h-6 w-6 text-avanti-600" />,
    },
    {
      title: 'Assigned Agents',
      value: '3',
      description: 'Supporting your account',
      icon: <Users className="h-6 w-6 text-avanti-600" />,
    },
  ];

  return (
    <div className="dashboard-container">
      <h1 className="text-2xl font-bold mb-6">Customer Dashboard</h1>
      
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

      <div className="grid grid-cols-1 gap-6">
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

export default CustomerDashboard;
