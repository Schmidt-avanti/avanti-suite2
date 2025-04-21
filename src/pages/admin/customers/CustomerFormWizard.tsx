
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
          // ALLE Daten laden, inklusive Tools & Kontakte:
          const { data, error } = await supabase
            .from("customers")
            .select("*")
            .eq("id", customer.id)
            .single();

          if (error) throw error;
          const customerData = data;

          // Tools laden:
          const { data: toolsData } = await supabase.from("customer_tools").select("*").eq("customer_id", customer.id).maybeSingle();
          // Kontakte laden:
          const { data: contactRows } = await supabase.from("customer_contacts").select("*").eq("customer_id", customer.id);

          setForm({
            name: customerData.name || "",
            branch: customerData.description || "",
            email: customerData.email || "",
            address: {
              street: customerData.street || "",
              zip: customerData.zip || "",
              city: customerData.city || ""
            },
            hasInvoiceAddress: !!customerData.has_invoice_address,
            invoiceAddress: {
              street: customerData.invoice_street || "",
              zip: customerData.invoice_zip || "",
              city: customerData.invoice_city || ""
            },
            tools: {
              taskManagement: toolsData?.task_management || "",
              knowledgeBase: toolsData?.knowledge_base || "",
              crm: toolsData?.crm || ""
            },
            contacts: (contactRows ?? []).map(c => ({
              name: c.name,
              email: c.email || "",
              phone: c.phone || "",
              position: c.position || "",
              isMain: !!c.is_main
            }))
          });
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

  const validateStep2 = () =>
    Boolean(form.tools.taskManagement && form.tools.knowledgeBase && form.tools.crm);

  const handleSave = async () => {
    setIsLoading(true);

    // ----- 1. Customer Stammdaten -----
    const {
      name,
      branch,
      email,
      address,
      hasInvoiceAddress,
      invoiceAddress,
      tools,
      contacts
    } = form;

    try {
      let customerId: string;

      if (isEditing && customer) {
        // Update customer
        const { data, error } = await supabase
          .from("customers")
          .update({
            name,
            description: branch,
            email,
            street: address.street,
            zip: address.zip,
            city: address.city,
            has_invoice_address: hasInvoiceAddress,
            invoice_street: invoiceAddress.street,
            invoice_zip: invoiceAddress.zip,
            invoice_city: invoiceAddress.city,
          })
          .eq("id", customer.id)
          .select();

        if (error) throw error;
        customerId = customer.id;

        setCustomers(prev => prev.map(c =>
          c.id === customer.id
            ? {
                ...c,
                name: data[0].name,
                description: data[0].description,
              }
            : c
        ));
      } else {
        // Insert new customer
        const { data, error } = await supabase
          .from("customers")
          .insert({
            name,
            description: branch,
            email,
            street: address.street,
            zip: address.zip,
            city: address.city,
            has_invoice_address: hasInvoiceAddress,
            invoice_street: invoiceAddress.street,
            invoice_zip: invoiceAddress.zip,
            invoice_city: invoiceAddress.city,
            is_active: true
          })
          .select();

        if (error) throw error;
        customerId = data[0].id;

        const newCustomers = data.map((customer: any) => ({
          id: customer.id,
          name: customer.name,
          description: customer.description,
          createdAt: customer.created_at,
          isActive: customer.is_active !== false
        }));
        setCustomers((prev) => [...prev, ...newCustomers]);
      }

      // ----- 2. Tools ("upsert") -----
      // Es gibt immer genau einen Tools-Datensatz pro Kunde
      const { error: toolsErr } = await supabase
        .from("customer_tools")
        .upsert([
          {
            customer_id: customerId,
            task_management: tools.taskManagement,
            knowledge_base: tools.knowledgeBase,
            crm: tools.crm,
          }
        ], { onConflict: "customer_id" });

      if (toolsErr) throw toolsErr;

      // ----- 3. Kontakte: Zunächst alte Kontakte löschen, dann alle neu als Insert -----
      if (isEditing && customer) {
        await supabase.from("customer_contacts").delete().eq("customer_id", customerId);
      }
      // Insert alle Kontakte, nur wenn mind. Name ausgefüllt ist:
      const validContacts = contacts.filter(c => c.name.trim());
      if (validContacts.length) {
        const toInsert = validContacts.map(c => ({
          customer_id: customerId,
          is_main: c.isMain,
          name: c.name,
          email: c.email,
          phone: c.phone,
          position: c.position
        }));

        const { error: contactsErr } = await supabase
          .from("customer_contacts")
          .insert(toInsert);

        if (contactsErr) throw contactsErr;
      }

      toast.success(isEditing ? "Kunde erfolgreich aktualisiert" : "Kunde erfolgreich angelegt");
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
