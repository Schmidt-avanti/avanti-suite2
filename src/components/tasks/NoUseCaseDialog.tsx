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
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

interface NoUseCaseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  taskId: string;
  customerId: string;
  taskTitle: string;
}

const formSchema = z.object({
  recipient: z.string().email({ message: 'Bitte geben Sie eine gültige E-Mail-Adresse ein.' }),
  message: z.string().min(10, {
    message: 'Die Nachricht muss mindestens 10 Zeichen lang sein.',
  }),
});

type FormValues = z.infer<typeof formSchema>;

export const NoUseCaseDialog: React.FC<NoUseCaseDialogProps> = ({
  open,
  onOpenChange,
  onSuccess,
  taskId,
  customerId, // customerId wird aktuell nicht direkt für den Edge Function Call benötigt
  taskTitle
}) => {
    const [loadingState, setLoadingState] = useState<'idle' | 'generating' | 'sending'>('idle');
  const [emailSubject, setEmailSubject] = useState<string | null>(null);
  const [sendDelay, setSendDelay] = useState(0);
  const [isSendDelayed, setIsSendDelayed] = useState(true);
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      message: '',
      recipient: '',
    },
    mode: 'onChange', // Validate on change for better UX
  });

  useEffect(() => {
    let delayTimer: ReturnType<typeof setInterval> | undefined;

    if (open && taskId) {
      setLoadingState('generating');
      // Reset state for re-opening dialog
      setEmailSubject(null);
      setSendDelay(0);
      form.reset({ recipient: '', message: '' });

      supabase.functions.invoke('generate-schwungrad-email', {
        body: { taskId },
      })
      .then(({ data, error }) => {
        if (error) throw error;
        if (!data || !data.subject || !data.body || !data.recipient) {
          throw new Error("Unvollständige oder fehlerhafte Daten vom Server erhalten.");
        }

        form.reset({
          recipient: data.recipient,
          message: data.body,
        });
        setEmailSubject(data.subject);
        form.trigger(); // Manually trigger validation to enable button if form is valid
        setLoadingState('idle');

        // Start 10-second countdown
        setSendDelay(10);
        delayTimer = setInterval(() => {
          setSendDelay((prev) => {
            if (prev <= 1) {
              clearInterval(delayTimer!);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      })
      .catch((error: any) => {
        console.error('Failed to generate email:', error);
        setLoadingState('idle');
        toast({
          variant: 'destructive',
          title: 'Fehler bei der E-Mail-Vorbereitung',
          description: error.message || 'Der E-Mail-Entwurf konnte nicht erstellt werden.',
        });
      });
    }

    return () => {
      if (delayTimer) {
        clearInterval(delayTimer);
      }
    };
  }, [open, taskId, form, toast]);

  const onSubmit = async (values: FormValues) => {
    if (!emailSubject) {
      toast({
        variant: "destructive",
        title: "Fehler",
        description: "Der Betreff der E-Mail wurde nicht geladen. Bitte schließen Sie den Dialog und versuchen Sie es erneut.",
      });
      return;
    }

    setLoadingState('sending');
    try {
      const { error: sendError } = await supabase.functions.invoke('send-schwungrad-email', {
        body: {
          taskId,
          recipient: values.recipient,
          subject: emailSubject,
          body: values.message,
        },
      });

      if (sendError) {
        throw new Error(`Fehler beim Senden der E-Mail: ${sendError.message}`);
      }

      toast({
        title: "E-Mail erfolgreich gesendet",
        description: "Die Anfrage wurde an den Kunden zur Klärung gesendet.",
      });

      onSuccess(); // Notify parent component to refresh and navigate
      onOpenChange(false); // Close dialog on success
    } catch (error: any) {
      console.error('Fehler im onSubmit Prozess:', error);
      toast({
        variant: "destructive",
        title: "Fehler beim Senden",
        description: error.message || 'Ein unerwarteter Fehler ist aufgetreten.',
      });
    } finally {
      setLoadingState('idle');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>
            {loadingState === 'generating' ? "E-Mail-Entwurf wird geladen..." : emailSubject || `Rückfrage zu: ${taskTitle}`}
          </DialogTitle>
          <DialogDescription>
            {loadingState === 'generating' 
              ? "Bitte warten Sie einen Moment." 
              : emailSubject 
                ? `Überprüfen und bearbeiten Sie den E-Mail-Entwurf für die Aufgabe "${taskTitle}".`
                : `Für die Aufgabe "${taskTitle}" konnte kein passender Use Case gefunden werden. Hier kannst du eine Rückfrage an den Kunden formulieren.`
            }
            <div className="text-sm text-muted-foreground">
              Bitte überprüfe den automatisch erstellten Entwurf, bevor du die Aktion ausführst.
            </div>
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-4">
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
                      disabled={loadingState !== 'idle'}
                    />
                  </FormControl>
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
                      disabled={loadingState !== 'idle'}
                    />
                  </FormControl>
                  <FormDescription>
                    Diese Nachricht wird verwendet, um den Kunden nach weiteren Informationen zu fragen und ob ein neuer Use Case erstellt werden soll.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between sm:items-center">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loadingState !== 'idle'}>
                Abbrechen
              </Button>
              <div className="flex items-center gap-2">
                {sendDelay > 0 && (
                  <span className="text-sm text-muted-foreground">
                    Verfügbar in {sendDelay}s
                  </span>
                )}
                <Button type="submit" disabled={loadingState !== 'idle' || !form.formState.isValid || sendDelay > 0}>
                  {loadingState === 'sending' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {loadingState === 'sending' ? 'Wird gesendet...' : 'Aktion ausführen'}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
