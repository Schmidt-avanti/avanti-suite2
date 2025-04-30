
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
import { AlertTriangle } from "lucide-react";

interface CloseTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onClose: (comment: string) => void;
}

export function CloseTaskDialog({ open, onOpenChange, onClose }: CloseTaskDialogProps) {
  const [comment, setComment] = useState("");
  const commentMinLength = 10;

  const handleClose = () => {
    if (comment.trim().length < commentMinLength) return;
    
    onClose(comment);
    setComment(""); // Reset the comment field
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Aufgabe abschließen ohne Ava</DialogTitle>
          <DialogDescription>
            Bitte dokumentieren Sie den Kundenkontakt, um die Aufgabe abzuschließen.
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
