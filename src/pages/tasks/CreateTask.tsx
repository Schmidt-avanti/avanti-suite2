
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FormControl, FormField, FormItem, FormLabel, Form } from '@/components/ui/form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';

const taskFormSchema = z.object({
  description: z.string().min(10, "Beschreibung muss mindestens 10 Zeichen lang sein"),
  customerId: z.string().uuid().optional(),
});

type TaskFormValues = z.infer<typeof taskFormSchema>;

const CreateTask = () => {
  const [isMatching, setIsMatching] = useState(false);
  const [customers, setCustomers] = useState<{ id: string; name: string }[]>([]);
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const form = useForm<TaskFormValues>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: {
      description: '',
      customerId: undefined,
    }
  });

  // Fetch customers assigned to agent if user is an agent
  useEffect(() => {
    const fetchCustomers = async () => {
      if (user?.role === 'agent') {
        const { data, error } = await supabase
          .from('user_customer_assignments')
          .select('customer_id, customers(id, name)')
          .eq('user_id', user.id);

        if (!error && data) {
          const customerList = data.map(item => ({
            id: item.customers.id,
            name: item.customers.name
          }));
          
          setCustomers(customerList);
          
          // If only one customer is assigned, preselect it
          if (customerList.length === 1) {
            form.setValue('customerId', customerList[0].id);
          }
        }
      }
    };

    fetchCustomers();
  }, [user]);

  const onSubmit = async (values: TaskFormValues) => {
    if (!user) return;
    
    setIsMatching(true);
    try {
      // Determine which customer ID to use
      let customerIdToUse: string;
      
      if (user.role === 'admin' || user.role === 'agent') {
        // For admin and agent, use the selected customer
        if (!values.customerId) {
          toast({
            variant: "destructive",
            title: "Fehler",
            description: "Bitte wählen Sie einen Kunden aus.",
          });
          setIsMatching(false);
          return;
        }
        customerIdToUse = values.customerId;
      } else if (user.role === 'client') {
        // For client, we need to get their customer ID from the profile or user metadata
        const { data, error } = await supabase
          .from('user_customer_assignments')
          .select('customer_id')
          .eq('user_id', user.id)
          .single();
          
        if (error || !data) {
          toast({
            variant: "destructive",
            title: "Fehler",
            description: "Kundenzuordnung konnte nicht ermittelt werden.",
          });
          setIsMatching(false);
          return;
        }
        
        customerIdToUse = data.customer_id;
      } else {
        toast({
          variant: "destructive",
          title: "Fehler",
          description: "Unzureichende Berechtigungen.",
        });
        setIsMatching(false);
        return;
      }

      // Match use case
      const { data: matchResult, error: matchError } = await supabase.functions
        .invoke('match-use-case', {
          body: { description: values.description },
        });

      if (matchError) throw matchError;

      // Create task
      const { data: task, error: taskError } = await supabase
        .from('tasks')
        .insert({
          description: values.description,
          title: values.description.split('\n')[0].slice(0, 100),
          created_by: user.id,
          customer_id: customerIdToUse,
          matched_use_case_id: matchResult?.matched_use_case_id,
          match_confidence: matchResult?.confidence,
          match_reasoning: matchResult?.reasoning,
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

      toast({
        title: "Aufgabe erstellt",
        description: "Die Aufgabe wurde erfolgreich angelegt.",
      });

      // Navigate to the task detail page (to be implemented)
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
              {/* Customer selection for admin and agent users */}
              {(user?.role === 'admin' || user?.role === 'agent') && (
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
                          {customers.map((customer) => (
                            <SelectItem key={customer.id} value={customer.id}>
                              {customer.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
              )}
              
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Beschreibung</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="Beschreiben Sie die Aufgabe..."
                        className="min-h-[200px] resize-y"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              
              <div className="flex justify-end">
                <Button type="submit" disabled={isMatching}>
                  {isMatching ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Analysiere...
                    </>
                  ) : (
                    "Aufgabe erstellen"
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
};

export default CreateTask;
