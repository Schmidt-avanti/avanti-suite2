
import React from "react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/sonner";
import { supabase } from "@/integrations/supabase/client";
import CustomerMasterDataStep from "../CustomerMasterDataStep";
import CustomerToolsStep from "../CustomerToolsStep";
import CustomerContactsStep from "../CustomerContactsStep";
import Stepper from "./Stepper";
import useCustomerForm from "./useCustomerForm";
import { Customer } from "@/types";

interface Props {
  customer?: Customer;
  onFinish: () => void;
  setCustomers: React.Dispatch<React.SetStateAction<Customer[]>>;
}

const CustomerFormWizard: React.FC<Props> = ({ customer, onFinish, setCustomers }) => {
  const {
    step,
    setStep,
    form,
    setForm,
    isLoading,
    isEditing,
    validateStep1,
    validateStep2,
    handleSave,
    handleNext,
    handlePrev
  } = useCustomerForm({ customer, setCustomers, onFinish });

  return (
    <form className="space-y-8" onSubmit={e => { e.preventDefault(); handleSave(); }}>
      <Stepper step={step} setStep={setStep} />
      {step === 1 && (
        <CustomerMasterDataStep form={form} setForm={setForm} />
      )}
      {step === 2 && (
        <CustomerToolsStep tools={form.tools} setTools={tools => setForm(f => ({ ...f, tools }))} />
      )}
      {step === 3 && (
        <CustomerContactsStep contacts={form.contacts} setContacts={contacts => setForm(f => ({ ...f, contacts }))} />
      )}

      <div className="flex gap-2 justify-end pt-6">
        {step > 1 && <Button type="button" variant="outline" onClick={handlePrev} disabled={isLoading}>Zurück</Button>}
        {step < 3 && (
          <Button
            type="button"
            onClick={handleNext}
            disabled={
              isLoading ||
              (step === 1 && !validateStep1()) ||
              (step === 2 && !validateStep2())
            }
          >
            Weiter
          </Button>
        )}
        {step === 3 && <Button type="submit" disabled={isLoading}>{isEditing ? "Aktualisieren" : "Speichern"}</Button>}
      </div>
    </form>
  );
};

export default CustomerFormWizard;
