import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useAuth } from '@/contexts/AuthContext';
import { useTaskSessionContext } from '@/contexts/TaskSessionContext';
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
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { useCustomers } from '@/hooks/useCustomers';
import { supabase } from '@/integrations/supabase/client';
import { useTaskActivity } from '@/hooks/useTaskActivity';
import { CreateTaskDescription } from '@/components/tasks/CreateTaskDescription';
import { EndkundeSelector } from '@/components/tasks/EndkundeSelector';

interface TaskFormValues {
  customerId: string;
  endkundeId: string | null;
  description: string;
}

const CreateTask = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { customers, isLoading: isLoadingCustomers } = useCustomers();
  const { logTaskOpen } = useTaskActivity();
  const [isMatching, setIsMatching] = useState(false);
  const { startSession } = useTaskSessionContext();
  
  const form = useForm<TaskFormValues>({
    defaultValues: {
      customerId: '',
      endkundeId: null,
      description: '',
    },
  });

  const customerId = form.watch('customerId');
  const description = form.watch('description');

  const handleEndkundeChange = (endkundeId: string | null) => {
    form.setValue('endkundeId', endkundeId);
  };

  // Timer functionality has been removed

  const onSubmit = async (values: TaskFormValues) => {
    if (!user) return;
    setIsMatching(true);
    try {
      let matchResult = null;

      try {
        // Pass both description and customerId to the match-use-case function
        const result = await supabase.functions.invoke('match-use-case', {
          body: { 
            description: values.description,
            customerId: values.customerId 
          },
        });
        
        if (result.error) throw result.error;
        matchResult = result.data;
      } catch (matchError) {
        console.warn("No use case matched:", matchError);
        toast({
          title: "Kein Use Case erkannt",
          description: "Die Aufgabe wird trotzdem erstellt und an KVP weitergeleitet.",
        });

        // Optional: Trigger a webhook/email notification to KVP team
        await fetch('https://your-automation-endpoint/send-kvp-alert', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            customerId: values.customerId,
            description: values.description,
            createdBy: user.email,
            reason: 'Kein Use Case erkannt',
          }),
        });
      }

      const { data: task, error: taskError } = await supabase
        .from('tasks')
        .insert({
          description: values.description,
          title: values.description.split('\n')[0].slice(0, 100) || 'Neue Aufgabe',
          created_by: user.id,
          assigned_to: user.id, // Assign to the current user who created the task
          customer_id: values.customerId,
          matched_use_case_id: matchResult?.matched_use_case_id || null,
          match_confidence: matchResult?.confidence || null,
          match_reasoning: matchResult?.reasoning || "Kein Use Case automatisch erkannt.",
          status: 'new',
          source: 'manual',
          forwarded_to: matchResult?.matched_use_case_id ? null : 'KVP',
          endkunde_id: values.endkundeId // Add endkunde ID if selected
        })
        .select()
        .single();

      if (taskError) throw taskError;

      // Create an activity log entry for the assignment
      await supabase
        .from('task_activities')
        .insert({
          task_id: task.id,
          user_id: user.id,
          action: 'assign',
          status_from: 'new',
          status_to: 'new'
        });

      // Timer functionality has been removed

      const { error: messageError } = await supabase
        .from('task_messages')
        .insert({
          task_id: task.id,
          content: values.description,
          role: 'user',
          created_by: user.id,
        });

      if (messageError) throw messageError;

      // Direkt eine initiale AI-Anfrage für den Task triggern,
      // wenn ein Use Case erkannt wurde
      if (matchResult?.matched_use_case_id) {
        try {
          console.log("Auto-initializing chat for new task with matched use case");
          // Auto-Initiierung direkt nach Task-Erstellung
          await supabase.functions.invoke('handle-task-chat', {
            body: {
              taskId: task.id,
              useCaseId: matchResult.matched_use_case_id,
              message: "",
              buttonChoice: null,
              isAutoInitialization: true
            }
          });
          console.log("Chat auto-initialization completed");
        } catch (chatError) {
          console.error("Failed to auto-initialize chat:", chatError);
          // Fehler beim Chat-Start beeinträchtigt nicht den Task-Erstellungsprozess
        }
      } else {
        // Create a system-wide notification for tasks without a use case
        try {
          // Get all admin users to notify them
          const { data: adminUsers } = await supabase
            .from('profiles')
            .select('id')
            .eq('role', 'admin');
          
          if (adminUsers && adminUsers.length > 0) {
            // Create notifications for each admin
            const notifications = adminUsers.map(admin => ({
              user_id: admin.id,
              task_id: task.id,
              message: `Aufgabe ${task.readable_id || task.id.substring(0, 8)} ohne Use Case erstellt: "${task.title}"`,
              created_at: new Date().toISOString(),
              read_at: null
            }));
            
            // Also notify the current user if they're not an admin
            if (!adminUsers.some(admin => admin.id === user.id)) {
              notifications.push({
                user_id: user.id,
                task_id: task.id,
                message: `Aufgabe ${task.readable_id || task.id.substring(0, 8)} ohne Use Case erstellt: "${task.title}"`,
                created_at: new Date().toISOString(),
                read_at: null
              });
            }
            
            // Insert all notifications
            const { error: notificationError } = await supabase
              .from('notifications')
              .insert(notifications);
              
            if (notificationError) {
              console.error("Error creating notifications for task without use case:", notificationError);
            } else {
              console.log("Notifications created for task without use case:", task.id);
            }
          }
        } catch (notificationError) {
          console.error("Failed to create notifications for task without use case:", notificationError);
          // Notification errors shouldn't block the task creation process
        }
      }

      await logTaskOpen(task.id);
      
      // Create initial task session
      try {
        console.log('Creating initial task session for task:', task.id);
        await startSession(task.id);
        console.log('Initial task session created successfully');
      } catch (sessionError) {
        console.error('Error creating initial task session:', sessionError);
        // Don't block task creation if session creation fails
      }

      toast({
        title: "Aufgabe erstellt",
        description: matchResult?.matched_use_case_id
          ? `Aufgabe ${task.readable_id || ''} mit Use Case erstellt und Ihnen zugewiesen.`
          : `Aufgabe ${task.readable_id || ''} ohne Use Case erstellt und Ihnen zugewiesen – KVP benachrichtigt.`,
      });

      // Navigate to task detail with 'new' flag to trigger NoUseCaseDialog for tasks without a use case
      if (matchResult?.matched_use_case_id) {
        navigate(`/tasks/${task.id}`);
      } else {
        navigate(`/tasks/${task.id}?new=true`);
      }

    } catch (error: any) {
      console.error("Submit error:", error);
      toast({
        variant: "destructive",
        title: "Fehler",
        description: error.message,
      });
    } finally {
      setIsMatching(false);
    }
  };

  const handleFormSubmit = () => {
    if (!customerId) {
      toast({
        variant: "destructive",
        title: "Kunde erforderlich",
        description: "Bitte wählen Sie einen Kunden aus.",
      });
      return;
    }
    form.handleSubmit(onSubmit)();
  };

  const minLength = 10;
  const descriptionValid = description && description.length >= minLength;
  const formValid = customerId && descriptionValid;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Neue Aufgabe erstellen</h1>
      
      <Card className="p-6">
        <Form {...form}>
          <div className="space-y-6">
            <FormField
              control={form.control}
              name="customerId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Kunde</FormLabel>
                  <FormControl>
                    <Select
                      disabled={isMatching}
                      value={field.value}
                      onValueChange={field.onChange}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Kunde auswählen..." />
                      </SelectTrigger>
                      <SelectContent>
                        {isLoadingCustomers ? (
                          <SelectItem value="loading" disabled>Lädt...</SelectItem>
                        ) : (
                          customers.map((customer) => (
                            <SelectItem key={customer.id} value={customer.id}>
                              {customer.name}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Add Endkunde selection */}
            <FormField
              control={form.control}
              name="endkundeId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Endkunde (optional)</FormLabel>
                  <FormControl>
                    <EndkundeSelector 
                      customerId={customerId} 
                      value={field.value}
                      onChange={handleEndkundeChange}
                      disabled={isMatching}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
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
                      onSubmit={handleFormSubmit}
                      isMatching={isMatching}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </Form>
      </Card>
    </div>
  );
};

export default CreateTask;
