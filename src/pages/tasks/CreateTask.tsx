
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { FormControl, FormField, FormItem, FormLabel, Form } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useCustomers } from '@/hooks/useCustomers';
import { useTaskActivity } from '@/hooks/useTaskActivity';
import { CreateTaskDescription } from '@/components/tasks/CreateTaskDescription';

const taskFormSchema = z.object({
  description: z.string().min(10, "Beschreibung muss mindestens 10 Zeichen lang sein"),
  customerId: z.string().uuid(),
});

type TaskFormValues = z.infer<typeof taskFormSchema>;

const CreateTask = () => {
  const [isMatching, setIsMatching] = useState(false);
  const { customers, isLoading: isLoadingCustomers } = useCustomers();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { logTaskOpen } = useTaskActivity();

  const form = useForm<TaskFormValues>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: {
      description: '',
      customerId: undefined,
    }
  });

  const onSubmit = async (values: TaskFormValues) => {
    if (!user) return;
    
    setIsMatching(true);
    try {
      // Match use case
      const { data: matchResult, error: matchError } = await supabase.functions
        .invoke('match-use-case', {
          body: { description: values.description },
        });

      if (matchError) throw matchError;

      // Create task with initial status "new"
      const { data: task, error: taskError } = await supabase
        .from('tasks')
        .insert({
          description: values.description,
          title: values.description.split('\n')[0].slice(0, 100),
          created_by: user.id,
          customer_id: values.customerId,
          matched_use_case_id: matchResult?.matched_use_case_id,
          match_confidence: matchResult?.confidence,
          match_reasoning: matchResult?.reasoning,
          status: 'new'
        })
        .select()
        .single();

      if (taskError) throw taskError;

      // Add initial message
      await supabase
        .from('task_messages')
        .insert({
          task_id: task.id,
          content: values.description,
          role: 'user',
          created_by: user.id,
        });

      // Log task creation activity
      await logTaskOpen(task.id);

      toast({
        title: "Aufgabe erstellt",
        description: "Die Aufgabe wurde erfolgreich angelegt.",
      });

      // Navigate to the task detail page
      navigate(`/tasks/${task.id}`);
    } catch (error: any) {
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
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle>Neue Aufgabe erstellen</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="customerId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Kunde</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Kunde auswählen" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {isLoadingCustomers ? (
                          <SelectItem value="loading" disabled>Laden...</SelectItem>
                        ) : customers.length === 0 ? (
                          <SelectItem value="empty" disabled>Keine Kunden verfügbar</SelectItem>
                        ) : (
                          customers.map((customer) => (
                            <SelectItem key={customer.id} value={customer.id}>
                              {customer.name}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Beschreibung</FormLabel>
                    <CreateTaskDescription
                      description={field.value}
                      onDescriptionChange={field.onChange}
                      onSubmit={form.handleSubmit(onSubmit)}
                      isMatching={isMatching}
                    />
                  </FormItem>
                )}
              />
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
};

export default CreateTask;
