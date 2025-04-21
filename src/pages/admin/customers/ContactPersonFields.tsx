
import React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface Person {
  name: string;
  email: string;
  phone: string;
  isMain: boolean;
}
interface Props {
  contacts: Person[];
  setContacts: (c: Person[]) => void;
}
const ContactPersonFields: React.FC<Props> = ({ contacts, setContacts }) => {
  const handleChange = (idx: number, field: keyof Person, value: string | boolean) => {
    setContacts(contacts.map((c, i) => i === idx ? { ...c, [field]: value } : c));
  };
  const addPerson = () => setContacts([...contacts, { name: "", email: "", phone: "", isMain: false }]);
  const removePerson = (idx: number) => setContacts(contacts.filter((_, i) => i !== idx));
  const setMain = (idx: number) => setContacts(contacts.map((c, i) => ({ ...c, isMain: i === idx })));

  return (
    <div>
      <label className="block font-medium mb-2">Ansprechpartner *</label>
      {contacts.map((person, idx) => (
        <div key={idx} className="border rounded-2xl mb-4 p-4 space-y-2 relative shadow-sm bg-gray-50">
          <div className="flex gap-2 mb-2">
            <Input
              placeholder="Name"
              value={person.name}
              onChange={e => handleChange(idx, "name", e.target.value)}
              className="flex-1"
              required={person.isMain}
            />
            <Input
              placeholder="E-Mail"
              value={person.email}
              onChange={e => handleChange(idx, "email", e.target.value)}
              type="email"
              className="flex-1"
              required={person.isMain}
            />
            <Input
              placeholder="Telefon"
              value={person.phone}
              onChange={e => handleChange(idx, "phone", e.target.value)}
              type="tel"
              className="flex-1"
            />
          </div>
          <div className="flex gap-2 items-center">
            <input
              type="radio"
              checked={person.isMain}
              onChange={() => setMain(idx)}
              name="isMain"
              id={`mainContact${idx}`}
              className="mr-2"
            />
            <label htmlFor={`mainContact${idx}`}>Hauptansprechpartner</label>
            {contacts.length > 1 && (
              <Button type="button" variant="ghost" size="sm" onClick={() => removePerson(idx)}>
                Entfernen
              </Button>
            )}
          </div>
        </div>
      ))}
      <Button type="button" variant="outline" onClick={addPerson}>+ Weitere Person</Button>
    </div>
  );
};

export default ContactPersonFields;
