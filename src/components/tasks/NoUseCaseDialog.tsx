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
  action: 'discard' | 'manual' | 'create_use_case';
  message: string;
  rememberAction: boolean;
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
      action: 'manual',
      message: '',
      rememberAction: false
    }
  });

  const action = form.watch('action');

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
            `Bitte teilen Sie uns mit, wie wir Ihnen am besten weiterhelfen können.`;
          
          setClientTemplate(defaultTemplate);
          form.setValue('message', defaultTemplate);
        }
      } catch (error) {
        console.error('Error fetching template:', error);
        // Set a fallback template
        const fallbackTemplate = 
          `Bezüglich Ihrer Anfrage "${taskTitle}":\n\n` +
          `Wir benötigen weitere Informationen, um Ihre Anfrage korrekt zu bearbeiten.`;
        
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
      const response = await supabase.functions.invoke('handle-no-use-case', {
        body: {
          taskId,
          action: values.action,
          message: values.message,
          customerId,
          rememberId: values.rememberAction
        }
      });

      if (response.error) throw new Error(response.error.message);

      // Show success message based on the chosen action
      let successMessage = '';
      switch (values.action) {
        case 'discard':
          successMessage = 'Task has been discarded successfully.';
          break;
        case 'manual':
          successMessage = 'Task has been marked for manual processing.';
          break;
        case 'create_use_case':
          successMessage = 'New use case created and assigned to this task.';
          break;
      }

      toast({
        title: "Action Completed",
        description: successMessage
      });

      onOpenChange(false);
    } catch (error) {
      console.error('Error processing task without use case:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || 'Failed to process the task. Please try again.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Task Without Use Case</DialogTitle>
          <DialogDescription>
            Task "{taskTitle}" was created without an associated use case. 
            Please decide how to proceed with this task.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="action"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>Select an action</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="flex flex-col space-y-1"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="discard" id="discard" />
                        <Label htmlFor="discard">Discard the task</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="manual" id="manual" />
                        <Label htmlFor="manual">Proceed manually</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="create_use_case" id="create_use_case" />
                        <Label htmlFor="create_use_case">Create a new use case</Label>
                      </div>
                    </RadioGroup>
                  </FormControl>
                  <FormDescription>
                    {action === 'discard' && 'The task will be marked as completed and discarded.'}
                    {action === 'manual' && 'The task will be processed manually without a use case.'}
                    {action === 'create_use_case' && 'A new use case will be created based on this task.'}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {action === 'manual' && (
              <FormField
                control={form.control}
                name="message"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Client Communication Message</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Enter a message to send to the client"
                        className="min-h-[150px]"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      This message will be used to ask the client for more information.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="rememberAction"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>
                      Remember this action for future tasks from this customer
                    </FormLabel>
                    <FormDescription>
                      The system will automatically apply this action to future tasks without use cases from this customer.
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isSubmitting ? 'Processing...' : 'Confirm'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
