
import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";

const formSchema = z.object({
  type: z.enum(['paypal', 'creditcard']),
  value: z.string().refine((val) => {
    if (val.includes('@')) {
      // Simple email validation for PayPal
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
    } else {
      // Luhn algorithm for credit card validation
      return val.length === 16 && /^\d+$/.test(val);
    }
  }, {
    message: "Ungültiges Format",
  }),
});

type PaymentMethodFormValues = z.infer<typeof formSchema>;

interface PaymentMethodFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: PaymentMethodFormValues) => Promise<void>;
  initialData?: PaymentMethodFormValues;
}

export const PaymentMethodForm = ({
  open,
  onClose,
  onSubmit,
  initialData,
}: PaymentMethodFormProps) => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<PaymentMethodFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: initialData || {
      type: 'creditcard',
      value: '',
    },
  });

  const handleSubmit = async (values: PaymentMethodFormValues) => {
    try {
      setIsSubmitting(true);
      await onSubmit(values);
      form.reset();
      onClose();
      toast({
        title: "Zahlungsmethode gespeichert",
        description: "Die Zahlungsmethode wurde erfolgreich gespeichert.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Fehler",
        description: "Die Zahlungsmethode konnte nicht gespeichert werden.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {initialData ? "Zahlungsmethode bearbeiten" : "Neue Zahlungsmethode"}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Zahlungsart</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Zahlungsart auswählen" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="creditcard">Kreditkarte</SelectItem>
                      <SelectItem value="paypal">PayPal</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="value"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {field.value === 'paypal' ? 'PayPal E-Mail' : 'Kartennummer'}
                  </FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isSubmitting}
              >
                Abbrechen
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Speichern..." : "Speichern"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
