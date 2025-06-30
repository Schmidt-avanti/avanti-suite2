
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import CustomerListSection from "./customers/CustomerListSection";
import CustomerFormDialog from "./customers/CustomerFormDialog";
import CustomerEditDialog from "./customers/CustomerEditDialog";
import { Customer } from "@/types";

const CustomersAdminPage: React.FC = () => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [editCustomer, setEditCustomer] = useState<Customer | null>(null);

  const handleCreate = () => {
    setEditCustomer(null);
    setDialogOpen(true);
  };

  const handleEdit = (customer: Customer) => {
    setEditCustomer(customer);
    setEditDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-2xl font-semibold">Kundenverwaltung</CardTitle>
          <Button onClick={handleCreate} size="sm">
            <Plus className="h-5 w-5" />
            <span>Kunde anlegen</span>
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
      
      {/* Dialog für neuen Kunden */}
      <CustomerFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        customer={null}
        setCustomers={setCustomers}
      />
      
      {/* Dialog für Kundenbearbeitung */}
      <CustomerEditDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        customer={editCustomer}
        setCustomers={setCustomers}
      />
    </div>
  );
};

export default CustomersAdminPage;
