
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { AlertTriangle, Bot, X } from "lucide-react";

interface CloseTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onClose: (comment: string) => void;
  isWithoutAva?: boolean;
}

export function CloseTaskDialog({ open, onOpenChange, onClose, isWithoutAva = false }: CloseTaskDialogProps) {
  const [comment, setComment] = useState("");
  const commentMinLength = 10;

  const handleClose = async () => {
    if (comment.trim().length < commentMinLength) return;
    
    try {
      console.log("CloseTaskDialog: Submitting comment", comment);
      await onClose(comment);
      console.log("CloseTaskDialog: Comment submitted successfully");
      
      // Don't reset the comment or close the dialog until the callback completes
      setComment(""); // Reset the comment field
      onOpenChange(false);
    } catch (error) {
      console.error("CloseTaskDialog: Error submitting comment", error);
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
            Bitte dokumentieren Sie den Kundenkontakt, um die Aufgabe abzuschließen.
            {isWithoutAva ? 
              "Die Aufgabe wird direkt abgeschlossen ohne Ava-Zusammenfassung." :
              "Ava wird eine Zusammenfassung erstellen und Sie werden zur nächsten verfügbaren Aufgabe weitergeleitet."}
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="closing-comment">
              Dokumentation <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="closing-comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Bitte geben Sie hier eine Dokumentation des Kundenkontakts ein..."
              className="min-h-[120px]"
            />
            
            {comment.trim().length < commentMinLength && (
              <div className="flex items-center gap-2 text-amber-600 text-sm mt-2">
                <AlertTriangle className="h-4 w-4" />
                <span>
                  Mindestens {commentMinLength} Zeichen erforderlich
                  ({comment.trim().length}/{commentMinLength})
                </span>
              </div>
            )}
          </div>
        </div>
        
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              setComment(""); // Reset the comment field
              onOpenChange(false);
            }}
          >
            Abbrechen
          </Button>
          <Button
            onClick={handleClose}
            disabled={comment.trim().length < commentMinLength}
          >
            Aufgabe abschließen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
