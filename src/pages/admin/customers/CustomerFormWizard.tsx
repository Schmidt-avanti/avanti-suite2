
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import ContactPersonFields from "./ContactPersonFields";
import { Customer } from "@/types";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/sonner";

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

  // Load customer data when editing
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
            // Here we'd usually fetch and populate all customer details from the database
            // For now, we'll just populate with the data we have
            setForm(prev => ({
              ...prev,
              name: data.name || "",
              branch: data.description || "",
              // We'd fetch and populate other fields here as well
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
    }
  }, [customer]);

  const handleNext = () => {
    setStep((s) => (s < 3 ? (s + 1 as Step) : s));
  };
  const handlePrev = () => {
    setStep((s) => (s > 1 ? (s - 1 as Step) : s));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddressChange = (field: keyof Address, value: string) => {
    setForm((prev) => ({
      ...prev,
      address: { ...prev.address, [field]: value }
    }));
  };
  const handleInvoiceAddressChange = (field: keyof Address, value: string) => {
    setForm((prev) => ({
      ...prev,
      invoiceAddress: { ...prev.invoiceAddress, [field]: value }
    }));
  };

  const handleToolChange = (toolKey: keyof FormState["tools"], value: string) => {
    setForm((prev) => ({
      ...prev,
      tools: { ...prev.tools, [toolKey]: value }
    }));
  };

  const handleContactsChange = (contacts: Person[]) => setForm((f) => ({ ...f, contacts }));

  const validateStep1 = () => {
    return !!(
      form.name &&
      form.branch &&
      form.email &&
      form.address.street &&
      form.address.zip &&
      form.address.city
    );
  };

  const validateStep2 = () =>
    Boolean(
      form.tools.taskManagement &&
      form.tools.knowledgeBase &&
      form.tools.crm
    );

  const handleSave = async () => {
    setIsLoading(true);
    const { name, branch, email } = form;
    try {
      if (isEditing && customer) {
        // Update existing customer
        const { data, error } = await supabase
          .from("customers")
          .update({ 
            name, 
            description: branch
            // In a real implementation, we'd save all fields here
          })
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
        // Create new customer
        const { data, error } = await supabase
          .from("customers")
          .insert({ name, description: branch })
          .select();

        if (error) throw error;

        if (data) {
          const newCustomers = data.map((customer) => ({
            id: customer.id,
            name: customer.name,
            description: customer.description,
            createdAt: customer.created_at,
            isActive: true
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="font-medium">Kundenname *</label>
            <Input name="name" value={form.name} onChange={handleChange} required autoFocus />
          </div>
          <div>
            <label className="font-medium">Branche *</label>
            <Input name="branch" value={form.branch} onChange={handleChange} required />
          </div>
          <div>
            <label className="font-medium">E-Mail *</label>
            <Input type="email" name="email" value={form.email} onChange={handleChange} required />
          </div>
          <div>
            <label className="font-medium">Adresse *</label>
            <Input
              name="street"
              placeholder="Straße"
              value={form.address.street}
              onChange={e => handleAddressChange("street", e.target.value)}
              className="mb-2"
              required
            />
            <div className="flex gap-2">
              <Input
                name="zip"
                placeholder="PLZ"
                value={form.address.zip}
                onChange={e => handleAddressChange("zip", e.target.value)}
                required
              />
              <Input
                name="city"
                placeholder="Ort"
                value={form.address.city}
                onChange={e => handleAddressChange("city", e.target.value)}
                required
              />
            </div>
          </div>
          <div>
            <label className="flex items-center gap-2 font-medium mb-1">
              <Switch
                checked={form.hasInvoiceAddress}
                onCheckedChange={checked => setForm(f => ({ ...f, hasInvoiceAddress: checked }))}
              />
              Abweichende Rechnungsadresse?
            </label>
            {form.hasInvoiceAddress && (
              <div>
                <Input
                  name="invoiceStreet"
                  placeholder="Straße"
                  value={form.invoiceAddress.street}
                  onChange={e => handleInvoiceAddressChange("street", e.target.value)}
                  className="mb-2"
                  required
                />
                <div className="flex gap-2">
                  <Input
                    name="invoiceZip"
                    placeholder="PLZ"
                    value={form.invoiceAddress.zip}
                    onChange={e => handleInvoiceAddressChange("zip", e.target.value)}
                    required
                  />
                  <Input
                    name="invoiceCity"
                    placeholder="Ort"
                    value={form.invoiceAddress.city}
                    onChange={e => handleInvoiceAddressChange("city", e.target.value)}
                    required
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {step === 2 && (
        <div>
          <div className="space-y-6">
            {Object.entries(toolLabels).map(([key, { label, desc }]) => (
              <div key={key}>
                <label className="font-medium">{label} *</label>
                <Input
                  value={form.tools[key as keyof FormState["tools"]]}
                  placeholder={`z. B. ${label}`}
                  onChange={e => handleToolChange(key as keyof FormState["tools"], e.target.value)}
                  required
                />
                <div className="text-xs text-muted-foreground">{desc}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {step === 3 && (
        <ContactPersonFields
          contacts={form.contacts}
          setContacts={handleContactsChange}
          showPositionField={true}
        />
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
