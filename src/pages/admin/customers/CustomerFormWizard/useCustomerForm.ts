
import { useState } from "react";
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Customer } from "@/types";

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

export interface CustomerData {
  id?: string;
  name: string;
  branch: string;
  email: string;
  address: Address;
  hasInvoiceAddress: boolean;
  invoiceAddress: Address;
  tools: Record<"taskManagement" | "knowledgeBase" | "crm", string>;
  contacts: Person[];
}

const initialCustomer: CustomerData = {
  name: "",
  branch: "",
  email: "",
  address: { street: "", zip: "", city: "" },
  hasInvoiceAddress: false,
  invoiceAddress: { street: "", zip: "", city: "" },
  tools: {
    taskManagement: "",
    knowledgeBase: "",
    crm: ""
  },
  contacts: [
    { name: "", email: "", phone: "", position: "", isMain: true }
  ]
};

interface UseCustomerFormProps {
  initialCustomer?: Customer;
}

const useCustomerForm = (props?: UseCustomerFormProps) => {
  const { toast } = useToast();
  const [customer, setCustomer] = useState<CustomerData>(props?.initialCustomer || initialCustomer);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Determine if we're creating or editing
  const formState = customer.id ? 'edit' : 'create';
  
  const handleFormSubmit = async () => {
    setIsSubmitting(true);
    
    try {
      const {
        name,
        branch,
        email,
        address,
        hasInvoiceAddress,
        invoiceAddress,
        tools,
        contacts
      } = customer;
      
      let customerId: string;
      
      // Create or update customer
      if (formState === 'edit' && customer.id) {
        const { data, error } = await supabase
          .from("customers")
          .update({
            name,
            industry: branch,
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
      } else {
        const { data, error } = await supabase
          .from("customers")
          .insert({
            name,
            industry: branch,
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
      }
      
      // Handle tools
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
      
      // Handle contacts - delete existing ones if editing
      if (formState === 'edit' && customer.id) {
        await supabase.from("customer_contacts").delete().eq("customer_id", customerId);
      }
      
      // Insert new contacts
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
      
      toast({
        title: formState === 'edit' ? "Kunde aktualisiert" : "Kunde angelegt",
        description: `${name} wurde erfolgreich ${formState === 'edit' ? 'aktualisiert' : 'angelegt'}`,
      });
      
      return true;
    } catch (error: any) {
      console.error("Error saving customer:", error);
      toast({
        title: "Fehler",
        description: `Kunde konnte nicht gespeichert werden: ${error.message}`,
        variant: "destructive"
      });
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return {
    formState,
    customer,
    setCustomer,
    handleFormSubmit,
    isSubmitting
  };
};

export default useCustomerForm;
