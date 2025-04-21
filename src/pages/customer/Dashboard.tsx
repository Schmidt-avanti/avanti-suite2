
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckSquare, Clock, AlertCircle, Users } from 'lucide-react';

const ClientDashboard: React.FC = () => {
  // This would come from an API in a real app
  const stats = [
    {
      title: 'Meine Aufgaben',
      value: '12',
      description: '3 erledigt diese Woche',
      icon: <CheckSquare className="h-6 w-6 text-avanti-600" />,
    },
    {
      title: 'Bald fällig',
      value: '2',
      description: 'Fällig in den nächsten 48 Stunden',
      icon: <Clock className="h-6 w-6 text-avanti-600" />,
    },
    {
      title: 'Dringende Aufgaben',
      value: '1',
      description: 'Aufgaben mit hoher Priorität',
      icon: <AlertCircle className="h-6 w-6 text-avanti-600" />,
    },
    {
      title: 'Zugewiesene Agents',
      value: '3',
      description: 'Unterstützen dein Konto',
      icon: <Users className="h-6 w-6 text-avanti-600" />,
    },
  ];

  return (
    <div className="dashboard-container">
      <h1 className="text-2xl font-bold mb-6">Client Dashboard</h1>
      
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
            <CardTitle>Neueste Aufgaben</CardTitle>
            <CardDescription>
              Deine neuesten Aufgaben
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Die Aufgabenliste wird in der zukünftigen Implementierung aus Supabase geladen.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ClientDashboard;
