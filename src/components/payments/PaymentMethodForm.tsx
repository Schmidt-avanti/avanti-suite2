
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
import { useCustomers } from "@/hooks/useCustomers";
import { useAuth } from "@/contexts/AuthContext";

const currentYear = new Date().getFullYear();

const formSchema = z.object({
  type: z.enum(['paypal', 'creditcard']),
  value: z.string().refine((val) => {
    if (val.includes('@')) {
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
    } else {
      return /^\d{16}$/.test(val);
    }
  }, {
    message: "Ungültiges Format",
  }),
  customer_id: z.string().uuid(),
  card_holder: z.string().optional(),
  expiry_month: z.number().min(1).max(12).optional(),
  expiry_year: z.number().min(currentYear).optional(),
  billing_address: z.string().optional(),
  billing_zip: z.string().optional(),
  billing_city: z.string().optional(),
}).refine((data) => {
  if (data.type === 'creditcard') {
    return !!(data.card_holder && data.expiry_month && data.expiry_year && 
              data.billing_address && data.billing_zip && data.billing_city);
  }
  return true;
}, {
  message: "Alle Felder sind für Kreditkartenzahlung erforderlich",
});

type PaymentMethodFormValues = z.infer<typeof formSchema>;

interface PaymentMethodFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: PaymentMethodFormValues) => Promise<void>;
  initialData?: PaymentMethodFormValues;
  selectedCustomerId?: string;
}

export const PaymentMethodForm = ({
  open,
  onClose,
  onSubmit,
  initialData,
  selectedCustomerId,
}: PaymentMethodFormProps) => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentType, setPaymentType] = useState(initialData?.type || 'creditcard');
  const { user } = useAuth();
  const { customers } = useCustomers();

  const form = useForm<PaymentMethodFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: initialData || {
      type: 'creditcard',
      value: '',
      customer_id: selectedCustomerId || '',
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
      <DialogContent className="sm:max-w-[500px]">
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
                    onValueChange={(value) => {
                      field.onChange(value);
                      setPaymentType(value as 'paypal' | 'creditcard');
                    }}
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

            {user?.role === 'admin' && (
              <FormField
                control={form.control}
                name="customer_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Kunde</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      disabled={!!initialData}
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
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="value"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {paymentType === 'paypal' ? 'PayPal E-Mail' : 'Kartennummer'}
                  </FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {paymentType === 'creditcard' && (
              <>
                <FormField
                  control={form.control}
                  name="card_holder"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Karteninhaber</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="expiry_month"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Gültig bis Monat</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            min={1} 
                            max={12} 
                            {...field}
                            onChange={e => field.onChange(parseInt(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="expiry_year"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Gültig bis Jahr</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            min={currentYear} 
                            {...field}
                            onChange={e => field.onChange(parseInt(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="billing_address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Rechnungsadresse</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="billing_zip"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>PLZ</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="billing_city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Stadt</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </>
            )}

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
