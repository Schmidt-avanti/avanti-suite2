
import React, { useEffect } from "react";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Edit } from "lucide-react";
import { Customer } from "@/types";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  customers: Customer[];
  setCustomers: (c: Customer[]) => void;
  onEdit: (c: Customer) => void;
  setDialogOpen: (open: boolean) => void;
}

const CustomerListSection: React.FC<Props> = ({ customers, setCustomers, onEdit }) => {
  useEffect(() => {
    const fetchCustomers = async () => {
      const { data, error } = await supabase.from("customers").select("*").order("created_at", { ascending: false });
      if (!error && data) {
        setCustomers(data);
      }
    };
    fetchCustomers();
  }, [setCustomers]);

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Beschreibung</TableHead>
          <TableHead>Erstellt am</TableHead>
          <TableHead></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {customers.map((customer) => (
          <TableRow key={customer.id}>
            <TableCell>{customer.name}</TableCell>
            <TableCell>{customer.description ?? "–"}</TableCell>
            <TableCell>{customer.createdAt ? new Date(customer.createdAt).toLocaleDateString() : "–"}</TableCell>
            <TableCell>
              <Button variant="ghost" size="icon" onClick={() => onEdit(customer)}>
                <Edit className="w-4 h-4" />
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};

export default CustomerListSection;
