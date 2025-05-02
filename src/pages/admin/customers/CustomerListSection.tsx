
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

interface CustomerListSectionProps {
  customers: Customer[];
  setCustomers: (c: Customer[]) => void;
  onEdit: (c: Customer) => void;
  setDialogOpen: (open: boolean) => void;
}

const CustomerListSection: React.FC<CustomerListSectionProps> = ({ 
  customers, 
  setCustomers, 
  onEdit, 
  setDialogOpen 
}) => {
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [customerToDelete, setCustomerToDelete] = React.useState<Customer | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const { toast: uiToast } = useToast();

  useEffect(() => {
    const fetchCustomers = async () => {
      const { data, error } = await supabase.from("customers").select("*").order("created_at", { ascending: false });
      if (!error && data) {
        setCustomers(data);
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
    
    setIsDeleting(true);

    try {
      // Call our custom function to delete customer and all related data
      const { error } = await supabase
        .rpc('delete_customer_cascade', { customer_id_param: customerToDelete.id });

      if (error) throw error;

      setCustomers(customers.filter(c => c.id !== customerToDelete.id));
      toast.success("Kunde und alle zugehörigen Daten wurden erfolgreich gelöscht");
    } catch (error) {
      console.error("Error deleting customer:", error);
      uiToast({
        title: "Fehler",
        description: "Der Kunde konnte nicht gelöscht werden. Bitte prüfen Sie, ob noch Abhängigkeiten bestehen.",
        variant: "destructive"
      });
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
      setCustomerToDelete(null);
    }
  };

  const handleToggleActive = async (customer: Customer) => {
    try {
      const newStatus = !customer.is_active;

      const { error } = await supabase
        .from("customers")
        .update({ is_active: newStatus })
        .eq("id", customer.id);

      if (error) throw error;

      setCustomers(
        customers.map(c =>
          c.id === customer.id ? { ...c, is_active: newStatus } : c
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

  const sortedCustomers = [...customers].sort((a, b) => {
    if (a.is_active && !b.is_active) return -1;
    if (!a.is_active && b.is_active) return 1;
    return 0;
  });

  return (
    <div>
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
          {sortedCustomers.map((customer) => (
            <TableRow key={customer.id} className={!customer.is_active ? "opacity-60" : ""}>
              <TableCell>{customer.name}</TableCell>
              <TableCell>{customer.branch || "–"}</TableCell>
              <TableCell>{customer.created_at ? new Date(customer.created_at).toLocaleDateString() : "–"}</TableCell>
              <TableCell>{customer.is_active ? "Aktiv" : "Inaktiv"}</TableCell>
              <TableCell>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => onEdit(customer)} title="Bearbeiten">
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleToggleActive(customer)}
                    title={customer.is_active ? "Deaktivieren" : "Aktivieren"}
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
            <AlertDialogTitle>Kunden vollständig löschen</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>Sind Sie sicher, dass Sie den Kunden "{customerToDelete?.name}" und <strong>alle zugehörigen Daten</strong> löschen möchten?</p>
              <p className="font-semibold text-destructive">Diese Aktion wird Folgendes löschen:</p>
              <ul className="list-disc pl-5 text-sm text-muted-foreground">
                <li>Alle Aufgaben und Aufgabendetails dieses Kunden</li>
                <li>Alle Wissensartikel dieses Kunden</li>
                <li>Alle Use Cases dieses Kunden</li>
                <li>Alle Kontaktpersonen des Kunden</li>
                <li>Alle Kundenzuweisungen zu Nutzern</li>
              </ul>
              <p className="font-semibold">Diese Aktion kann nicht rückgängig gemacht werden!</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Abbrechen</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete} 
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isDeleting}
            >
              {isDeleting ? "Lösche..." : "Ja, Kunden vollständig löschen"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default CustomerListSection;
