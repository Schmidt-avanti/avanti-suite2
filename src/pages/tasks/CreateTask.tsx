import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
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
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { useCustomers } from '@/hooks/useCustomers';
import { supabase } from '@/integrations/supabase/client';
import { useTaskActivity } from '@/hooks/useTaskActivity';
import { CreateTaskDescription } from '@/components/tasks/CreateTaskDescription';

interface TaskFormValues {
  customerId: string;
  description: string;
}

const CreateTask = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { customers, isLoading: isLoadingCustomers } = useCustomers();
  const { logTaskOpen } = useTaskActivity();
  const [isMatching, setIsMatching] = useState(false);
  
  const form = useForm<TaskFormValues>({
    defaultValues: {
      customerId: '',
      description: '',
    },
  });

  const customerId = form.watch('customerId');
  const description = form.watch('description');

  const onSubmit = async (values: TaskFormValues) => {
    if (!user) return;
    setIsMatching(true);
    try {
      let matchResult = null;

      try {
        const result = await supabase.functions.invoke('match-use-case', {
          body: { description: values.description },
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
          customer_id: values.customerId,
          matched_use_case_id: matchResult?.matched_use_case_id || null,
          match_confidence: matchResult?.confidence || null,
          match_reasoning: matchResult?.reasoning || "Kein Use Case automatisch erkannt.",
          status: 'new',
          source: 'manual',
          forwarded_to: matchResult?.matched_use_case_id ? null : 'KVP'
        })
        .select()
        .single();

      if (taskError) throw taskError;

      const { error: messageError } = await supabase
        .from('task_messages')
        .insert({
          task_id: task.id,
          content: values.description,
          role: 'user',
          created_by: user.id,
        });

      if (messageError) throw messageError;

      await logTaskOpen(task.id);

      toast({
        title: "Aufgabe erstellt",
        description: matchResult?.matched_use_case_id
          ? "Aufgabe mit Use Case erstellt."
          : "Aufgabe ohne Use Case erstellt – KVP benachrichtigt.",
      });

      navigate(`/tasks/${task.id}`);

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
