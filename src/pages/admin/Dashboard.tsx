
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Building, CheckSquare, Clock } from 'lucide-react';

const AdminDashboard: React.FC = () => {
  // This would come from an API in a real app
  const stats = [
    {
      title: 'Benutzer gesamt',
      value: '24',
      description: '3 neu in diesem Monat',
      icon: <Users className="h-6 w-6 text-avanti-600" />,
    },
    {
      title: 'Kunden gesamt',
      value: '8',
      description: '1 neu in diesem Monat',
      icon: <Building className="h-6 w-6 text-avanti-600" />,
    },
    {
      title: 'Aufgaben gesamt',
      value: '156',
      description: '32 erledigt diese Woche',
      icon: <CheckSquare className="h-6 w-6 text-avanti-600" />,
    },
    {
      title: 'Ausstehende Aufgaben',
      value: '38',
      description: '12 fällig diese Woche',
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
            <CardTitle>Neueste Benutzer</CardTitle>
            <CardDescription>
              Kürzlich registrierte Benutzer im System
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Benutzerdaten werden in der zukünftigen Implementierung aus Supabase geladen.
            </p>
          </CardContent>
        </Card>

        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Aufgabenübersicht</CardTitle>
            <CardDescription>
              Verteilung der Aufgaben nach Status
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Hier wird in der zukünftigen Implementierung ein Aufgabendiagramm mittels Recharts umgesetzt.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboard;
