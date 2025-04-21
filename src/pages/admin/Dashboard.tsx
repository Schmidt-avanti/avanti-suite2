
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Building, CheckSquare, Clock } from 'lucide-react';

const AdminDashboard: React.FC = () => {
  // This would come from an API in a real app
  const stats = [
    {
      title: 'Total Users',
      value: '24',
      description: '3 new this month',
      icon: <Users className="h-6 w-6 text-avanti-600" />,
    },
    {
      title: 'Total Customers',
      value: '8',
      description: '1 new this month',
      icon: <Building className="h-6 w-6 text-avanti-600" />,
    },
    {
      title: 'Total Tasks',
      value: '156',
      description: '32 completed this week',
      icon: <CheckSquare className="h-6 w-6 text-avanti-600" />,
    },
    {
      title: 'Pending Tasks',
      value: '38',
      description: '12 due this week',
      icon: <Clock className="h-6 w-6 text-avanti-600" />,
    },
  ];

  return (
    <div className="dashboard-container">
      <h1 className="text-2xl font-bold mb-6">Admin Dashboard</h1>
      
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
            <CardTitle>Recent Users</CardTitle>
            <CardDescription>
              Recently registered users in the system
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              User data will be loaded here from Supabase in the future implementation.
            </p>
          </CardContent>
        </Card>

        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Task Overview</CardTitle>
            <CardDescription>
              Distribution of tasks by status
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Task chart will be implemented here using Recharts.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboard;
