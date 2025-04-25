
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCustomers } from '@/hooks/useCustomers';
import { useTaskActivity } from '@/hooks/useTaskActivity';

// Form schema with validation
const taskSchema = z.object({
  description: z.string().min(10, { message: 'Beschreibung muss mindestens 10 Zeichen enthalten' }),
  customerId: z.string().uuid({ message: 'Bitte wählen Sie einen Kunden' })
});

type TaskFormValues = z.infer<typeof taskSchema>;

const CreateTask = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { logTaskOpen } = useTaskActivity();
  const [isMatching, setIsMatching] = useState(false);
  const { customers, isLoading: isLoadingCustomers } = useCustomers();

  const form = useForm<TaskFormValues>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      description: '',
      customerId: '',
    },
  });

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

        // Send notification to supervisors about unmatched task
        const { error: notificationError } = await supabase
          .from('notifications')
          .insert([{
            message: `Neue Aufgabe ohne passenden Use Case erstellt. Beschreibung: ${values.description.substring(0, 100)}...`,
            user_id: user.id, // This will be filtered by RLS to only go to supervisors
          }]);

        if (notificationError) {
          console.error("Error creating supervisor notification:", notificationError);
        }
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

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">Neue Aufgabe erstellen</h1>
        <p className="text-muted-foreground">Beschreiben Sie Ihre Anfrage und wählen Sie einen Kunden.</p>
      </div>

      <Card className="p-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="customerId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Kunde</FormLabel>
                  <Select
                    disabled={isLoadingCustomers}
                    onValueChange={field.onChange}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Kunde auswählen" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {customers?.map((customer) => (
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
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Beschreibung der Aufgabe</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Beschreiben Sie Ihre Anfrage möglichst detailliert..."
                      className="min-h-[200px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end space-x-2">
              <Button 
                variant="outline" 
                type="button" 
                onClick={() => navigate('/tasks')}
              >
                Abbrechen
              </Button>
              <Button 
                type="submit" 
                disabled={isMatching || !form.formState.isValid}
              >
                {isMatching ? 'Wird erstellt...' : 'Aufgabe erstellen'}
              </Button>
            </div>
          </form>
        </Form>
      </Card>
    </div>
  );
};

export default CreateTask;
