
import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import CustomerFormWizard from "./CustomerFormWizard";
import { Customer } from "@/types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer: Customer | null;
  setCustomers: (c: Customer[]) => void;
}
const CustomerFormDialog: React.FC<Props> = ({ open, onOpenChange, customer, setCustomers }) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-w-2xl p-0">
      <DialogHeader className="p-6 pb-2">
        <DialogTitle>{customer ? "Kunde bearbeiten" : "Kunde anlegen"}</DialogTitle>
      </DialogHeader>
      <div className="px-6 pb-6 pt-0">
        <CustomerFormWizard customer={customer || undefined} onFinish={() => onOpenChange(false)} setCustomers={setCustomers} />
      </div>
    </DialogContent>
  </Dialog>
);

export default CustomerFormDialog;
