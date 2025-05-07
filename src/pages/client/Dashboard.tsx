
import React, { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { AlertCircle, FileText, Plus } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Link, useNavigate } from "react-router-dom";

const ClientDashboard: React.FC = () => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchClientData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Fetch tasks for this client's organization
        const { data: clientTasks, error: tasksError } = await supabase
          .from("tasks")
          .select(`
            id, 
            title, 
            created_at, 
            status, 
            readable_id,
            customer_id, 
            customers:customer_id (name)
          `)
          .eq("status", "new")
          .order("created_at", { ascending: false })
          .limit(5);

        if (tasksError) {
          throw tasksError;
        }

        setTasks(clientTasks || []);
      } catch (err: any) {
        console.error("Error fetching client dashboard data:", err);
        setError(err.message || "Fehler beim Laden der Daten");
      } finally {
        setIsLoading(false);
      }
    };

    fetchClientData();
  }, [user?.id]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new':
        return 'bg-blue-100 text-blue-800';
      case 'in_progress':
        return 'bg-yellow-100 text-yellow-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <h1 className="text-3xl font-bold">Willkommen, {user?.firstName || "Kunde"}</h1>
        <Button asChild>
          <Link to="/tasks/create" className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Neue Aufgabe anlegen
          </Link>
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Fehler</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Neueste Aufgaben</CardTitle>
            <CardDescription>
              Ihre aktuellsten Aufgaben
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="animate-pulse space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-16 bg-gray-200 rounded"></div>
                ))}
              </div>
            ) : tasks.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <FileText className="mx-auto h-12 w-12 text-gray-400 mb-3" />
                <p>Keine Aufgaben gefunden</p>
                <Button 
                  variant="outline" 
                  className="mt-4"
                  onClick={() => navigate("/tasks/create")}
                >
                  Erste Aufgabe erstellen
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {tasks.map((task) => (
                  <div 
                    key={task.id} 
                    className="p-3 border rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => navigate(`/tasks/${task.id}`)}
                  >
                    <div className="flex justify-between items-center">
                      <h3 className="font-medium truncate">{task.title}</h3>
                      <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(task.status)}`}>
                        {task.status === 'new' ? 'Neu' :
                         task.status === 'in_progress' ? 'In Bearbeitung' :
                         task.status === 'completed' ? 'Abgeschlossen' : task.status}
                      </span>
                    </div>
                    <div className="text-sm text-gray-500 mt-1 flex justify-between">
                      <span>{task.readable_id || '-'}</span>
                      <span>{new Date(task.created_at).toLocaleDateString('de-DE')}</span>
                    </div>
                  </div>
                ))}
                <Button 
                  variant="outline" 
                  className="w-full mt-2"
                  onClick={() => navigate("/tasks")}
                >
                  Alle Aufgaben anzeigen
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Wissensdatenbank</CardTitle>
            <CardDescription>
              Hilfreiche Informationen und Anleitungen
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center py-8">
            <div className="flex flex-col items-center justify-center h-full">
              <FileText className="h-12 w-12 text-gray-400 mb-3" />
              <p className="text-gray-500 mb-4">Zugriff auf die Wissensdatenbank für Ihre Organisation</p>
              <Button 
                variant="outline" 
                onClick={() => navigate("/knowledge")}
              >
                Wissensdatenbank öffnen
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Schnellzugriff</CardTitle>
          <CardDescription>
            Wichtige Funktionen für Ihren Arbeitsalltag
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button variant="outline" className="h-24 flex flex-col p-2" onClick={() => navigate("/tasks/create")}>
              <Plus className="h-6 w-6 mb-2" />
              <span>Neue Aufgabe</span>
            </Button>
            <Button variant="outline" className="h-24 flex flex-col p-2" onClick={() => navigate("/tasks")}>
              <FileText className="h-6 w-6 mb-2" />
              <span>Meine Aufgaben</span>
            </Button>
            <Button variant="outline" className="h-24 flex flex-col p-2" onClick={() => navigate("/knowledge")}>
              <FileText className="h-6 w-6 mb-2" />
              <span>Wissen</span>
            </Button>
            <Button variant="outline" className="h-24 flex flex-col p-2" onClick={() => navigate("/reports")}>
              <FileText className="h-6 w-6 mb-2" />
              <span>Berichte</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ClientDashboard;
