
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import ContactPersonFields from "./ContactPersonFields";
import { Customer } from "@/types";
import { supabase } from "@/integrations/supabase/client";

type Step = 1 | 2 | 3;
interface Address {
  street: string;
  zip: string;
  city: string;
}
interface Tool {
  key: "taskManagement" | "knowledgeBase" | "crm";
  name: string;
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
  taskManagement: { label: "Task Management", desc: "Genutztes Tool für Aufgabenverwaltung (z. B. Asana, Jira). Falls nicht vorhanden, bitte 'N/A' eintragen." },
  knowledgeBase: { label: "Wissensdatenbank", desc: "Tool für Dokumentation und Wissensmanagement (z. B. Confluence, Notion). Falls nicht vorhanden, bitte 'N/A' eintragen." },
  crm: { label: "CRM", desc: "Kundenmanagement-System (z. B. HubSpot, Salesforce). Falls nicht vorhanden, bitte 'N/A' eintragen." }
};

const CustomerFormWizard: React.FC<Props> = ({ customer, onFinish, setCustomers }) => {
  const [step, setStep] = useState<Step>(1);
  const [form, setForm] = useState<FormState>(initialForm);

  // Hilfsfunktionen
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

  // Adresshandling
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

  // Tool-Handling
  const handleToolChange = (toolKey: keyof FormState["tools"], value: string) => {
    setForm((prev) => ({
      ...prev,
      tools: { ...prev.tools, [toolKey]: value }
    }));
  };

  // Kontakte
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

  // Save (nur name, branch und email gehen nach Supabase für Demo)
  const handleSave = async () => {
    const { name, branch, email } = form;
    try {
      const { data, error } = await supabase.from("customers").insert({ name, description: branch }).select();
      if (error) throw error;

      if (data) {
        // Map the snake_case fields from Supabase to camelCase für unsere Typen
        const newCustomers = data.map((customer) => ({
          id: customer.id,
          name: customer.name,
          description: customer.description,
          createdAt: customer.created_at
        }));
        setCustomers((prev) => [...prev, ...newCustomers]);
        onFinish();
      }
    } catch (error) {
      console.error("Error saving customer:", error);
    }
  };

  return (
    <form className="space-y-8" onSubmit={e => { e.preventDefault(); handleSave(); }}>
      {/* Stepper */}
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
                  placeholder={`z. B. ${label}`}
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
          setContacts={contacts => {
            // Beim Hinzufügen/Muten von Kontakten, das Pflichtfeld „Position“ sicherstellen
            setForm(f => ({
              ...f,
              contacts: contacts.map(c => ({
                ...c,
                position: c.position ?? ""
              }))
            }));
          }}
          showPositionField
        />
      )}

      <div className="flex gap-2 justify-end pt-6">
        {step > 1 && <Button type="button" variant="outline" onClick={handlePrev}>Zurück</Button>}
        {step < 3 && (
          <Button
            type="button"
            onClick={handleNext}
            disabled={
              (step === 1 && !validateStep1()) ||
              (step === 2 && !validateStep2())
            }
          >
            Weiter
          </Button>
        )}
        {step === 3 && <Button type="submit">Speichern</Button>}
      </div>
    </form>
  );
};

export default CustomerFormWizard;
