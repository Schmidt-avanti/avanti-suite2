
import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

interface CreateWhatsappAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

const CreateWhatsappAccountDialog: React.FC<CreateWhatsappAccountDialogProps> = ({
  open,
  onOpenChange,
  onCreated,
}) => {
  const [name, setName] = useState("");
  const [pphoneNumber, setPphoneNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleCreate = async () => {
    if (!name && !pphoneNumber) {
      toast({
        variant: "destructive",
        title: "Fehlende Angaben",
        description: "Bitte mindestens Name oder Telefonnummer eingeben.",
      });
      return;
    }
    setLoading(true);
    
    // Explizit customer_id auf null setzen
    const { error } = await supabase.from("whatsapp_accounts").insert({
      name: name || null,
      pphone_number: pphoneNumber || null,
      customer_id: null, // Wichtig: Explizit null setzen statt auf Standardwert zu vertrauen
      status: 'active'
    });
    
    setLoading(false);

    if (error) {
      console.error("Fehler beim Anlegen des WhatsApp-Kontos:", error);
      toast({
        variant: "destructive",
        title: "Fehler",
        description: `WhatsApp Konto konnte nicht angelegt werden: ${error.message}`,
      });
    } else {
      toast({
        variant: "default",
        title: "Konto angelegt",
        description: "Das WhatsApp Konto wurde erfolgreich erstellt.",
      });
      setName("");
      setPphoneNumber("");
      onOpenChange(false);
      onCreated();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle>Neues WhatsApp Konto anlegen</DialogTitle>
        </DialogHeader>
        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="animate-spin h-6 w-6 text-muted-foreground mr-2" />
            <span>Speichern…</span>
          </div>
        ) : (
          <div className="space-y-5">
            <div>
              <label className="block text-sm mb-2 font-medium">Name</label>
              <Input
                placeholder="z. B. Firma XY Support"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm mb-2 font-medium">
                Telefonnummer
              </label>
              <Input
                placeholder="z. B. +4917612345678"
                value={pphoneNumber}
                onChange={(e) => setPphoneNumber(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button
                onClick={handleCreate}
                className="bg-avanti-600 text-white"
                disabled={loading || (!name && !pphoneNumber)}
              >
                Anlegen
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default CreateWhatsappAccountDialog;
