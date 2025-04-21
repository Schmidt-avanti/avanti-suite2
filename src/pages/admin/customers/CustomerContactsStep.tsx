
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
  contacts: Person[];
  setContacts: (contacts: Person[]) => void;
}

const CustomerContactsStep: React.FC<Props> = ({ contacts, setContacts }) => (
  <ContactPersonFields
    contacts={contacts}
    setContacts={setContacts}
    showPositionField={true}
  />
);

export default CustomerContactsStep;
