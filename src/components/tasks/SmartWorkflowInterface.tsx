
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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
  User,
  Info,
  ChevronRight,
  Target
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
  detailedInstructions: string;
  helpText?: string;
  type: 'checkbox' | 'textarea' | 'action';
  required: boolean;
  completed?: boolean;
  value?: string;
  suggestions?: string[];
  exampleAnswer?: string;
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
      
      // Create clear, detailed workflow steps
      const steps: WorkflowStep[] = [
        {
          id: '1',
          title: 'Kundenanfrage analysieren',
          description: 'Verstehen Sie genau, was der Kunde möchte',
          detailedInstructions: 'Lesen Sie die Kundenanfrage aufmerksam durch und identifizieren Sie das Hauptproblem. Fassen Sie in eigenen Worten zusammen, was der Kunde benötigt.',
          helpText: `Die Kundenanfrage lautet: "${taskDescription.substring(0, 200)}${taskDescription.length > 200 ? '...' : ''}"`,
          type: 'textarea',
          required: true,
          exampleAnswer: 'Der Kunde hat ein Problem mit...',
          suggestions: [
            'Der Kunde meldet ein technisches Problem',
            'Der Kunde benötigt Informationen zu',
            'Der Kunde möchte eine Störung melden'
          ]
        },
        {
          id: '2',
          title: 'Lösungsweg bestimmen',
          description: 'Entscheiden Sie, wie Sie dem Kunden helfen können',
          detailedInstructions: 'Überlegen Sie, welche konkreten Schritte notwendig sind, um das Problem des Kunden zu lösen. Beschreiben Sie Ihren Lösungsansatz.',
          helpText: 'Denken Sie daran: Können Sie direkt helfen, muss jemand anders kontaktiert werden, oder benötigen Sie weitere Informationen?',
          type: 'textarea',
          required: true,
          exampleAnswer: 'Ich werde dem Kunden helfen, indem ich...',
          suggestions: [
            'Direkte Hilfe durch Anleitung',
            'Weiterleitung an Techniker',
            'Weitere Informationen erforderlich'
          ]
        },
        {
          id: '3',
          title: 'Maßnahmen durchführen',
          description: 'Führen Sie die geplanten Schritte aus',
          detailedInstructions: 'Setzen Sie Ihren Lösungsplan um. Das kann eine Anleitung für den Kunden sein, ein Technikertermin, oder andere konkrete Aktionen.',
          helpText: 'Dokumentieren Sie alle Schritte, die Sie unternommen haben',
          type: 'textarea',
          required: true,
          exampleAnswer: 'Ich habe folgende Maßnahmen durchgeführt...',
          suggestions: [
            'Anleitung gegeben',
            'Techniker beauftragt',
            'Informationen übermittelt'
          ]
        },
        {
          id: '4',
          title: 'Kunde informieren',
          description: 'Bestätigen Sie, dass der Kunde informiert wurde',
          detailedInstructions: 'Haben Sie den Kunden über das Ergebnis oder die nächsten Schritte informiert? Dies ist wichtig für die Kundenzufriedenheit.',
          helpText: 'Der Kunde sollte wissen, was als nächstes passiert',
          type: 'checkbox',
          required: true
        }
      ];
      
      setWorkflowSteps(steps);
      
      // Add helpful welcome message
      setChatMessages([{
        role: 'assistant',
        content: `Hallo! Ich helfe Ihnen bei der Bearbeitung dieser ${data.type || 'Kundenanfrage'}. 

**Ihr aktueller Schritt:** ${steps[0].title}

${steps[0].detailedInstructions}

Falls Sie Fragen haben oder Unterstützung benötigen, können Sie mich jederzeit fragen!`
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
      const nextIndex = currentStepIndex + 1;
      setCurrentStepIndex(nextIndex);
      
      // Send helpful message for next step
      const nextStep = workflowSteps[nextIndex];
      setChatMessages(prev => [...prev, {
        role: 'assistant',
        content: `Gut gemacht! Sie sind jetzt bei Schritt ${nextIndex + 1}: **${nextStep.title}**

${nextStep.detailedInstructions}

Brauchen Sie Hilfe bei diesem Schritt?`
      }]);
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
        content: data.response || 'Entschuldigung, ich konnte Ihnen nicht helfen. Versuchen Sie es erneut oder wenden Sie sich an Ihren Supervisor.'
      }]);
      
    } catch (error) {
      console.error('Chat error:', error);
      setChatMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'Entschuldigung, es gab einen technischen Fehler. Versuchen Sie es später erneut oder wenden Sie sich an Ihren Supervisor für weitere Hilfe.'
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
        description: "Bitte vervollständigen Sie alle erforderlichen Schritte bevor Sie die Aufgabe abschließen."
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
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
          <p>Lädt Workflow-Details...</p>
        </div>
      </div>
    );
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
            <h1 className="text-2xl font-bold text-blue-900">{useCase?.title}</h1>
            <p className="text-blue-700">Strukturierte Schritt-für-Schritt Bearbeitung</p>
          </div>
        </div>
        <Badge variant="secondary" className="text-sm px-3 py-1">
          Schritt {currentStepIndex + 1} von {workflowSteps.length}
        </Badge>
      </div>

      {/* Progress */}
      <Card className="mb-6 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-blue-900">Gesamtfortschritt</span>
            <span className="text-sm text-blue-700 font-medium">
              {getCompletedSteps()}/{workflowSteps.length} Schritte abgeschlossen
            </span>
          </div>
          <Progress value={getProgressPercentage()} className="mb-4" />
          
          <div className="flex gap-1 overflow-x-auto">
            {workflowSteps.map((step, index) => (
              <div
                key={step.id}
                className={`flex-1 min-w-[120px] p-3 rounded-lg text-center text-xs transition-all ${
                  index === currentStepIndex
                    ? 'bg-blue-500 text-white border-2 border-blue-600 shadow-md'
                    : step.completed
                    ? 'bg-green-100 text-green-800 border border-green-300'
                    : 'bg-gray-100 text-gray-600 border border-gray-200'
                }`}
              >
                <div className="flex items-center justify-center mb-1">
                  {step.completed ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : index === currentStepIndex ? (
                    <Target className="h-4 w-4" />
                  ) : (
                    <Circle className="h-4 w-4" />
                  )}
                </div>
                <div className="font-medium">{step.title}</div>
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
            <Card className="border-2 border-blue-300">
              <CardHeader className="bg-blue-50">
                <CardTitle className="flex items-center gap-3">
                  <div className="bg-blue-500 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold">
                    {currentStepIndex + 1}
                  </div>
                  <div>
                    <div className="text-xl text-blue-900">{currentStep.title}</div>
                    <div className="text-blue-700 text-sm font-normal">{currentStep.description}</div>
                  </div>
                  {currentStep.required && <Badge variant="destructive">Pflicht</Badge>}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-6">
                
                {/* Detailed Instructions */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start gap-2">
                    <Info className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="font-semibold text-blue-900 mb-2">Was Sie jetzt tun müssen:</h4>
                      <p className="text-blue-800">{currentStep.detailedInstructions}</p>
                    </div>
                  </div>
                </div>

                {currentStep.helpText && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                    <div className="flex items-start gap-2">
                      <HelpCircle className="h-4 w-4 text-yellow-600 mt-0.5" />
                      <div>
                        <p className="text-sm text-yellow-800 font-medium">Zusätzliche Information:</p>
                        <p className="text-sm text-yellow-700">{currentStep.helpText}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Step Input */}
                {currentStep.type === 'checkbox' && (
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3 p-3 border border-gray-300 rounded-lg">
                      <Checkbox
                        checked={currentStep.completed || false}
                        onCheckedChange={(checked) => updateStepValue(currentStep.id, checked)}
                        className="h-5 w-5"
                      />
                      <span className="text-lg">Ich habe diesen Schritt abgeschlossen</span>
                    </div>
                  </div>
                )}

                {currentStep.type === 'textarea' && (
                  <div className="space-y-4">
                    {currentStep.exampleAnswer && (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                        <p className="text-sm font-medium text-green-800 mb-1">Beispiel für eine gute Antwort:</p>
                        <p className="text-sm text-green-700 italic">"{currentStep.exampleAnswer}"</p>
                      </div>
                    )}
                    
                    <Textarea
                      placeholder="Geben Sie hier Ihre Antwort ein..."
                      value={currentStep.value || ''}
                      onChange={(e) => updateStepValue(currentStep.id, e.target.value)}
                      className="min-h-24 text-base"
                    />
                    
                    {currentStep.suggestions && (
                      <div className="space-y-2">
                        <p className="text-sm font-medium flex items-center gap-1">
                          <Lightbulb className="h-4 w-4 text-yellow-500" />
                          Schnelle Auswahl:
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
                <div className="flex justify-between pt-6 border-t">
                  <Button
                    variant="outline"
                    onClick={handlePreviousStep}
                    disabled={currentStepIndex === 0}
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Vorheriger Schritt
                  </Button>
                  
                  {currentStepIndex < workflowSteps.length - 1 ? (
                    <Button
                      onClick={handleNextStep}
                      disabled={!canProceedToNext()}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      Nächster Schritt
                      <ChevronRight className="h-4 w-4 ml-2" />
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
                  Abschließende Notizen (Optional)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  placeholder="Zusätzliche Bemerkungen zur Bearbeitung..."
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
                <span className="font-medium">Workflow:</span>
                <span>{useCase?.type || 'Standard'}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4" />
                <span className="font-medium">Geschätzt:</span>
                <span>10-20 Min.</span>
              </div>
              <div className="border-t pt-3">
                <p className="text-sm text-gray-600 font-medium mb-1">Kundenanfrage:</p>
                <p className="text-sm text-gray-800">{taskDescription.substring(0, 150)}...</p>
              </div>
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
                <div className="h-48 border rounded p-3 overflow-y-auto bg-gray-50">
                  <div className="space-y-3">
                    {chatMessages.map((message, index) => (
                      <div
                        key={index}
                        className={`p-2 rounded text-sm ${
                          message.role === 'user'
                            ? 'bg-blue-100 ml-4 border-l-2 border-blue-400'
                            : 'bg-white mr-4 border border-gray-200 shadow-sm'
                        }`}
                      >
                        <div className="whitespace-pre-wrap">{message.content}</div>
                      </div>
                    ))}
                    {isChatLoading && (
                      <div className="bg-white mr-4 p-2 rounded text-sm border border-gray-200">
                        <div className="flex items-center gap-2">
                          <div className="animate-spin h-3 w-3 border border-blue-500 border-t-transparent rounded-full"></div>
                          Denke nach...
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Frage den KI-Assistenten..."
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendChatMessage()}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm"
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
