
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
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
    if (user && customers) {
      const filterCustomers = async () => {
        if (user.role === 'admin') {
          setAvailableCustomers(customers);
        } else if (user.role === 'agent') {
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
      const { data: matchResult, error: matchError } = await supabase.functions
        .invoke('match-use-case', {
          body: { description: values.description },
        });
      if (matchError) throw matchError;
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
      await logTaskOpen(task.id);
      toast({
        title: "Aufgabe erstellt",
        description: "Die Aufgabe wurde erfolgreich angelegt.",
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

  // --- MODERNES MESSENGER-UI-LAYOUT ---
  return (
    <div className="min-h-[calc(100vh-120px)] flex items-center justify-center px-2 py-10 bg-background">
      <div className="w-full sm:max-w-xl md:max-w-2xl lg:max-w-3xl">
        <div className="mx-auto bg-white/95 dark:bg-card/90 rounded-xl shadow-lg p-0 border border-gray-100 overflow-hidden animate-fade-in" style={{ maxWidth: 520 }}>
          {/* Kopfbereich wie Messenger-Header */}
          <div className="flex items-center px-6 pt-6 pb-3 border-b border-muted bg-gradient-to-r from-avanti-100 to-avanti-200">
            <span className="text-lg font-semibold text-primary flex-1">Neue Aufgabe erstellen</span>
          </div>
          {/* Content */}
          <div className="flex flex-col gap-4 px-4 pt-4 pb-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-5">
                {/* Recipient Select */}
                <FormField
                  control={form.control}
                  name="customerId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base text-muted-foreground mb-1">Kunde</FormLabel>
                      <FormControl>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          value={field.value}
                        >
                          <SelectTrigger className="w-full rounded-lg border px-4 py-3 bg-white placeholder:text-muted-foreground focus:ring-2 focus:ring-avanti-400 transition-all shadow-sm">
                            <SelectValue placeholder="Kunde auswählen…" />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl mt-2 shadow-xl bg-white/95 z-50 border border-gray-100">
                            {isLoadingCustomers ? (
                              <SelectItem value="loading" disabled>Laden…</SelectItem>
                            ) : availableCustomers.length === 0 ? (
                              <SelectItem value="empty" disabled>Keine Kunden verfügbar</SelectItem>
                            ) : (
                              availableCustomers.map((customer) => (
                                <SelectItem
                                  key={customer.id}
                                  value={customer.id}
                                  className="rounded-lg transition bg-white/95 hover:bg-[linear-gradient(90deg,#e6f0fd_0%,#f4fafd_100%)] cursor-pointer"
                                >
                                  {customer.name}
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                      </FormControl>
                    </FormItem>
                  )}
                />
                {/* Nachrichtenfeld (Beschreibung) */}
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base text-muted-foreground mb-1">Nachricht</FormLabel>
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
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateTask;
