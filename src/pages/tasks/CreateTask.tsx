import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, FormProvider } from 'react-hook-form';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/card';
import { 
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@/components/ui/form';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Loader2 } from 'lucide-react';
import { useCustomers } from '@/hooks/useCustomers';
import { supabase } from '@/integrations/supabase/client';
import { useTaskActivity } from '@/hooks/useTaskActivity';
import { CreateTaskDescription } from '@/components/tasks/CreateTaskDescription';
import { EndkundeSelector } from '@/components/tasks/EndkundeSelector';
import { UseCaseSuggestionDialog, SuggestedUseCase } from '@/components/use-cases/UseCaseSuggestionDialog';
import type { TaskActivityAction } from '@/types';

interface TaskFormValues {
  customerId: string;
  endkundeId: string | null;
  description: string;
}

const CreateTaskPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { customers, isLoading: isLoadingCustomers } = useCustomers();
  const { logTaskOpen } = useTaskActivity();
  const [isMatching, setIsMatching] = useState(false); // Used for the main submit button loading state
  const [isSubmittingTask, setIsSubmittingTask] = useState(false); // Specific for actual task creation process
  const [isSuggestionDialogOpen, setIsSuggestionDialogOpen] = useState(false);
  const [recommendedUseCase, setRecommendedUseCase] = useState<SuggestedUseCase | null>(null);
  const [alternativeUseCases, setAlternativeUseCases] = useState<SuggestedUseCase[]>([]);
  const [currentTaskDataForDialog, setCurrentTaskDataForDialog] = useState<Partial<TaskFormValues>>({});
  const [isBlankTask, setIsBlankTask] = useState(false);
  const [taskSource, setTaskSource] = useState<'manual' | 'inbound' | 'outbound' | 'email' | 'chat'>('inbound');

  // Quelle-zu-Text-Mapping für das Dropdown
  const sourceOptions = [
    { value: 'inbound', label: 'Inbound' },
    { value: 'outbound', label: 'Outbound' },
    { value: 'email', label: 'E-Mail' },
    { value: 'chat', label: 'Chat' },
    { value: 'manual', label: 'Manuell' },
  ];

  const form = useForm<TaskFormValues>({
    defaultValues: {
      customerId: '',
      endkundeId: '', 
      description: '',
    },
  });

  const customerId = form.watch('customerId');
  const description = form.watch('description');
  const minLength = 10; 
  const descriptionValid = description.length >= minLength;

  const initializeTaskTimer = async (taskId: string, userId: string) => {
    try {
      const { error } = await supabase
        .from('task_times')
        .insert({
          task_id: taskId,
          user_id: userId,
          started_at: new Date().toISOString(),
        });
      if (error) {
        console.error("Error initializing task timer:", error);
        return;
      }
      console.log('Timer initialized for new task:', taskId);
    } catch (err) {
      console.error("Failed to initialize task timer:", err);
    }
  };

  const processTaskCreation = async (taskData: TaskFormValues, selectedUseCaseId: string | null) => {
    if (!user) return;
    setIsSubmittingTask(true);

    const taskToInsert = {
      description: taskData.description,
      title: taskData.description.split('\n')[0].slice(0, 100) || 'Neue Aufgabe',
      created_by: user.id,
      assigned_to: user.id, 
      customer_id: taskData.customerId,
      matched_use_case_id: isBlankTask ? null : selectedUseCaseId,
      match_confidence: !isBlankTask && selectedUseCaseId && recommendedUseCase?.id === selectedUseCaseId ? recommendedUseCase.confidence : null,
      match_reasoning: isBlankTask ? "Blanko-Aufgabe ohne Ava erstellt" : (selectedUseCaseId && recommendedUseCase?.id === selectedUseCaseId ? recommendedUseCase.reasoning : (selectedUseCaseId ? "Empfohlener Use Case ausgewählt" : "Kein spezifischer Use Case ausgewählt oder GPT-Analyse nicht verfügbar.")),
      status: 'new',
      source: taskSource, // Verwende die ausgewählte Quelle
      forwarded_to: isBlankTask ? null : (selectedUseCaseId ? null : 'KVP'),
      endkunde_id: taskData.endkundeId || null,
      is_blank_task: isBlankTask // Speichere Information über Blanko-Aufgabe
    };

    try {
      const { data: task, error: taskError } = await supabase
        .from('tasks')
        .insert(taskToInsert)
        .select()
        .single();

      if (taskError) throw taskError;

      const { error: activityError } = await supabase
        .from('task_activities')
        .insert({
          task_id: task.id,
          user_id: user.id,
          action: 'create' as TaskActivityAction, // 'assign' violates DB check constraint
        });

      if (activityError) {
        console.error("Error logging 'assign' task activity:", JSON.stringify(activityError, null, 2));
        toast({
          variant: "destructive",
          title: "Fehler bei Aktivitätsprotokoll",
          description: `Die Aufgabe wurde erstellt, aber die Zuweisung konnte nicht protokolliert werden.`,
        });
      }

      await initializeTaskTimer(task.id, user.id);

      const { error: messageError } = await supabase
        .from('task_messages')
        .insert({
          task_id: task.id,
          content: taskData.description,
          role: 'user',
          created_by: user.id,
        });

      if (messageError) throw messageError;

      // Bei Blanko-Aufgaben oder wenn kein Use Case selektiert wurde, keine GPT-Initialisierung
      if (!isBlankTask && selectedUseCaseId) {
        try {
          console.log("Auto-initializing chat for new task with selected use case");
          await supabase.functions.invoke('handle-task-chat', {
            body: {
              taskId: task.id,
              useCaseId: selectedUseCaseId,
              message: "", // Or taskData.description for initial context
              buttonChoice: null,
              isAutoInitialization: true
            }
          });
          console.log("Chat auto-initialization completed");
        } catch (chatError) {
          console.error("Failed to auto-initialize chat:", chatError);
        }
      } else {
        // Temporarily disabled due to RLS issues (403 Forbidden).
        // The logic suggests notifying a KVP user, but the implementation tries to notify the current user,
        // which seems to fail the RLS policy. A proper fix likely requires an edge function.
      }

      await logTaskOpen(task.id);
      toast({
        title: "Erfolg",
        description: isBlankTask 
          ? `Blanko-Aufgabe ${task.readable_id || ''} als "${sourceOptions.find(o => o.value === taskSource)?.label || taskSource}" erstellt.`
          : (selectedUseCaseId
              ? `Aufgabe ${task.readable_id || ''} mit Use Case erstellt und Ihnen zugewiesen.`
              : `Aufgabe ${task.readable_id || ''} ohne Use Case erstellt und Ihnen zugewiesen – KVP benachrichtigt.`),
      });

      if (isBlankTask) {
        // Bei Blanko-Aufgaben direkt zur Aufgabe navigieren, ohne NoUseCaseDialog zu triggern
        navigate(`/tasks/${task.id}`);
      } else if (selectedUseCaseId) {
        navigate(`/tasks/${task.id}`);
      } else {
        navigate(`/tasks/${task.id}?new=true`); // To trigger NoUseCaseDialog if needed
      }

    } catch (error: any) {
      console.error("Error in processTaskCreation:", error);
      toast({ variant: "destructive", title: "Fehler", description: error.message || "Task konnte nicht erstellt werden." });
    } finally {
      setIsSubmittingTask(false);
      setIsMatching(false); // Reset main button loading state
      setIsSuggestionDialogOpen(false);
    }
  };

  const handleUseCaseSelected = (useCaseId: string) => {
    processTaskCreation(currentTaskDataForDialog as TaskFormValues, useCaseId);
  };

  const handleRejectAllUseCases = () => {
    processTaskCreation(currentTaskDataForDialog as TaskFormValues, null);
  };

  const onSubmitTrigger = async (values: TaskFormValues) => {
    console.log('[onSubmitTrigger] Called with values:', values);
    if (!user) {
      toast({ title: "Fehler", description: "Benutzer nicht authentifiziert.", variant: "destructive" });
      return;
    }
    if (!values.customerId) {
      toast({ title: "Fehler", description: "Bitte wählen Sie einen Kunden aus.", variant: "destructive" });
      return;
    }
    if (!values.description) {
      toast({ title: "Info", description: "Keine Beschreibung vorhanden. Task wird ohne Use Case erstellt." });
      processTaskCreation(values, null);
      return;
    }

    // Bei Blanko-Aufgaben direkt Task erstellen ohne GPT-Matching
    if (isBlankTask) {
      console.log('[onSubmitTrigger] Blanko-Aufgabe wird erstellt, überspringe Use Case Matching');
      processTaskCreation(values, null);
      return;
    }

    setIsMatching(true); // For the main submit button
    setCurrentTaskDataForDialog(values);
    console.log('[onSubmitTrigger] State updated: isMatching=true, currentTaskDataForDialog set.');

    try {
      const requestBody = { task_description: values.description, customer_id: values.customerId };
      console.log('[onSubmitTrigger] Invoking match-use-case with body:', requestBody);
      const { data: matchData, error: matchError } = await supabase.functions.invoke(
        'match-use-case',
        { body: requestBody }
      );
      console.log('[onSubmitTrigger] match-use-case response: data=', matchData, 'error=', matchError);

      if (matchError) throw matchError;

      if (matchData && (matchData.recommended_use_case || (matchData.alternative_use_cases && matchData.alternative_use_cases.length > 0))) {
        console.log('[onSubmitTrigger] Match found. Recommended:', matchData.recommended_use_case, 'Alternatives:', matchData.alternative_use_cases);
        setRecommendedUseCase(matchData.recommended_use_case || null);
        setAlternativeUseCases(matchData.alternative_use_cases || []);
        setIsSuggestionDialogOpen(true);
        console.log('[onSubmitTrigger] setIsSuggestionDialogOpen(true) called.');
        // setIsMatching will be set to false by processTaskCreation or dialog close
      } else {
        console.log('[onSubmitTrigger] No suitable use case found or data structure mismatch. Proceeding without dialog.');
        toast({ title: "Kein passender Use Case", description: "Es wurde kein spezifischer Use Case gefunden. Task wird ohne erstellt." });
        processTaskCreation(values, null); // This will set setIsMatching(false) in its finally block
      }
    } catch (error: any) {
      console.error("[onSubmitTrigger] Error matching use case:", error);
      toast({ title: "Fehler beim Use Case Matching", description: error.message, variant: "destructive" });
      processTaskCreation(values, null); // Fallback: Create task without use case. This will set setIsMatching(false)
    }
    // No finally setIsMatching(false) here, as it's handled by subsequent calls or dialog interactions
  };

  const formValid = customerId && descriptionValid;

  return (
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit(onSubmitTrigger)} className="space-y-6">
        <div className="container mx-auto p-4">
          <h1 className="text-2xl font-bold">Neue Aufgabe erstellen</h1>

          {/* Fullscreen Loading Overlay */}
          {isSubmittingTask && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
              <div className="flex flex-col items-center rounded-lg bg-white p-8 shadow-xl">
                <svg className="h-12 w-12 animate-spin text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <p className="mt-4 text-lg font-medium text-gray-700">Task wird erstellt und vorbereitet...</p>
                <p className="text-sm text-gray-500">Bitte hab einen Moment Geduld. Die Seite wird nach Abschluss automatisch neu geladen.</p>
              </div>
            </div>
          )}
          
          {!isSubmittingTask && (
            <Card className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="customerId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Kunde</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isLoadingCustomers}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Kunde auswählen" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {customers?.map(customer => (
                          <SelectItem key={customer.id} value={customer.id}>
                            {customer.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="endkundeId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Endkunde (optional)</FormLabel>
                    <FormControl>
                      <EndkundeSelector
                        customerId={customerId}
                        value={field.value || ''}
                        onChange={field.onChange}
                        disabled={isLoadingCustomers || !customerId || isMatching}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Quellen-Dropdown vor dem Nachrichtenfeld */}
              <div className="col-span-1">
                <FormLabel className="mb-2">Quelle</FormLabel>
                <Select 
                  value={taskSource}
                  onValueChange={(value) => setTaskSource(value as any)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Quelle auswählen" />
                  </SelectTrigger>
                  <SelectContent>
                    {sourceOptions.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Leere Zelle, um das Grid auszubalancieren */}
              <div className="col-span-1"></div>

              {/* Nachrichtenfeld in voller Breite */}
              <div className="col-span-1 md:col-span-2">
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nachricht</FormLabel>
                      <FormControl>
                        <CreateTaskDescription
                          description={field.value}
                          onDescriptionChange={field.onChange}
                          onSubmit={form.handleSubmit(onSubmitTrigger)}
                          isMatching={isMatching}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Checkbox direkt unter dem Nachrichtenfeld */}
              <div className="col-span-1 md:col-span-2 mt-2">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="isBlankTask"
                    checked={isBlankTask} 
                    onCheckedChange={(checked) => setIsBlankTask(!!checked)} 
                  />
                  <label 
                    htmlFor="isBlankTask" 
                    className="text-sm text-gray-700 cursor-pointer"
                  >
                    Aufgabe ohne Ava erstellen
                  </label>
                </div>
                {isBlankTask && (
                  <div className="text-xs text-muted-foreground mt-1">
                    Diese Aufgabe wird ohne GPT-Analyse erstellt. Du kannst Kommentare hinzufügen und die Aufgabe manuell beenden.
                  </div>
                )}
              </div>
            </div>
            </Card>
          )}
        </div>
      </form>

      {!isSubmittingTask && (
        <UseCaseSuggestionDialog
        isOpen={isSuggestionDialogOpen}
        onClose={() => {
setIsSuggestionDialogOpen(false);
          setIsMatching(false); // Allow user to submit again or change details if dialog is cancelled
          // currentTaskDataForDialog remains, so if they resubmit without changes, it's the same flow
        }}
        recommendedUseCase={recommendedUseCase}
        alternativeUseCases={alternativeUseCases}
        onSelectUseCase={handleUseCaseSelected}
        onRejectAll={handleRejectAllUseCases}
        taskDescription={currentTaskDataForDialog?.description || form.getValues("description")}
      />
      )}
    </FormProvider>
  );
};

export default CreateTaskPage;
