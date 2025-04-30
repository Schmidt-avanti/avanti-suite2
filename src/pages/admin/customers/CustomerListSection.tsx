import React, { useEffect } from "react";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Edit, Trash2, Ban } from "lucide-react";
import { Customer } from "@/types";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/sonner";
import { useToast } from "@/hooks/use-toast";
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

interface Props {
  customers: Customer[];
  setCustomers: (c: Customer[]) => void;
  onEdit: (c: Customer) => void;
  setDialogOpen: (open: boolean) => void;
}

const CustomerListSection: React.FC<Props> = ({ customers, setCustomers, onEdit }) => {
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [customerToDelete, setCustomerToDelete] = React.useState<Customer | null>(null);
  const { toast: uiToast } = useToast();

  useEffect(() => {
    const fetchCustomers = async () => {
      const { data, error } = await supabase.from("customers").select("*").order("created_at", { ascending: false });
      if (!error && data) {
        // Map Supabase snake_case to our frontend camelCase model and include isActive
        const formattedCustomers = data.map(customer => ({
          id: customer.id,
          name: customer.name,
          email: customer.email,
          street: customer.street,
          city: customer.city,
          zip: customer.zip,
          is_active: customer.is_active,
          branch: customer.branch,
          created_at: customer.created_at,
          cost_center: customer.cost_center,
          contact_person: customer.contact_person,
          billing_address: customer.billing_address,
          billing_email: customer.billing_email,
          avanti_email: customer.avanti_email
        }));
        setCustomers(formattedCustomers);
      }
    };
    fetchCustomers();
  }, [setCustomers]);

  const handleDeleteClick = (customer: Customer) => {
    setCustomerToDelete(customer);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!customerToDelete) return;

    try {
      const { error } = await supabase
        .from("customers")
        .delete()
        .eq("id", customerToDelete.id);

      if (error) throw error;

      setCustomers(customers.filter(c => c.id !== customerToDelete.id));
      toast.success("Kunde erfolgreich gelöscht");
    } catch (error) {
      console.error("Error deleting customer:", error);
      uiToast({
        title: "Fehler",
        description: "Der Kunde konnte nicht gelöscht werden.",
        variant: "destructive"
      });
    } finally {
      setDeleteDialogOpen(false);
      setCustomerToDelete(null);
    }
  };

  const handleToggleActive = async (customer: Customer) => {
    try {
      const newStatus = !customer.isActive;

      const { error } = await supabase
        .from("customers")
        .update({ is_active: newStatus })
        .eq("id", customer.id);

      if (error) throw error;

      setCustomers(
        customers.map(c =>
          c.id === customer.id ? { ...c, isActive: newStatus } : c
        )
      );

      toast.success(`Kunde erfolgreich ${newStatus ? "aktiviert" : "deaktiviert"}`);
    } catch (error) {
      console.error("Error toggling customer status:", error);
      uiToast({
        title: "Fehler",
        description: "Der Kundenstatus konnte nicht geändert werden.",
        variant: "destructive"
      });
    }
  };

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Branche</TableHead>
            <TableHead>Erstellt am</TableHead>
            <TableHead>Status</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {customers.map((customer) => (
            <TableRow key={customer.id} className={!customer.isActive ? "opacity-60" : ""}>
              <TableCell>{customer.name}</TableCell>
              <TableCell>{customer.branch ?? "–"}</TableCell>
              <TableCell>{customer.created_at ? new Date(customer.created_at).toLocaleDateString() : "–"}</TableCell>
              <TableCell>{customer.isActive ? "Aktiv" : "Inaktiv"}</TableCell>
              <TableCell>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => onEdit(customer)} title="Bearbeiten">
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleToggleActive(customer)}
                    title={customer.isActive ? "Deaktivieren" : "Aktivieren"}
                  >
                    <Ban className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteClick(customer)}
                    title="Löschen"
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Kunden löschen</AlertDialogTitle>
            <AlertDialogDescription>
              Sind Sie sicher, dass Sie den Kunden "{customerToDelete?.name}" löschen möchten?
              Diese Aktion kann nicht rückgängig gemacht werden.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Ja, Kunden löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default CustomerListSection;
