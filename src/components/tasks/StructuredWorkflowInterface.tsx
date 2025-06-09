
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { CheckCircle, Circle, MessageSquare, Plus, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";

interface DatabaseUseCase {
  id: string;
  title: string;
  information_needed: string | null;
  steps: string | null;
  type: string | null;
}

interface WorkflowStep {
  id: string;
  title: string;
  description: string;
  type: 'input' | 'checkbox' | 'text' | 'action';
  required: boolean;
  completed?: boolean;
  value?: string;
}

interface StructuredWorkflowInterfaceProps {
  taskId: string;
  useCaseId: string;
  onTaskComplete: () => void;
  onAddDeviation: (useCaseId: string, deviation: string) => void;
}

export const StructuredWorkflowInterface: React.FC<StructuredWorkflowInterfaceProps> = ({
  taskId,
  useCaseId,
  onTaskComplete,
  onAddDeviation
}) => {
  const [useCase, setUseCase] = useState<DatabaseUseCase | null>(null);
  const [workflowSteps, setWorkflowSteps] = useState<WorkflowStep[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [notes, setNotes] = useState('');
  const [deviationText, setDeviationText] = useState('');
  const [showDeviationInput, setShowDeviationInput] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchUseCaseDetails();
  }, [useCaseId]);

  const fetchUseCaseDetails = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('use_cases')
        .select('id, title, information_needed, steps, type')
        .eq('id', useCaseId)
        .single();

      if (error) throw error;
      
      setUseCase(data);
      
      // Initialize workflow steps from use case data or create default steps
      const steps: WorkflowStep[] = [
        {
          id: '1',
          title: 'Kundenanfrage prüfen',
          description: 'Überprüfen Sie die Details der Kundenanfrage',
          type: 'checkbox',
          required: true
        },
        {
          id: '2', 
          title: 'Lösungsansatz dokumentieren',
          description: 'Beschreiben Sie den gewählten Lösungsansatz',
          type: 'input',
          required: true
        },
        {
          id: '3',
          title: 'Kunde kontaktieren',
          description: 'Informieren Sie den Kunden über den Status',
          type: 'action',
          required: false
        }
      ];
      
      setWorkflowSteps(steps);
    } catch (error: any) {
      console.error('Error fetching use case:', error);
      toast({
        variant: "destructive",
        title: "Fehler",
        description: "Use Case Details konnten nicht geladen werden."
      });
    } finally {
      setIsLoading(false);
    }
  };

  const updateStepValue = (stepId: string, value: string | boolean) => {
    setWorkflowSteps(prev => prev.map(step => 
      step.id === stepId 
        ? { ...step, value: typeof value === 'boolean' ? String(value) : value, completed: Boolean(value) }
        : step
    ));
  };

  const handleAddDeviation = () => {
    if (deviationText.trim()) {
      onAddDeviation(useCaseId, deviationText);
      setDeviationText('');
      setShowDeviationInput(false);
      toast({
        title: "Abweichung hinzugefügt",
        description: "Die Abweichung wurde dokumentiert."
      });
    }
  };

  const handleCompleteTask = async () => {
    try {
      setIsSaving(true);
      
      // Convert WorkflowStep objects to plain objects that are JSON serializable
      const serializableSteps = workflowSteps.map(step => ({
        id: step.id,
        title: step.title,
        description: step.description,
        type: step.type,
        required: step.required,
        completed: step.completed || false,
        value: step.value || ''
      }));
      
      // Save workflow progress
      const workflowData = {
        steps: serializableSteps,
        notes: notes,
        completed_at: new Date().toISOString()
      };
      
      const { error } = await supabase
        .from('task_workflow_progress')
        .upsert({
          task_id: taskId,
          use_case_id: useCaseId,
          workflow_data: workflowData as any,
          completed: true
        });

      if (error) throw error;

      toast({
        title: "Aufgabe abgeschlossen",
        description: "Der Workflow wurde erfolgreich abgeschlossen."
      });

      onTaskComplete();
    } catch (error: any) {
      console.error('Error completing task:', error);
      toast({
        variant: "destructive",
        title: "Fehler",
        description: "Aufgabe konnte nicht abgeschlossen werden."
      });
    } finally {
      setIsSaving(false);
    }
  };

  const completedSteps = workflowSteps.filter(step => step.completed).length;
  const totalSteps = workflowSteps.length;
  const canComplete = workflowSteps.filter(step => step.required).every(step => step.completed);

  if (isLoading) {
    return <div className="flex justify-center items-center h-64">Lädt...</div>;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
      {/* Left Column - Use Case Information */}
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              {useCase?.title}
              <Badge variant="secondary">Use Case</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              {useCase?.information_needed || 'Keine Beschreibung verfügbar'}
            </p>
            
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Fortschritt</span>
                <span className="text-sm text-muted-foreground">
                  {completedSteps}/{totalSteps} Schritte
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all"
                  style={{ width: `${(completedSteps / totalSteps) * 100}%` }}
                ></div>
              </div>
            </div>

            <Separator className="my-4" />
            
            <h4 className="font-medium mb-2">Workflow-Schritte:</h4>
            <ScrollArea className="h-60">
              <div className="space-y-3">
                {workflowSteps.map((step, index) => (
                  <div key={step.id} className="flex items-start space-x-3 p-2 rounded border">
                    <div className="mt-1">
                      {step.completed ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <Circle className="h-4 w-4 text-gray-400" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm">{step.title}</span>
                        {step.required && <Badge variant="outline" className="text-xs">Pflicht</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {step.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Right Column - Interactive Workflow */}
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Aufgabe bearbeiten</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-96">
              <div className="space-y-4">
                {workflowSteps.map((step, index) => (
                  <div key={step.id} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">{step.title}</h4>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowDeviationInput(true)}
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Abweichung
                      </Button>
                    </div>
                    
                    <p className="text-sm text-muted-foreground mb-3">
                      {step.description}
                    </p>

                    {step.type === 'checkbox' && (
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          checked={step.completed || false}
                          onCheckedChange={(checked) => updateStepValue(step.id, checked)}
                        />
                        <span className="text-sm">Schritt abgeschlossen</span>
                      </div>
                    )}

                    {step.type === 'input' && (
                      <Textarea
                        placeholder="Ihre Eingabe..."
                        value={step.value || ''}
                        onChange={(e) => updateStepValue(step.id, e.target.value)}
                        className="min-h-20"
                      />
                    )}

                    {step.type === 'action' && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => updateStepValue(step.id, true)}
                        className={step.completed ? "bg-green-50 border-green-200" : ""}
                      >
                        {step.completed ? "Ausgeführt" : "Aktion ausführen"}
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Notizen</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="Zusätzliche Notizen zur Bearbeitung..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="min-h-20 mb-4"
            />
            
            {showDeviationInput && (
              <div className="mb-4 p-3 border rounded bg-orange-50">
                <div className="flex items-center mb-2">
                  <AlertTriangle className="h-4 w-4 text-orange-500 mr-2" />
                  <span className="font-medium text-sm">Abweichung dokumentieren</span>
                </div>
                <Textarea
                  placeholder="Beschreiben Sie die Abweichung vom Standard-Workflow..."
                  value={deviationText}
                  onChange={(e) => setDeviationText(e.target.value)}
                  className="mb-2"
                />
                <div className="flex space-x-2">
                  <Button size="sm" onClick={handleAddDeviation}>
                    Hinzufügen
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => {
                      setShowDeviationInput(false);
                      setDeviationText('');
                    }}
                  >
                    Abbrechen
                  </Button>
                </div>
              </div>
            )}

            <div className="flex justify-end space-x-2">
              <Button variant="outline">
                <MessageSquare className="h-4 w-4 mr-2" />
                Chat öffnen
              </Button>
              <Button 
                onClick={handleCompleteTask}
                disabled={!canComplete || isSaving}
                className="bg-green-600 hover:bg-green-700"
              >
                {isSaving ? "Speichere..." : "Aufgabe abschließen"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
