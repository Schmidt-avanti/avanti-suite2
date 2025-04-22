import React, { useState, useEffect } from 'react';
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
  const [availableCustomers, setAvailableCustomers] = useState<{id: string, name: string}[]>([]);
  const { customers, isLoading: isLoadingCustomers } = useCustomers();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { logTaskOpen } = useTaskActivity();

  useEffect(() => {
    // Filter customers based on user role
    if (user && customers) {
      const filterCustomers = async () => {
        if (user.role === 'admin') {
          // Admins can see all customers
          setAvailableCustomers(customers);
        } else if (user.role === 'agent') {
          // Agents can only see their assigned customers
          const { data: assignedCustomers, error } = await supabase
            .from('user_customer_assignments')
            .select('customer_id(id, name)')
            .eq('user_id', user.id);
          
          if (error) {
            console.error('Error fetching assigned customers:', error);
            toast({
              title: 'Fehler',
              description: 'Konnte zugewiesene Kunden nicht laden',
              variant: 'destructive'
            });
            return;
          }

          setAvailableCustomers(
            assignedCustomers?.map(ac => ac.customer_id) || []
          );
        } else if (user.role === 'client') {
          // Clients can only see their own customer
          const { data: userAssignment, error } = await supabase
            .from('user_customer_assignments')
            .select('customer_id(id, name)')
            .eq('user_id', user.id)
            .single();
          
          if (error) {
            console.error('Error fetching client customer:', error);
            toast({
              title: 'Fehler',
              description: 'Konnte Ihren Kunden nicht laden',
              variant: 'destructive'
            });
            return;
          }

          setAvailableCustomers(
            userAssignment?.customer_id ? [userAssignment.customer_id] : []
          );
        }
      };

      filterCustomers();
    }
  }, [user, customers, toast]);

  const form = useForm<TaskFormValues>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: {
      description: '',
      customerId: availableCustomers.length === 1 
        ? availableCustomers[0].id 
        : undefined,
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

      console.log("Match result:", matchResult);

      // Create task with initial status "new"
      const { data: task, error: taskError } = await supabase
        .from('tasks')
        .insert({
          description: values.description,
          title: values.description.split('\n')[0].slice(0, 100) || 'Neue Aufgabe',
          created_by: user.id,
          customer_id: values.customerId,
          matched_use_case_id: matchResult?.matched_use_case_id,
          match_confidence: matchResult?.confidence,
          match_reasoning: matchResult?.reasoning,
          status: 'new'
        })
        .select()
        .single();

      if (taskError) {
        console.error("Task creation error:", taskError);
        throw taskError;
      }

      console.log("Task created:", task);

      // Add initial message
      const { error: messageError } = await supabase
        .from('task_messages')
        .insert({
          task_id: task.id,
          content: values.description,
          role: 'user',
          created_by: user.id,
        });

      if (messageError) {
        console.error("Message creation error:", messageError);
        throw messageError;
      }

      // Log task creation activity
      await logTaskOpen(task.id);

      toast({
        title: "Aufgabe erstellt",
        description: "Die Aufgabe wurde erfolgreich angelegt.",
      });

      // Navigate to the task detail page
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
