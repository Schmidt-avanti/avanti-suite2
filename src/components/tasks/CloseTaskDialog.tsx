import React from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Bot, X } from "lucide-react";

interface CloseTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onClose: (comment: string) => void;
  isWithoutAva?: boolean;
}

export function CloseTaskDialog({ open, onOpenChange, onClose, isWithoutAva = false }: CloseTaskDialogProps) {
  // Interne Notiz wird nicht mehr benötigt, direkt abschließen
  
  const handleClose = async () => {    
    try {
      console.log("CloseTaskDialog: Closing task without comment");
      // Leeren String als Kommentar übergeben
      await onClose("");
      console.log("CloseTaskDialog: Task closed successfully");
      
      onOpenChange(false);
    } catch (error) {
      console.error("CloseTaskDialog: Error closing task", error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-full">
              {isWithoutAva ? (
                <X className="h-5 w-5 text-red-700" />
              ) : (
                <Bot className="h-5 w-5 text-blue-700" />
              )}
            </div>
            <DialogTitle>
              {isWithoutAva ? "Aufgabe direkt abschließen" : "Aufgabe abschließen mit Ava"}
            </DialogTitle>
          </div>
          <DialogDescription>
            {isWithoutAva ? 
              "Die Aufgabe wird direkt abgeschlossen ohne Ava-Zusammenfassung." :
              "Ava wird eine Zusammenfassung erstellen und Sie werden zur nächsten verfügbaren Aufgabe weitergeleitet."}
          </DialogDescription>
        </DialogHeader>
        
        {/* Interne Notiz-Feld entfernt, da nicht benötigt */}
        
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              onOpenChange(false);
            }}
          >
            Abbrechen
          </Button>
          <Button
            onClick={handleClose}
          >
            {isWithoutAva ? "Vorgang abschließen" : "Mit Ava abschließen"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
