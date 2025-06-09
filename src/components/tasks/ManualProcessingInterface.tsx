
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  ArrowLeft,
  MessageSquare, 
  User,
  Clock,
  CheckCircle,
  Send,
  FileText
} from "lucide-react";
import { TaskChat } from "@/components/tasks/TaskChat";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface ManualProcessingInterfaceProps {
  taskId: string;
  taskTitle: string;
  taskDescription: string;
  onBackToSelection: () => void;
  onTaskComplete: () => void;
}

export const ManualProcessingInterface: React.FC<ManualProcessingInterfaceProps> = ({
  taskId,
  taskTitle,
  taskDescription,
  onBackToSelection,
  onTaskComplete
}) => {
  const [solution, setSolution] = useState('');
  const [documentation, setDocumentation] = useState('');
  const [isCompleting, setIsCompleting] = useState(false);
  const { toast } = useToast();

  const handleCompleteTask = async () => {
    if (!solution.trim()) {
      toast({
        variant: "destructive",
        title: "Lösung erforderlich",
        description: "Bitte beschreiben Sie die Lösung für den Kunden."
      });
      return;
    }

    try {
      setIsCompleting(true);

      // Save the manual processing result
      const processingData = {
        solution: solution,
        documentation: documentation,
        processedManually: true,
        completedAt: new Date().toISOString()
      };

      // Save to task_workflow_progress for consistency
      const { error: progressError } = await supabase
        .from('task_workflow_progress')
        .upsert({
          task_id: taskId,
          use_case_id: null,
          workflow_data: processingData as any,
          completed: true
        });

      if (progressError) throw progressError;

      // Update task status
      const { error: taskError } = await supabase
        .from('tasks')
        .update({ 
          status: 'completed',
          closing_comment: `Manuelle Bearbeitung abgeschlossen. Lösung: ${solution}`
        })
        .eq('id', taskId);

      if (taskError) throw taskError;

      toast({
        title: "Aufgabe erfolgreich abgeschlossen!",
        description: "Die manuelle Bearbeitung wurde dokumentiert."
      });

      onTaskComplete();
    } catch (error: any) {
      console.error('Error completing manual task:', error);
      toast({
        variant: "destructive",
        title: "Fehler",
        description: "Aufgabe konnte nicht abgeschlossen werden."
      });
    } finally {
      setIsCompleting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={onBackToSelection}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Zurück zur Auswahl
          </Button>
          <div>
            <h2 className="text-2xl font-bold">Manuelle Bearbeitung</h2>
            <p className="text-muted-foreground">Individuelle Lösung für spezielle Anfragen</p>
          </div>
        </div>
        <Badge variant="secondary">Freie Bearbeitung</Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Task Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Kundenanfrage
              </CardTitle>
            </CardHeader>
            <CardContent>
              <h3 className="font-semibold mb-2">{taskTitle}</h3>
              <p className="text-muted-foreground">{taskDescription}</p>
            </CardContent>
          </Card>

          {/* Solution */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5" />
                Lösung für den Kunden
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Beschreiben Sie die Lösung oder Antwort für den Kunden. Diese Information wird für die Dokumentation verwendet.
              </p>
              <Textarea
                placeholder="Beschreiben Sie hier die Lösung für den Kunden..."
                value={solution}
                onChange={(e) => setSolution(e.target.value)}
                className="min-h-32"
                required
              />
            </CardContent>
          </Card>

          {/* Additional Documentation */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Zusätzliche Dokumentation
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Optionale Notizen für interne Zwecke oder spezielle Hinweise für zukünftige ähnliche Fälle.
              </p>
              <Textarea
                placeholder="Interne Notizen, durchgeführte Schritte, besondere Hinweise..."
                value={documentation}
                onChange={(e) => setDocumentation(e.target.value)}
                className="min-h-24"
              />
            </CardContent>
          </Card>

          {/* Complete Button */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">Bearbeitung abschließen</h3>
                  <p className="text-sm text-muted-foreground">
                    Aufgabe als abgeschlossen markieren und Dokumentation speichern
                  </p>
                </div>
                <Button
                  onClick={handleCompleteTask}
                  disabled={isCompleting || !solution.trim()}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {isCompleting ? "Speichere..." : "Aufgabe abschließen"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Bearbeitungs-Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4" />
                <span className="font-medium">Bearbeitungsart:</span>
                <span>Manuell</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <MessageSquare className="h-4 w-4" />
                <span className="font-medium">KI-Unterstützung:</span>
                <span>Verfügbar</span>
              </div>
              <Separator />
              <div className="bg-orange-50 border border-orange-200 rounded p-3">
                <p className="text-sm text-orange-800">
                  <strong>Hinweis:</strong> Da kein passender Workflow gefunden wurde, bearbeiten Sie diese Anfrage individuell. 
                  Nutzen Sie den KI-Chat für Unterstützung.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* AI Chat Integration */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                KI-Unterstützung
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-gradient-to-br from-white via-blue-50/60 to-blue-100/50 rounded-lg">
                <TaskChat taskId={taskId} useCaseId={null} />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
