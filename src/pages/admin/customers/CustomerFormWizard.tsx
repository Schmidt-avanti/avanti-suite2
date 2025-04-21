
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
  name: string;
}
interface Person {
  name: string;
  email: string;
  phone: string;
  isMain: boolean;
}

interface FormState {
  name: string;
  description?: string;
  address: Address;
  hasInvoiceAddress: boolean;
  invoiceAddress: Address;
  tools: Tool[];
  contacts: Person[];
}

const initialAddress = { street: "", zip: "", city: "" };
const initialForm: FormState = {
  name: "",
  description: "",
  address: initialAddress,
  hasInvoiceAddress: false,
  invoiceAddress: initialAddress,
  tools: [{ name: "" }],
  contacts: [{ name: "", email: "", phone: "", isMain: true }]
};

interface Props {
  customer?: Customer;
  onFinish: () => void;
  setCustomers: React.Dispatch<React.SetStateAction<Customer[]>>;
}

// For now, tools and contacts are simply arrays of objects.

const CustomerFormWizard: React.FC<Props> = ({ customer, onFinish, setCustomers }) => {
  const [step, setStep] = useState<Step>(1);
  const [form, setForm] = useState<FormState>(initialForm);

  // TODO: on edit, load real customer data incl. contacts/tools!
  // Kept simple for demo purposes.

  const handleNext = () => {
    if (step < 3) setStep((s) => (s + 1 as Step));
  };

  const handlePrev = () => {
    if (step > 1) setStep((s) => (s - 1 as Step));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Tool Handling
  const handleToolChange = (idx: number, value: string) => {
    setForm((prev) => {
      const tools = prev.tools.map((tool, i) => i === idx ? { name: value } : tool);
      return { ...prev, tools };
    });
  };
  const addTool = () => setForm((f) => ({ ...f, tools: [...f.tools, { name: "" }] }));
  const removeTool = (idx: number) => setForm((f) => ({ ...f, tools: f.tools.filter((_, i) => i !== idx) }));

  // Contact Handling handled by subcomponent
  const handleContactsChange = (contacts: Person[]) => setForm((f) => ({ ...f, contacts }));

  // Save (simplified for now)
  const handleSave = async () => {
    // Save logic: create customer, contacts, tools
    const { name, description } = form;
    try {
      const { data, error } = await supabase.from("customers").insert({ name, description }).select();
      if (error) throw error;
      
      if (data) {
        // Map the snake_case fields from Supabase to camelCase for our frontend model
        const newCustomers = data.map(customer => ({
          id: customer.id,
          name: customer.name,
          description: customer.description,
          createdAt: customer.created_at
        }));
        
        setCustomers(prev => [...prev, ...newCustomers]);
        onFinish();
      }
    } catch (error) {
      console.error("Error saving customer:", error);
    }
  };

  return (
    <form className="space-y-8" onSubmit={e => { e.preventDefault(); handleSave(); }}>
      {/* Stepper Indicator */}
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
            <label className="font-medium">Firmenbeschreibung</label>
            <Textarea name="description" value={form.description} onChange={handleChange} />
          </div>
          <div>
            <label className="font-medium">Adresse</label>
            <Input name="street" placeholder="Straße" value={form.address.street} onChange={e => setForm(f => ({ ...f, address: { ...f.address, street: e.target.value } }))} className="mb-2"/>
            <div className="flex gap-2">
              <Input name="zip" placeholder="PLZ" value={form.address.zip} onChange={e => setForm(f => ({ ...f, address: { ...f.address, zip: e.target.value } }))} />
              <Input name="city" placeholder="Ort" value={form.address.city} onChange={e => setForm(f => ({ ...f, address: { ...f.address, city: e.target.value } }))} />
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
                <Input name="invoiceStreet" placeholder="Straße" value={form.invoiceAddress.street} onChange={e => setForm(f => ({ ...f, invoiceAddress: { ...f.invoiceAddress, street: e.target.value } }))} className="mb-2"/>
                <div className="flex gap-2">
                  <Input name="invoiceZip" placeholder="PLZ" value={form.invoiceAddress.zip} onChange={e => setForm(f => ({ ...f, invoiceAddress: { ...f.invoiceAddress, zip: e.target.value } }))} />
                  <Input name="invoiceCity" placeholder="Ort" value={form.invoiceAddress.city} onChange={e => setForm(f => ({ ...f, invoiceAddress: { ...f.invoiceAddress, city: e.target.value } }))} />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {step === 2 && (
        <div>
          <label className="font-medium mb-2">Im Einsatz befindliche Tools</label>
          <div className="space-y-2">
            {form.tools.map((tool, idx) => (
              <div key={idx} className="flex gap-2 items-center">
                <Input value={tool.name} placeholder="Toolname" onChange={e => handleToolChange(idx, e.target.value)} />
                {form.tools.length > 1 && (
                  <Button type="button" size="icon" variant="ghost" onClick={() => removeTool(idx)}>
                    &times;
                  </Button>
                )}
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={addTool} className="mt-2">+ Weiteres Tool</Button>
          </div>
        </div>
      )}

      {step === 3 && (
        <ContactPersonFields
          contacts={form.contacts}
          setContacts={handleContactsChange}
        />
      )}

      <div className="flex gap-2 justify-end pt-6">
        {step > 1 && <Button type="button" variant="outline" onClick={handlePrev}>Zurück</Button>}
        {step < 3 && <Button type="button" onClick={handleNext} disabled={step === 1 && !form.name}>Weiter</Button>}
        {step === 3 && <Button type="submit">Speichern</Button>}
      </div>
    </form>
  );
};

export default CustomerFormWizard;
