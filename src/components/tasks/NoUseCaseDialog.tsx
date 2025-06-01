import React, { useState, useEffect } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter 
} from '@/components/ui/dialog';
import { 
  Form, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormControl, 
  FormMessage,
  FormDescription 
} from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { useForm } from 'react-hook-form';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

interface NoUseCaseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taskId: string;
  customerId: string;
  taskTitle: string;
}

interface FormValues {
  message: string;
  recipient: string;
}

export const NoUseCaseDialog: React.FC<NoUseCaseDialogProps> = ({
  open,
  onOpenChange,
  taskId,
  customerId,
  taskTitle
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [clientTemplate, setClientTemplate] = useState('');
  const { toast } = useToast();

  const form = useForm<FormValues>({
    defaultValues: {
      message: '',
      recipient: 's.huebner@ja-dialog.de' // Default recipient email
    }
  });



  // Fetch template for client communication
  useEffect(() => {
    const fetchTemplate = async () => {
      try {
        const { data, error } = await supabase
          .from('prompt_templates')
          .select('content')
          .eq('type', 'no_use_case_client_query')
          .single();

        if (error) throw error;
        
        if (data && data.content) {
          const templateText = data.content
            .replace('{{task_title}}', taskTitle)
            .replace('{{task_id}}', taskId);
          
          setClientTemplate(templateText);
          form.setValue('message', templateText);
        } else {
          // Default template if none is configured
          const defaultTemplate = 
            `Bezüglich Ihrer Anfrage "${taskTitle}" (ID: ${taskId}):\n\n` +
            `Wir benötigen weitere Informationen, um Ihre Anfrage korrekt zu bearbeiten. ` +
            `Was genau wünschen Sie von uns bezüglich dieser Anfrage? ` +
            `Sollen wir für diesen Anfragetyp einen neuen Standard-Prozess (Use Case) erstellen?`;
          
          setClientTemplate(defaultTemplate);
          form.setValue('message', defaultTemplate);
        }
      } catch (error) {
        console.error('Error fetching template:', error);
        // Set a fallback template
        const fallbackTemplate = 
          `Bezüglich Ihrer Anfrage "${taskTitle}":\n\n` +
          `Wir benötigen weitere Informationen, um Ihre Anfrage korrekt zu bearbeiten. ` +
          `Was genau wünschen Sie von uns bezüglich dieser Anfrage? ` +
          `Sollen wir für diesen Anfragetyp einen neuen Standard-Prozess erstellen?`;
        
        setClientTemplate(fallbackTemplate);
        form.setValue('message', fallbackTemplate);
      }
    };

    if (open) {
      fetchTemplate();
    }
  }, [open, taskId, taskTitle, form]);

  const onSubmit = async (values: FormValues) => {
    setIsSubmitting(true);
    try {
      // Create a request body for the send-email function
      const requestBody = {
        to: values.recipient, // Use the recipient from the form
        subject: `Rückfrage zu Aufgabe ohne Use Case: ${taskTitle} (${taskId})`,
        text: values.message,
        taskId,
        readableId: taskId.substring(0, 8), // Use taskId as readableId if actual readableId isn't available
        fromName: 'Avanti Service'
      };
      
      console.log('Sending email to customer:', JSON.stringify(requestBody));
      
      // Use send-email function instead of handle-no-use-case
      const response = await supabase.functions.invoke('send-email', {
        body: requestBody
      });

      if (response.error) throw new Error(response.error.message);

      // No longer storing customer preferences - removed as requested

      // Update task status to indicate waiting for customer
      try {
        await supabase
          .from('tasks')
          .update({ 
            status: 'waiting_on_customer',
            last_customer_contact: new Date().toISOString()
          })
          .eq('id', taskId);
      } catch (taskError) {
        console.error('Error updating task status:', taskError);
        // Continue even if task status update fails
      }

      // Success message
      toast({
        title: "E-Mail gesendet",
        description: "Anfrage wurde an den Kunden gesendet."
      });

      onOpenChange(false);
    } catch (error) {
      console.error('Error sending email to customer:', error);
      toast({
        variant: "destructive",
        title: "Fehler",
        description: error.message || 'Die E-Mail konnte nicht gesendet werden. Bitte versuchen Sie es erneut.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Aufgabe ohne Use Case</DialogTitle>
          <DialogDescription>
            Die Aufgabe "{taskTitle}" wurde ohne zugeordneten Use Case erstellt.
            Bitte senden Sie eine Anfrage, um weitere Informationen zu erhalten.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="recipient"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>E-Mail-Empfänger</FormLabel>
                  <FormControl>
                    <input
                      type="email"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      placeholder="E-Mail-Adresse des Empfängers"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Die E-Mail wird an diese Adresse gesendet.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="message"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nachricht an den Kunden</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Geben Sie eine Nachricht ein, die an den Kunden gesendet werden soll"
                      className="min-h-[150px]"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Diese Nachricht wird verwendet, um den Kunden nach weiteren Informationen zu fragen und ob ein neuer Use Case erstellt werden soll.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Checkbox for remembering action removed as requested */}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Abbrechen
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isSubmitting ? 'Wird verarbeitet...' : 'Bestätigen'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
