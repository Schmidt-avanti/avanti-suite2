import React, { useState, useEffect } from "react";
import { toast } from "@/components/ui/sonner";
import { supabase } from "@/integrations/supabase/client";
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
  avanti_email: string;
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
  avanti_email: "",
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

const useCustomerForm = ({
  customer,
  setCustomers,
  onFinish
}: {
  customer?: Customer,
  setCustomers: React.Dispatch<React.SetStateAction<Customer[]>>,
  onFinish: () => void
}) => {
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
            .maybeSingle();

          if (error) throw error;
          const customerData = data;

          const { data: toolsData } = await supabase.from("customer_tools").select("*").eq("customer_id", customer.id).maybeSingle();
          const { data: contactRows } = await supabase.from("customer_contacts").select("*").eq("customer_id", customer.id);

          // Generate avanti_email if it doesn't exist
          let avantiEmail = customerData?.avanti_email;
          if (!avantiEmail && customerData?.name) {
            // Generate email using the same logic as our database function
            const name = customerData.name.toLowerCase();
            const formattedName = name
              .replace(/\s+/g, '-')
              .replace(/[^a-z0-9\-]/g, '');
            avantiEmail = `${formattedName}@inbox.avanti.cx`;
          }

          setForm({
            name: customerData?.name || "",
            branch: customerData?.industry || "",
            email: customerData?.email || "",
            avanti_email: avantiEmail || "",
            address: {
              street: customerData?.street || "",
              zip: customerData?.zip || "",
              city: customerData?.city || ""
            },
            hasInvoiceAddress: !!customerData?.has_invoice_address,
            invoiceAddress: {
              street: customerData?.invoice_street || "",
              zip: customerData?.invoice_zip || "",
              city: customerData?.invoice_city || ""
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

  // Generate avanti_email when name changes if it's a new customer
  useEffect(() => {
    if (!isEditing && form.name && !form.avanti_email) {
      // Generate email using the same logic as our database function
      const name = form.name.toLowerCase();
      const formattedName = name
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9\-]/g, '');
      const avantiEmail = `${formattedName}@inbox.avanti.cx`;
      setForm(prev => ({ ...prev, avanti_email: avantiEmail }));
    }
  }, [form.name, isEditing, form.avanti_email]);

  const handleNext = () => setStep((s) => (s < 3 ? (s + 1 as Step) : s));
  const handlePrev = () => setStep((s) => (s > 1 ? (s - 1 as Step) : s));

  const validateStep1 = () => !!(form.name && form.branch && form.email && form.address.street && form.address.zip && form.address.city);
  const validateStep2 = () => Boolean(form.tools.taskManagement && form.tools.knowledgeBase && form.tools.crm);

  const handleSave = async () => {
    setIsLoading(true);

    const {
      name,
      branch,
      email,
      avanti_email,
      address,
      hasInvoiceAddress,
      invoiceAddress,
      tools,
      contacts
    } = form;

    try {
      let customerId: string;

      if (isEditing && customer) {
        const { data, error } = await supabase
          .from("customers")
          .update({
            name,
            industry: branch,
            email,
            avanti_email,
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
                branch: data[0]?.industry ?? ""
              }
            : c
        ));
      } else {
        const { data, error } = await supabase
          .from("customers")
          .insert({
            name,
            industry: branch,
            email,
            avanti_email,
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
          branch: customer.industry ?? "",
          createdAt: customer.created_at,
          isActive: customer.is_active !== false
        }));
        setCustomers((prev) => [...prev, ...newCustomers]);
      }

      const { data: existingTools } = await supabase
        .from("customer_tools")
        .select("id")
        .eq("customer_id", customerId)
        .maybeSingle();

      if (existingTools?.id) {
        const { error: toolsErr } = await supabase
          .from("customer_tools")
          .update({
            task_management: tools.taskManagement,
            knowledge_base: tools.knowledgeBase,
            crm: tools.crm
          })
          .eq("id", existingTools.id);

        if (toolsErr) throw toolsErr;
      } else {
        const { error: toolsErr } = await supabase
          .from("customer_tools")
          .insert({
            customer_id: customerId,
            task_management: tools.taskManagement,
            knowledge_base: tools.knowledgeBase,
            crm: tools.crm
          });

        if (toolsErr) throw toolsErr;
      }

      if (isEditing && customer) {
        await supabase.from("customer_contacts").delete().eq("customer_id", customerId);
      }

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

  return {
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
    handlePrev,
  };
};

export default useCustomerForm;
