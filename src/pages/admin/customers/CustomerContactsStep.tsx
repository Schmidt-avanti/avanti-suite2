
import React from "react";
import ContactPersonFields from "./ContactPersonFields";

interface Person {
  name: string;
  email: string;
  phone: string;
  position: string;
  isMain: boolean;
}

interface Props {
  contacts?: Person[];
  setContacts?: (contacts: Person[]) => void;
  customer?: any;
  setCustomer?: (customer: any) => void;
}

const CustomerContactsStep: React.FC<Props> = ({ contacts, setContacts, customer, setCustomer }) => {
  // If we're using the customer object pattern
  if (customer && setCustomer) {
    const customerContacts = customer.contacts || [];
    return (
      <ContactPersonFields
        contacts={customerContacts}
        setContacts={(newContacts) => {
          setCustomer({
            ...customer,
            contacts: newContacts
          });
        }}
        showPositionField={true}
      />
    );
  }
  
  // Fall back to direct contacts props if provided
  if (contacts && setContacts) {
    return (
      <ContactPersonFields
        contacts={contacts}
        setContacts={setContacts}
        showPositionField={true}
      />
    );
  }
  
  // Default with empty array if no props provided
  return (
    <ContactPersonFields
      contacts={[]}
      setContacts={() => {}}
      showPositionField={true}
    />
  );
};

export default CustomerContactsStep;
