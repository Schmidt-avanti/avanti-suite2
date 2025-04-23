
import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Plus } from "lucide-react";
import CreateWhatsappAccountDialog from "./CreateWhatsappAccountDialog";

interface AssignWhatsappAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customers: { id: string; name: string }[];
  refreshAccounts: () => void;
}

export const AssignWhatsappAccountDialog: React.FC<AssignWhatsappAccountDialogProps> = ({
  open,
  onOpenChange,
  customers,
  refreshAccounts,
}) => {
  const [unassignedAccounts, setUnassignedAccounts] = React.useState<{ id: string; name: string; pphone_number: string }[]>([]);
  const [selectedAccountId, setSelectedAccountId] = React.useState<string>("");
  const [selectedCustomerId, setSelectedCustomerId] = React.useState<string>("");
  const [loading, setLoading] = React.useState(false);

  const [createDialogOpen, setCreateDialogOpen] = React.useState(false);

  const { toast } = useToast();

  // Lade alle nicht zugewiesenen Accounts
  const loadUnassigned = React.useCallback(() => {
    setLoading(true);
    supabase
      .from("whatsapp_accounts")
      .select("id, name, pphone_number, customer_id")
      .then(({ data }) => {
        if (data) {
          const unassigned = data.filter((acc) => !acc.customer_id);
          setUnassignedAccounts(unassigned);
        }
        setLoading(false);
      });
  }, []);

  // Läd Konten wenn Dialog geöffnet wird bzw. nach Neuerstellung
  React.useEffect(() => {
    if (open) {
      loadUnassigned();
      setSelectedAccountId("");
      setSelectedCustomerId("");
    }
  }, [open, loadUnassigned]);

  // Nach Neu-Anlage Konto-Dialog Liste neu laden
  const handleCreated = () => {
    loadUnassigned();
    refreshAccounts();
  };

  const handleAssign = async () => {
    if (!selectedAccountId || !selectedCustomerId) return;
    setLoading(true);
    const { error } = await supabase
      .from("whatsapp_accounts")
      .update({ customer_id: selectedCustomerId })
      .eq("id", selectedAccountId);
    setLoading(false);

    if (error) {
      toast({
        variant: "destructive",
        title: "Fehler",
        description: "Konnte das WhatsApp Konto nicht zuweisen.",
      });
    } else {
      toast({
        variant: "default",
        title: "Zuweisung erfolgreich",
        description: "Das Konto wurde dem Kunden zugewiesen.",
      });
      onOpenChange(false);
      refreshAccounts();
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>WhatsApp Konto zu Kunde zuweisen</DialogTitle>
          </DialogHeader>
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="animate-spin h-6 w-6 text-muted-foreground mr-2" />
              <span>Lade Daten…</span>
            </div>
          ) : (
            <div className="space-y-6">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium">WhatsApp Konto</label>
                  <Button
                    size="icon"
                    variant="secondary"
                    className="ml-2"
                    onClick={() => setCreateDialogOpen(true)}
                    type="button"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Konto auswählen" />
                  </SelectTrigger>
                  <SelectContent>
                    {unassignedAccounts.length === 0 && (
                      <div className="px-4 py-2 text-muted-foreground">Keine unzugewiesenen Konten.</div>
                    )}
                    {unassignedAccounts.map((acc) => (
                      <SelectItem key={acc.id} value={acc.id}>
                        {acc.name || acc.pphone_number || acc.id}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm mb-2 font-medium">Kunde</label>
                <Select value={selectedCustomerId} onValueChange={setSelectedCustomerId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Kunde auswählen" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <Button
                  onClick={handleAssign}
                  className="bg-avanti-600 text-white"
                  disabled={
                    !selectedAccountId || !selectedCustomerId || loading
                  }
                >
                  Zuweisen
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
      <CreateWhatsappAccountDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onCreated={handleCreated}
      />
    </>
  );
};

export default AssignWhatsappAccountDialog;
