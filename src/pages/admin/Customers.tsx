
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
    <div className="section-spacing">
      <Card className="shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <CardTitle className="text-2xl">Kundenverwaltung</CardTitle>
          <Button onClick={handleCreate} className="gap-2" size="sm">
            <Plus className="h-5 w-5" /> Kunde anlegen
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
