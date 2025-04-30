import React from 'react';
import { useCustomers } from '@/hooks/useCustomers';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";

export const InvoicePage = () => {
  const { customers, isLoading } = useCustomers();
  const [selectedCustomer, setSelectedCustomer] = React.useState(null);
  const { toast } = useToast();

  const selectCustomer = (customer) => {
    setSelectedCustomer(customer);
    toast({
      title: "Kunde ausgewählt",
      description: `Rechnungsdaten für ${customer.name} werden geladen.`,
    });
  };
  
  return (
    <div className="container py-6">
      <Card>
        <CardHeader>
          <CardTitle>Kunden auswählen</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div>Lade Kunden...</div>
          ) : (
            <div className="grid md:grid-cols-3 gap-4 mb-8">
              {customers.filter(c => c.is_active).map((customer) => (
                <button
                  key={customer.id}
                  onClick={() => selectCustomer(customer)}
                  className={`flex flex-col items-start p-4 border rounded-md hover:bg-muted transition-colors ${
                    selectedCustomer?.id === customer.id ? 'border-primary bg-primary/10' : 'border-border'
                  }`}
                >
                  <div className="font-semibold">{customer.name}</div>
                  <div className="text-sm text-muted-foreground mt-1">{customer.cost_center}</div>
                  <div className="text-sm text-muted-foreground">
                    {customer.contact_person}<br />
                    {customer.billing_address}
                  </div>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
