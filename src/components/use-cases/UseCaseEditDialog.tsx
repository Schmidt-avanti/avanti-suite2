import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { UseCaseEditForm } from "./UseCaseEditForm";

interface UseCaseEditDialogProps {
  useCase: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UseCaseEditDialog({ useCase, open, onOpenChange }: UseCaseEditDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader className="pb-2">
          <DialogTitle className="text-xl font-semibold">Use Case bearbeiten</DialogTitle>
        </DialogHeader>
        <UseCaseEditForm useCase={useCase} onSuccess={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}
