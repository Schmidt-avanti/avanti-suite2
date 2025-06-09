
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { 
  CheckCircle, 
  Circle, 
  MessageSquare, 
  AlertTriangle, 
  HelpCircle, 
  Lightbulb, 
  ArrowLeft, 
  Send,
  FileText,
  Clock,
  User
} from "lucide-react";
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
  helpText?: string;
  type: 'checkbox' | 'input' | 'textarea' | 'action';
  required: boolean;
  completed?: boolean;
  value?: string;
  suggestions?: string[];
}

interface SmartWorkflowInterfaceProps {
  taskId: string;
  useCaseId: string;
  taskDescription: string;
  onTaskComplete: () => void;
  onBackToSelection: () => void;
}

export const SmartWorkflowInterface: React.FC<SmartWorkflowInterfaceProps> = ({
  taskId,
  useCaseId,
  taskDescription,
  onTaskComplete,
  onBackToSelection
}) => {
  const [useCase, setUseCase] = useState<DatabaseUseCase | null>(null);
  const [workflowSteps, setWorkflowSteps] = useState<WorkflowStep[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [finalNotes, setFinalNotes] = useState('');
  const [showChat, setShowChat] = useState(false);
  const [chatMessages, setChatMessages] = useState<Array<{role: 'user' | 'assistant', content: string}>>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
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
      
      // Create intelligent workflow steps based on use case
      const steps: WorkflowStep[] = [
        {
          id: '1',
          title: 'Kundenanfrage verstehen',
          description: 'Analysieren Sie die Anfrage des Kunden und die benötigten Informationen',
          helpText: `Lesen Sie die Kundenanfrage sorgfältig durch: "${taskDescription.substring(0, 100)}..."`,
          type: 'textarea',
          required: true,
          suggestions: [
            'Der Kunde möchte...',
            'Das Problem besteht darin...',
            'Der Kunde benötigt Hilfe bei...'
          ]
        },
        {
          id: '2',
          title: 'Lösungsweg identifizieren',
          description: 'Bestimmen Sie den besten Lösungsansatz für diese Anfrage',
          helpText: 'Basierend auf der Kundenanfrage und unserem Workflow, was ist der richtige nächste Schritt?',
          type: 'textarea',
          required: true,
          suggestions: [
            'Wir können dem Kunden direkt helfen durch...',
            'Der Kunde muss weitergeleitet werden an...',
            'Weitere Informationen benötigt: ...'
          ]
        },
        {
          id: '3',
          title: 'Maßnahmen umsetzen',
          description: 'Führen Sie die erforderlichen Schritte zur Lösung durch',
          helpText: 'Dokumentieren Sie alle durchgeführten Aktionen',
          type: 'checkbox',
          required: true
        },
        {
          id: '4',
          title: 'Kundenkommunikation',
          description: 'Informieren Sie den Kunden über das Ergebnis',
          helpText: 'Haben Sie den Kunden über die Lösung oder nächste Schritte informiert?',
          type: 'checkbox',
          required: false
        }
      ];
      
      setWorkflowSteps(steps);
      
      // Add initial AI message
      setChatMessages([{
        role: 'assistant',
        content: `Hallo! Ich helfe Ihnen bei der Bearbeitung dieser ${data.type || 'Anfrage'}. Sie können mich jederzeit fragen, wenn Sie Unterstützung benötigen. Beginnen wir mit Schritt 1: Verstehen Sie die Kundenanfrage?`
      }]);
      
    } catch (error: any) {
      console.error('Error fetching use case:', error);
      toast({
        variant: "destructive",
        title: "Fehler",
        description: "Workflow Details konnten nicht geladen werden."
      });
    } finally {
      setIsLoading(false);
    }
  };

  const updateStepValue = (stepId: string, value: string | boolean) => {
    setWorkflowSteps(prev => prev.map(step => 
      step.id === stepId 
        ? { 
            ...step, 
            value: typeof value === 'boolean' ? String(value) : value, 
            completed: typeof value === 'boolean' ? value : Boolean(value?.toString()?.trim())
          }
        : step
    ));
  };

  const getCurrentStep = () => workflowSteps[currentStepIndex];
  const getCompletedSteps = () => workflowSteps.filter(step => step.completed).length;
  const getProgressPercentage = () => (getCompletedSteps() / workflowSteps.length) * 100;
  const canProceedToNext = () => {
    const currentStep = getCurrentStep();
    return currentStep && (!currentStep.required || currentStep.completed);
  };

  const handleNextStep = () => {
    if (currentStepIndex < workflowSteps.length - 1 && canProceedToNext()) {
      setCurrentStepIndex(currentStepIndex + 1);
    }
  };

  const handlePreviousStep = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1);
    }
  };

  const handleSendChatMessage = async () => {
    if (!chatInput.trim()) return;
    
    const userMessage = chatInput;
    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsChatLoading(true);
    
    try {
      // Call AI service for intelligent help
      const { data, error } = await supabase.functions.invoke('handle-task-chat', {
        body: {
          taskId: taskId,
          useCaseId: useCaseId,
          message: userMessage,
          context: {
            currentStep: getCurrentStep(),
            taskDescription: taskDescription,
            completedSteps: workflowSteps.filter(s => s.completed)
          }
        }
      });
      
      if (error) throw error;
      
      setChatMessages(prev => [...prev, { 
        role: 'assistant', 
        content: data.response || 'Entschuldigung, ich konnte Ihnen nicht helfen. Versuchen Sie es erneut.'
      }]);
      
    } catch (error) {
      console.error('Chat error:', error);
      setChatMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'Entschuldigung, es gab einen Fehler. Versuchen Sie es später erneut oder wenden Sie sich an Ihren Supervisor.'
      }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleCompleteTask = async () => {
    const requiredStepsCompleted = workflowSteps
      .filter(step => step.required)
      .every(step => step.completed);
      
    if (!requiredStepsCompleted) {
      toast({
        variant: "destructive",
        title: "Pflichtschritte fehlen",
        description: "Bitte vervollständigen Sie alle erforderlichen Schritte."
      });
      return;
    }
    
    try {
      setIsSaving(true);
      
      // Save workflow progress
      const workflowData = {
        steps: workflowSteps.map(step => ({
          id: step.id,
          title: step.title,
          completed: step.completed || false,
          value: step.value || ''
        })),
        finalNotes: finalNotes,
        completedAt: new Date().toISOString()
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

      // Update task status
      await supabase
        .from('tasks')
        .update({ status: 'completed' })
        .eq('id', taskId);

      toast({
        title: "Aufgabe erfolgreich abgeschlossen!",
        description: "Alle Schritte wurden dokumentiert und die Aufgabe ist abgeschlossen."
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

  if (isLoading) {
    return <div className="flex justify-center items-center h-64">Lädt Workflow...</div>;
  }

  const currentStep = getCurrentStep();

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
            <h2 className="text-2xl font-bold">{useCase?.title}</h2>
            <p className="text-muted-foreground">Strukturierte Bearbeitung</p>
          </div>
        </div>
        <Badge variant="secondary" className="text-sm">
          Schritt {currentStepIndex + 1} von {workflowSteps.length}
        </Badge>
      </div>

      {/* Progress */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Gesamtfortschritt</span>
            <span className="text-sm text-muted-foreground">
              {getCompletedSteps()}/{workflowSteps.length} Schritte abgeschlossen
            </span>
          </div>
          <Progress value={getProgressPercentage()} className="mb-4" />
          
          <div className="flex gap-2">
            {workflowSteps.map((step, index) => (
              <div
                key={step.id}
                className={`flex-1 p-2 rounded text-center text-xs ${
                  index === currentStepIndex
                    ? 'bg-blue-100 border-blue-300 border-2'
                    : step.completed
                    ? 'bg-green-100 text-green-800'
                    : 'bg-gray-100'
                }`}
              >
                {step.title}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Current Step */}
          {currentStep && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {currentStep.completed ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <Circle className="h-5 w-5 text-gray-400" />
                  )}
                  {currentStep.title}
                  {currentStep.required && <Badge variant="outline">Pflicht</Badge>}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">{currentStep.description}</p>
                
                {currentStep.helpText && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <div className="flex items-start gap-2">
                      <HelpCircle className="h-4 w-4 text-blue-500 mt-0.5" />
                      <p className="text-sm text-blue-700">{currentStep.helpText}</p>
                    </div>
                  </div>
                )}

                {/* Step Input */}
                {currentStep.type === 'checkbox' && (
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      checked={currentStep.completed || false}
                      onCheckedChange={(checked) => updateStepValue(currentStep.id, checked)}
                    />
                    <span>Schritt abgeschlossen</span>
                  </div>
                )}

                {currentStep.type === 'input' && (
                  <Input
                    placeholder="Ihre Eingabe..."
                    value={currentStep.value || ''}
                    onChange={(e) => updateStepValue(currentStep.id, e.target.value)}
                  />
                )}

                {currentStep.type === 'textarea' && (
                  <div className="space-y-3">
                    <Textarea
                      placeholder="Beschreiben Sie Ihre Analyse oder Vorgehensweise..."
                      value={currentStep.value || ''}
                      onChange={(e) => updateStepValue(currentStep.id, e.target.value)}
                      className="min-h-24"
                    />
                    
                    {currentStep.suggestions && (
                      <div className="space-y-2">
                        <p className="text-sm font-medium flex items-center gap-1">
                          <Lightbulb className="h-4 w-4 text-yellow-500" />
                          Vorschläge:
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {currentStep.suggestions.map((suggestion, index) => (
                            <Button
                              key={index}
                              variant="outline"
                              size="sm"
                              onClick={() => updateStepValue(currentStep.id, suggestion)}
                              className="text-xs"
                            >
                              {suggestion}
                            </Button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Navigation */}
                <div className="flex justify-between pt-4">
                  <Button
                    variant="outline"
                    onClick={handlePreviousStep}
                    disabled={currentStepIndex === 0}
                  >
                    Vorheriger Schritt
                  </Button>
                  
                  {currentStepIndex < workflowSteps.length - 1 ? (
                    <Button
                      onClick={handleNextStep}
                      disabled={!canProceedToNext()}
                    >
                      Nächster Schritt
                    </Button>
                  ) : (
                    <Button
                      onClick={handleCompleteTask}
                      disabled={isSaving || !canProceedToNext()}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      {isSaving ? "Speichere..." : "Aufgabe abschließen"}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Final Notes - shown on last step */}
          {currentStepIndex === workflowSteps.length - 1 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Abschließende Notizen
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  placeholder="Zusätzliche Bemerkungen zur Bearbeitung (optional)..."
                  value={finalNotes}
                  onChange={(e) => setFinalNotes(e.target.value)}
                  className="min-h-20"
                />
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Aufgaben-Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4" />
                <span className="font-medium">Use Case:</span>
                <span>{useCase?.type || 'Standard'}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4" />
                <span className="font-medium">Geschätzte Zeit:</span>
                <span>10-20 Min.</span>
              </div>
              <Separator />
              <p className="text-sm text-muted-foreground">
                {taskDescription.substring(0, 150)}...
              </p>
            </CardContent>
          </Card>

          {/* AI Assistant */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  KI-Assistent
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowChat(!showChat)}
                >
                  {showChat ? 'Ausblenden' : 'Chat öffnen'}
                </Button>
              </CardTitle>
            </CardHeader>
            {showChat && (
              <CardContent className="space-y-3">
                <ScrollArea className="h-48 border rounded p-2">
                  <div className="space-y-2">
                    {chatMessages.map((message, index) => (
                      <div
                        key={index}
                        className={`p-2 rounded text-sm ${
                          message.role === 'user'
                            ? 'bg-blue-100 ml-4'
                            : 'bg-gray-100 mr-4'
                        }`}
                      >
                        {message.content}
                      </div>
                    ))}
                    {isChatLoading && (
                      <div className="bg-gray-100 mr-4 p-2 rounded text-sm">
                        Denke nach...
                      </div>
                    )}
                  </div>
                </ScrollArea>
                <div className="flex gap-2">
                  <Input
                    placeholder="Frage den KI-Assistenten..."
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendChatMessage()}
                  />
                  <Button
                    size="sm"
                    onClick={handleSendChatMessage}
                    disabled={!chatInput.trim() || isChatLoading}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};
