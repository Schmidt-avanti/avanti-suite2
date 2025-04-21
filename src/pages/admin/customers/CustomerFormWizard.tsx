
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/sonner";
import { supabase } from "@/integrations/supabase/client";
import CustomerMasterDataStep from "./CustomerMasterDataStep";
import CustomerToolsStep from "./CustomerToolsStep";
import CustomerContactsStep from "./CustomerContactsStep";
import { Customer } from "@/types";

type Step = 1 | 2 | 3;
interface Address {
  street: string;
  zip: string;
  city: string;
}
interface Person {
  name: string;
  email: string;
  phone: string;
  position: string;
  isMain: boolean;
}

interface FormState {
  name: string;
  branch: string;
  email: string;
  address: Address;
  hasInvoiceAddress: boolean;
  invoiceAddress: Address;
  tools: Record<"taskManagement" | "knowledgeBase" | "crm", string>;
  contacts: Person[];
}

const initialAddress = { street: "", zip: "", city: "" };
const initialForm: FormState = {
  name: "",
  branch: "",
  email: "",
  address: initialAddress,
  hasInvoiceAddress: false,
  invoiceAddress: initialAddress,
  tools: {
    taskManagement: "",
    knowledgeBase: "",
    crm: ""
  },
  contacts: [
    { name: "", email: "", phone: "", position: "", isMain: true }
  ]
};

interface Props {
  customer?: Customer;
  onFinish: () => void;
  setCustomers: React.Dispatch<React.SetStateAction<Customer[]>>;
}

const toolLabels: Record<keyof FormState["tools"], { label: string; desc: string }> = {
  taskManagement: { label: "Task Management", desc: "Genutztes Tool für Aufgabenverwaltung (z. B. Asana, Jira). Falls nicht vorhanden, bitte 'N/A' eintragen." },
  knowledgeBase: { label: "Wissensdatenbank", desc: "Tool für Dokumentation und Wissensmanagement (z. B. Confluence, Notion). Falls nicht vorhanden, bitte 'N/A' eintragen." },
  crm: { label: "CRM", desc: "Kundenmanagement-System (z. B. HubSpot, Salesforce). Falls nicht vorhanden, bitte 'N/A' eintragen." }
};

const CustomerFormWizard: React.FC<Props> = ({ customer, onFinish, setCustomers }) => {
  const [step, setStep] = useState<Step>(1);
  const [form, setForm] = useState<FormState>(initialForm);
  const [isLoading, setIsLoading] = useState(false);
  const isEditing = !!customer?.id;

  useEffect(() => {
    if (customer?.id) {
      const loadCustomerData = async () => {
        setIsLoading(true);
        try {
          const { data, error } = await supabase
            .from("customers")
            .select("*")
            .eq("id", customer.id)
            .single();
          if (error) throw error;
          if (data) {
            setForm(prev => ({
              ...prev,
              name: data.name || "",
              branch: data.description || "",
              // Füge weitere Felder hinzu falls benötigt ...
            }));
          }
        } catch (error) {
          console.error("Error loading customer data:", error);
          toast.error("Kundendaten konnten nicht geladen werden");
        } finally {
          setIsLoading(false);
        }
      };
      loadCustomerData();
    } else {
      setForm(initialForm);
    }
  }, [customer]);

  const handleNext = () => setStep((s) => (s < 3 ? (s + 1 as Step) : s));
  const handlePrev = () => setStep((s) => (s > 1 ? (s - 1 as Step) : s));

  const validateStep1 = () => !!(form.name && form.branch && form.email && form.address.street && form.address.zip && form.address.city);

  const validateStep2 = () => Boolean(form.tools.taskManagement && form.tools.knowledgeBase && form.tools.crm);

  const handleSave = async () => {
    setIsLoading(true);
    const { name, branch } = form;
    try {
      if (isEditing && customer) {
        const { data, error } = await supabase
          .from("customers")
          .update({ name, description: branch })
          .eq("id", customer.id)
          .select();
        if (error) throw error;
        if (data) {
          setCustomers(prev => prev.map(c =>
            c.id === customer.id
              ? {
                  ...c,
                  name: data[0].name,
                  description: data[0].description,
                }
              : c
          ));
          toast.success("Kunde erfolgreich aktualisiert");
        }
      } else {
        const { data, error } = await supabase
          .from("customers")
          .insert({ name, description: branch })
          .select();
        if (error) throw error;
        if (data) {
          const newCustomers = data.map((customer: any) => ({
            id: customer.id,
            name: customer.name,
            description: customer.description,
            createdAt: customer.created_at,
            isActive: customer.is_active !== false
          }));
          setCustomers((prev) => [...prev, ...newCustomers]);
          toast.success("Kunde erfolgreich angelegt");
        }
      }
      onFinish();
    } catch (error) {
      console.error("Error saving customer:", error);
      toast.error("Fehler beim Speichern des Kunden");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form className="space-y-8" onSubmit={e => { e.preventDefault(); handleSave(); }}>
      <div className="flex items-center space-x-2 pb-2 text-sm">
        <div className={`rounded-full px-3 py-1 ${step === 1 ? "bg-primary text-white" : "bg-gray-200"}`}>1. Stammdaten</div>
        <span className="text-gray-400">→</span>
        <div className={`rounded-full px-3 py-1 ${step === 2 ? "bg-primary text-white" : "bg-gray-200"}`}>2. Tools</div>
        <span className="text-gray-400">→</span>
        <div className={`rounded-full px-3 py-1 ${step === 3 ? "bg-primary text-white" : "bg-gray-200"}`}>3. Ansprechpartner</div>
      </div>

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
