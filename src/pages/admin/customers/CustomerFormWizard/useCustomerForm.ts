
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface CustomerData {
  name: string;
  email: string;
  address?: string;
  city?: string;
  zip?: string;
  country?: string;
  vat_id?: string;
  phone?: string;
}

interface ContactPerson {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  position?: string;
  isPrimary: boolean;
}

interface FormErrors {
  customerData?: {
    [key: string]: string;
  };
  contactPersons?: {
    [key: string]: {
      [key: string]: string;
    };
  };
}

const useCustomerForm = () => {
  const [customerData, setCustomerData] = useState<CustomerData>({
    name: '',
    email: '',
  });

  const [contactPersons, setContactPersons] = useState<ContactPerson[]>([]);
  
  const [selectedTools, setSelectedTools] = useState<string[]>([]);
  
  const [isLoading, setIsLoading] = useState(false);
  
  const [errors, setErrors] = useState<FormErrors>({});

  const updateCustomerData = (data: Partial<CustomerData>) => {
    setCustomerData((prev) => ({ ...prev, ...data }));
  };

  const updateContactPersons = (newContactPersons: ContactPerson[]) => {
    setContactPersons(newContactPersons);
  };

  const updateSelectedTools = (tools: string[]) => {
    setSelectedTools(tools);
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    
    // Validate customer data
    if (!customerData.name) {
      newErrors.customerData = { ...newErrors.customerData, name: 'Name is required' };
    }
    
    if (!customerData.email) {
      newErrors.customerData = { ...newErrors.customerData, email: 'Email is required' };
    } else if (!/^\S+@\S+\.\S+$/.test(customerData.email)) {
      newErrors.customerData = { ...newErrors.customerData, email: 'Invalid email format' };
    }
    
    // Validate contact persons
    if (contactPersons.length === 0) {
      newErrors.contactPersons = { general: { message: 'At least one contact person is required' } };
    } else {
      const contactPersonErrors: { [key: string]: { [key: string]: string } } = {};
      
      contactPersons.forEach((contact, index) => {
        const contactErrors: { [key: string]: string } = {};
        
        if (!contact.firstName) {
          contactErrors.firstName = 'First name is required';
        }
        
        if (!contact.lastName) {
          contactErrors.lastName = 'Last name is required';
        }
        
        if (!contact.email) {
          contactErrors.email = 'Email is required';
        } else if (!/^\S+@\S+\.\S+$/.test(contact.email)) {
          contactErrors.email = 'Invalid email format';
        }
        
        if (Object.keys(contactErrors).length > 0) {
          contactPersonErrors[index] = contactErrors;
        }
      });
      
      if (Object.keys(contactPersonErrors).length > 0) {
        newErrors.contactPersons = contactPersonErrors;
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      throw new Error('Form validation failed');
    }

    setIsLoading(true);
    
    try {
      // Create the customer
      const { data: customerRecord, error: customerError } = await supabase
        .from('customers')
        .insert({
          name: customerData.name,
          email: customerData.email,
          address: customerData.address,
          city: customerData.city,
          zip_code: customerData.zip,
          country: customerData.country,
          vat_id: customerData.vat_id,
          phone: customerData.phone,
        })
        .select('id')
        .single();

      if (customerError) throw customerError;
      
      // Create contact persons
      const contactsToInsert = contactPersons.map(contact => ({
        customer_id: customerRecord.id,
        first_name: contact.firstName,
        last_name: contact.lastName,
        email: contact.email,
        phone: contact.phone,
        position: contact.position,
        is_primary: contact.isPrimary,
      }));
      
      const { error: contactsError } = await supabase
        .from('customer_contacts')
        .insert(contactsToInsert);
        
      if (contactsError) throw contactsError;
      
      // Associate tools with customer if needed
      if (selectedTools.length > 0) {
        const toolAssignments = selectedTools.map(tool => ({
          customer_id: customerRecord.id,
          tool_id: tool
        }));
        
        const { error: toolsError } = await supabase
          .from('customer_tools')
          .insert(toolAssignments);
          
        if (toolsError) throw toolsError;
      }
      
      return customerRecord;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    customerData,
    contactPersons,
    selectedTools,
    isLoading,
    errors,
    updateCustomerData,
    updateContactPersons,
    updateSelectedTools,
    handleSubmit
  };
};

export default useCustomerForm;
