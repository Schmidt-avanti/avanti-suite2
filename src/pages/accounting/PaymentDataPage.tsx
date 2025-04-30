
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { PaymentMethodForm } from "@/components/payments/PaymentMethodForm";
import { PaymentMethodCard } from "@/components/payments/PaymentMethodCard";
import { PaymentMethodsTable } from "@/components/payments/PaymentMethodsTable";
import { CustomerFilter } from "@/components/payments/CustomerFilter";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { PaymentMethod } from "@/types";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/components/ui/use-toast";

const PaymentDataPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingMethod, setEditingMethod] = useState<PaymentMethod | null>(null);
  const [deletingMethod, setDeletingMethod] = useState<PaymentMethod | null>(null);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>();

  const { data: paymentMethods = [] } = useQuery({
    queryKey: ['payment-methods', user?.role, selectedCustomerId],
    queryFn: async () => {
      let query = supabase
        .from('payment_methods')
        .select('*, customers(name)');

      if (user?.role !== 'admin') {
        query = query.eq('user_id', user?.id);
      } else if (selectedCustomerId) {
        query = query.eq('customer_id', selectedCustomerId);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      return data as (PaymentMethod & { customers: { name: string } })[];
    },
  });

  const addPaymentMethod = useMutation({
    mutationFn: async (data: {
      type: 'paypal' | 'creditcard';
      value: string;
      customer_id: string;
      card_holder?: string;
      expiry_month?: number;
      expiry_year?: number;
      billing_address?: string;
      billing_zip?: string;
      billing_city?: string;
    }) => {
      const { error } = await supabase
        .from('payment_methods')
        .insert([{
          ...data,
          user_id: user?.id!,
        }]);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-methods'] });
    },
  });

  const updatePaymentMethod = useMutation({
    mutationFn: async ({ id, ...data }: { 
      id: string;
      type: 'paypal' | 'creditcard';
      value: string;
      customer_id: string;
      card_holder?: string;
      expiry_month?: number;
      expiry_year?: number;
      billing_address?: string;
      billing_zip?: string;
      billing_city?: string;
    }) => {
      const { error } = await supabase
        .from('payment_methods')
        .update(data)
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-methods'] });
    },
  });

  const deletePaymentMethod = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('payment_methods')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-methods'] });
      toast({
        title: "Zahlungsmethode gelöscht",
        description: "Die Zahlungsmethode wurde erfolgreich gelöscht.",
      });
    },
  });

  const handleSubmit = async (data: {
    type: 'paypal' | 'creditcard';
    value: string;
    customer_id: string;
    card_holder?: string;
    expiry_month?: number;
    expiry_year?: number;
    billing_address?: string;
    billing_zip?: string;
    billing_city?: string;
  }) => {
    if (editingMethod) {
      await updatePaymentMethod.mutateAsync({
        id: editingMethod.id,
        ...data,
      });
      setEditingMethod(null);
    } else {
      await addPaymentMethod.mutateAsync(data);
    }
    setIsFormOpen(false);
  };

  const handleEdit = (method: PaymentMethod) => {
    setEditingMethod(method);
    setIsFormOpen(true);
  };

  const handleDelete = async () => {
    if (deletingMethod) {
      await deletePaymentMethod.mutateAsync(deletingMethod.id);
      setDeletingMethod(null);
    }
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">
          {user?.role === 'admin' ? 'Alle Zahlungsdaten' : 'Meine Zahlungsdaten'}
        </h1>
        <div className="flex gap-4">
          {user?.role === 'admin' && (
            <CustomerFilter
              selectedCustomerId={selectedCustomerId}
              onSelectCustomer={setSelectedCustomerId}
            />
          )}
          <Button onClick={() => setIsFormOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Zahlungsmethode hinzufügen
          </Button>
        </div>
      </div>

      {user?.role === 'admin' ? (
        <Card>
          <CardHeader>
            <CardTitle>Zahlungsmethoden Übersicht</CardTitle>
          </CardHeader>
          <CardContent>
            <PaymentMethodsTable
              paymentMethods={paymentMethods}
              onEdit={handleEdit}
              onDelete={setDeletingMethod}
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {paymentMethods.map((method) => (
            <PaymentMethodCard
              key={method.id}
              type={method.type}
              value={method.value}
              cardHolder={method.card_holder}
              expiryMonth={method.expiry_month}
              expiryYear={method.expiry_year}
              onEdit={() => handleEdit(method)}
              onDelete={() => setDeletingMethod(method)}
            />
          ))}
        </div>
      )}

      <PaymentMethodForm
        open={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingMethod(null);
        }}
        onSubmit={handleSubmit}
        selectedCustomerId={selectedCustomerId}
        initialData={editingMethod ? {
          type: editingMethod.type,
          value: editingMethod.value,
          customer_id: editingMethod.customer_id,
          card_holder: editingMethod.card_holder,
          expiry_month: editingMethod.expiry_month,
          expiry_year: editingMethod.expiry_year,
          billing_address: editingMethod.billing_address,
          billing_zip: editingMethod.billing_zip,
          billing_city: editingMethod.billing_city,
        } : undefined}
      />

      <AlertDialog open={!!deletingMethod} onOpenChange={() => setDeletingMethod(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Zahlungsmethode löschen</AlertDialogTitle>
            <AlertDialogDescription>
              Möchten Sie diese Zahlungsmethode wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Löschen</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default PaymentDataPage;
