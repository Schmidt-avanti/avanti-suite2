
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import CustomerListSection from "./customers/CustomerListSection";
import CustomerFormDialog from "./customers/CustomerFormDialog";
import { Customer } from "@/types";

const CustomersAdminPage: React.FC = () => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [editCustomer, setEditCustomer] = useState<Customer | null>(null);

  const handleCreate = () => {
    setEditCustomer(null);
    setDialogOpen(true);
  };

  const handleEdit = (customer: Customer) => {
    setEditCustomer(customer);
    setDialogOpen(true);
  };

  return (
    <div>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Kundenverwaltung</CardTitle>
          <Button onClick={handleCreate} className="gap-2" size="sm">
            <Plus className="h-4 w-4" /> Kunde anlegen
          </Button>
        </CardHeader>
        <CardContent>
          <CustomerListSection
            customers={customers}
            setCustomers={setCustomers}
            onEdit={handleEdit}
            setDialogOpen={setDialogOpen}
          />
        </CardContent>
      </Card>
      <CustomerFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        customer={editCustomer}
        setCustomers={setCustomers}
      />
    </div>
  );
};

export default CustomersAdminPage;
