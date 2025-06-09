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
  ArrowLeft, 
  Send,
  Clock,
  User,
  Info,
  ChevronRight,
  Target,
  Plus,
  SkipForward,
  Edit3,
  AlertCircle
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface DatabaseUseCase {
  id: string;
  title: string;
  information_needed: string | null;
  steps: string | null;
  type: string | null;
}

interface WorkflowStep {
  id: string;
  originalIndex: number;
  title: string;
  completed: boolean;
  value?: string;
  isDeviation?: boolean;
  deviationReason?: string;
}

interface Deviation {
  stepIndex: number;
  reason: string;
  newSteps?: string[];
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
  const [deviations, setDeviations] = useState<Deviation[]>([]);
  const [showDeviationDialog, setShowDeviationDialog] = useState(false);
  const [deviationType, setDeviationType] = useState<'skip' | 'add' | 'modify'>('modify');
  const [deviationReason, setDeviationReason] = useState('');
  const [additionalStep, setAdditionalStep] = useState('');
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
      
      // Parse the real steps from the use case
      const realSteps = parseUseCaseSteps(data.steps || '');
      console.log('Parsed steps:', realSteps);
      setWorkflowSteps(realSteps);
      
      // Add helpful welcome message
      setChatMessages([{
        role: 'assistant',
        content: `Hallo! Ich helfe Ihnen bei der Bearbeitung: **${data.title}**

**Aktuelle Aufgabe:** ${realSteps[0]?.title || 'Erste Schritte laden...'}

Falls ein Schritt nicht passt oder Sie vom Plan abweichen müssen, nutzen Sie die "Plan anpassen" Buttons. Ich unterstütze Sie gerne!`
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

  const parseUseCaseSteps = (stepsString: string): WorkflowStep[] => {
    if (!stepsString) return [];
    
    console.log('Original steps string:', stepsString);
    
    // Try different patterns to split numbered steps
    let stepLines: string[] = [];
    
    // Pattern 1: "1. Step, 2. Step, 3. Step" (comma-separated)
    if (stepsString.includes(',') && /\d+\.\s/.test(stepsString)) {
      stepLines = stepsString.split(',').map(s => s.trim());
    }
    // Pattern 2: "1. Step\n2. Step\n3. Step" (newline-separated)
    else if (stepsString.includes('\n') && /\d+\.\s/.test(stepsString)) {
      stepLines = stepsString.split('\n').filter(line => line.trim());
    }
    // Pattern 3: Manual split by number patterns like "1. text 2. text 3. text"
    else if (/\d+\.\s/.test(stepsString)) {
      // Split by number patterns like "1. ", "2. ", etc.
      const matches = stepsString.split(/(?=\d+\.\s)/);
      stepLines = matches.filter(match => match.trim()).map(match => match.trim());
    }
    // Fallback: treat as single step
    else {
      stepLines = [stepsString.trim()];
    }
    
    console.log('Split step lines:', stepLines);
    
    return stepLines
      .filter(step => step.trim())
      .map((step, index) => {
        // Clean up the step text - remove leading numbers and clean whitespace
        let cleanStep = step.trim();
        
        // Remove leading number pattern like "1. " or "2. "
        cleanStep = cleanStep.replace(/^\d+\.\s*/, '');
        
        // Remove trailing commas or periods if they exist
        cleanStep = cleanStep.replace(/[,.]$/, '');
        
        return {
          id: `step-${index}`,
          originalIndex: index,
          title: cleanStep.trim(),
          completed: false,
          isDeviation: false
        };
      })
      .filter(step => step.title.length > 0); // Remove empty steps
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
    return currentStep && currentStep.completed;
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

Führen Sie diesen Schritt durch und haken Sie ihn ab, wenn Sie fertig sind. Bei Problemen nutzen Sie "Plan anpassen".`
      }]);
    }
  };

  const handlePreviousStep = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1);
    }
  };

  const handleDeviation = async (type: 'skip' | 'add' | 'modify') => {
    setDeviationType(type);
    setShowDeviationDialog(true);
  };

  const saveDeviation = async () => {
    if (!deviationReason.trim()) {
      toast({
        variant: "destructive",
        title: "Grund erforderlich",
        description: "Bitte geben Sie einen Grund für die Abweichung an."
      });
      return;
    }

    try {
      // Save deviation to database
      const { error } = await supabase
        .from('workflow_deviations')
        .insert({
          task_id: taskId,
          use_case_id: useCaseId,
          deviation_text: `${deviationType === 'skip' ? 'Schritt übersprungen' : 
                          deviationType === 'add' ? 'Zusätzlicher Schritt' : 
                          'Schritt geändert'}: ${getCurrentStep()?.title || 'Unbekannt'}. Grund: ${deviationReason}${
                          deviationType === 'add' && additionalStep ? `. Zusätzlicher Schritt: ${additionalStep}` : ''}`
        });

      if (error) throw error;

      // Handle different deviation types
      if (deviationType === 'skip') {
        // Mark current step as completed but note the deviation
        const currentStep = getCurrentStep();
        if (currentStep) {
          updateStepValue(currentStep.id, true);
          setWorkflowSteps(prev => prev.map(step => 
            step.id === currentStep.id 
              ? { ...step, isDeviation: true, deviationReason }
              : step
          ));
        }
      } else if (deviationType === 'add' && additionalStep.trim()) {
        // Add new step after current one
        const newStep: WorkflowStep = {
          id: `deviation-${Date.now()}`,
          originalIndex: currentStepIndex + 0.5,
          title: additionalStep,
          completed: false,
          isDeviation: true,
          deviationReason
        };
        
        setWorkflowSteps(prev => [
          ...prev.slice(0, currentStepIndex + 1),
          newStep,
          ...prev.slice(currentStepIndex + 1)
        ]);
      }

      // Add to chat
      setChatMessages(prev => [...prev, {
        role: 'assistant',
        content: `Abweichung dokumentiert: ${deviationReason}${
          deviationType === 'add' && additionalStep ? `\n\nZusätzlicher Schritt hinzugefügt: "${additionalStep}"` : ''
        }\n\nSie können normal mit dem Workflow fortfahren.`
      }]);

      // Add deviation to local state
      setDeviations(prev => [...prev, {
        stepIndex: currentStepIndex,
        reason: deviationReason,
        newSteps: deviationType === 'add' && additionalStep ? [additionalStep] : undefined
      }]);

      toast({
        title: "Abweichung dokumentiert",
        description: "Die Abweichung wurde erfolgreich gespeichert."
      });

      // Reset dialog
      setDeviationReason('');
      setAdditionalStep('');
      setShowDeviationDialog(false);

    } catch (error: any) {
      console.error('Error saving deviation:', error);
      toast({
        variant: "destructive",
        title: "Fehler",
        description: "Abweichung konnte nicht gespeichert werden."
      });
    }
  };

  const handleSendChatMessage = async () => {
    if (!chatInput.trim()) return;
    
    const userMessage = chatInput;
    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsChatLoading(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('handle-task-chat', {
        body: {
          taskId: taskId,
          useCaseId: useCaseId,
          message: userMessage,
          context: {
            currentStep: getCurrentStep(),
            taskDescription: taskDescription,
            completedSteps: workflowSteps.filter(s => s.completed),
            deviations: deviations
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
        content: 'Entschuldigung, es gab einen technischen Fehler. Versuchen Sie es später erneut.'
      }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleCompleteTask = async () => {
    const requiredStepsCompleted = workflowSteps.every(step => step.completed);
      
    if (!requiredStepsCompleted) {
      toast({
        variant: "destructive",
        title: "Alle Schritte erforderlich",
        description: "Bitte vervollständigen Sie alle Schritte oder dokumentieren Sie Abweichungen."
      });
      return;
    }
    
    try {
      setIsSaving(true);
      
      // Save workflow progress including deviations
      const workflowData = {
        steps: workflowSteps.map(step => ({
          id: step.id,
          title: step.title,
          completed: step.completed,
          value: step.value || '',
          isDeviation: step.isDeviation || false,
          deviationReason: step.deviationReason
        })),
        deviations: deviations,
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

      await supabase
        .from('tasks')
        .update({ status: 'completed' })
        .eq('id', taskId);

      toast({
        title: "Aufgabe erfolgreich abgeschlossen!",
        description: `Alle Schritte wurden dokumentiert${deviations.length > 0 ? ` (${deviations.length} Abweichung${deviations.length > 1 ? 'en' : ''} dokumentiert)` : ''}.`
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
            <p className="text-blue-700">Schritt-für-Schritt Abarbeitung der Kundenanfrage</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-sm px-3 py-1">
            Schritt {currentStepIndex + 1} von {workflowSteps.length}
          </Badge>
          {deviations.length > 0 && (
            <Badge variant="outline" className="text-orange-600 border-orange-300">
              {deviations.length} Abweichung{deviations.length > 1 ? 'en' : ''}
            </Badge>
          )}
        </div>
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
                    ? step.isDeviation 
                      ? 'bg-orange-100 text-orange-800 border border-orange-300'
                      : 'bg-green-100 text-green-800 border border-green-300'
                    : 'bg-gray-100 text-gray-600 border border-gray-200'
                }`}
              >
                <div className="flex items-center justify-center mb-1">
                  {step.completed ? (
                    step.isDeviation ? (
                      <AlertTriangle className="h-4 w-4" />
                    ) : (
                      <CheckCircle className="h-4 w-4" />
                    )
                  ) : index === currentStepIndex ? (
                    <Target className="h-4 w-4" />
                  ) : (
                    <Circle className="h-4 w-4" />
                  )}
                </div>
                <div className="font-medium line-clamp-2">{step.title}</div>
                {step.isDeviation && (
                  <div className="text-xs text-orange-600 mt-1">Abweichung</div>
                )}
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
                  <div className="flex-1">
                    <div className="text-xl text-blue-900">{currentStep.title}</div>
                    {currentStep.isDeviation && (
                      <div className="text-sm text-orange-600 mt-1">
                        ⚠️ Abweichung: {currentStep.deviationReason}
                      </div>
                    )}
                  </div>
                  <Badge variant="default">Schritt {currentStepIndex + 1}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-6">
                
                {/* Step completion */}
                <div className="space-y-3">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-start gap-2">
                      <Info className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <h4 className="font-semibold text-blue-900 mb-2">Führen Sie diesen Schritt durch:</h4>
                        <p className="text-blue-800">{currentStep.title}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 p-3 border border-gray-300 rounded-lg bg-white">
                    <Checkbox
                      checked={currentStep.completed || false}
                      onCheckedChange={(checked) => updateStepValue(currentStep.id, checked)}
                      className="h-5 w-5"
                    />
                    <span className="text-lg">Dieser Schritt ist erledigt</span>
                  </div>

                  <Textarea
                    placeholder="Notizen zu diesem Schritt (optional)..."
                    value={currentStep.value || ''}
                    onChange={(e) => updateStepValue(currentStep.id, e.target.value)}
                    className="min-h-16 text-base"
                  />
                </div>

                {/* Deviation buttons */}
                <div className="border-t pt-4">
                  <p className="text-sm font-medium text-gray-700 mb-3">Plan anpassen:</p>
                  <div className="flex gap-2 flex-wrap">
                    <Dialog open={showDeviationDialog} onOpenChange={setShowDeviationDialog}>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm" onClick={() => handleDeviation('skip')}>
                          <SkipForward className="h-4 w-4 mr-1" />
                          Schritt überspringen
                        </Button>
                      </DialogTrigger>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm" onClick={() => handleDeviation('add')}>
                          <Plus className="h-4 w-4 mr-1" />
                          Zusätzlicher Schritt
                        </Button>
                      </DialogTrigger>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm" onClick={() => handleDeviation('modify')}>
                          <Edit3 className="h-4 w-4 mr-1" />
                          Schritt anpassen
                        </Button>
                      </DialogTrigger>
                    </Dialog>
                  </div>
                </div>

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
                  <MessageSquare className="h-5 w-5" />
                  Abschließende Zusammenfassung
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  placeholder="Zusammenfassung der Bearbeitung, wichtige Erkenntnisse..."
                  value={finalNotes}
                  onChange={(e) => setFinalNotes(e.target.value)}
                  className="min-h-20"
                />
                {deviations.length > 0 && (
                  <div className="mt-3 p-3 bg-orange-50 border border-orange-200 rounded">
                    <p className="text-sm font-medium text-orange-800">
                      {deviations.length} Abweichung{deviations.length > 1 ? 'en' : ''} dokumentiert
                    </p>
                  </div>
                )}
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
                <span className="font-medium">Fortschritt:</span>
                <span>{getCompletedSteps()}/{workflowSteps.length} Schritte</span>
              </div>
              <div className="border-t pt-3">
                <p className="text-sm text-gray-600 font-medium mb-1">Beschreibung:</p>
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

      {/* Deviation Dialog */}
      <Dialog open={showDeviationDialog} onOpenChange={setShowDeviationDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-500" />
              Plan anpassen
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              {deviationType === 'skip' && 'Warum möchten Sie diesen Schritt überspringen?'}
              {deviationType === 'add' && 'Welcher zusätzliche Schritt ist nötig?'}
              {deviationType === 'modify' && 'Wie wurde dieser Schritt angepasst?'}
            </p>
            
            <Textarea
              placeholder="Grund für die Abweichung..."
              value={deviationReason}
              onChange={(e) => setDeviationReason(e.target.value)}
              className="min-h-20"
            />
            
            {deviationType === 'add' && (
              <Textarea
                placeholder="Beschreibung des zusätzlichen Schritts..."
                value={additionalStep}
                onChange={(e) => setAdditionalStep(e.target.value)}
                className="min-h-16"
              />
            )}
            
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowDeviationDialog(false)}>
                Abbrechen
              </Button>
              <Button onClick={saveDeviation}>
                Abweichung dokumentieren
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
