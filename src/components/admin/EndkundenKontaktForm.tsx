import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface KontaktFormData {
  id?: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  role: string | null;
}

interface EndkundenKontaktFormProps {
  kontaktToEdit: Partial<KontaktFormData> | null;
  onSave: (kontakt: Partial<KontaktFormData>) => void;
  onCancel: () => void;
}

const EndkundenKontaktForm: React.FC<EndkundenKontaktFormProps> = ({ kontaktToEdit, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    role: '',
  });

  useEffect(() => {
    if (kontaktToEdit) {
      setFormData({
        name: kontaktToEdit.name || '',
        email: kontaktToEdit.email || '',
        phone: kontaktToEdit.phone || '',
        role: kontaktToEdit.role || '',
      });
    } else {
      setFormData({
        name: '',
        email: '',
        phone: '',
        role: '',
      });
    }
  }, [kontaktToEdit]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const dataToSave: Partial<KontaktFormData> = { ...formData };
    if (kontaktToEdit?.id) {
      (dataToSave as any).id = kontaktToEdit.id;
    }
    onSave(dataToSave);
  };

  return (
    <Card className="my-4">
      <CardHeader>
        <CardTitle>{kontaktToEdit ? 'Ansprechpartner bearbeiten' : 'Neuen Ansprechpartner anlegen'}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">Name</label>
            <Input id="name" name="name" value={formData.name} onChange={handleChange} required />
          </div>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">E-Mail</label>
            <Input id="email" name="email" type="email" value={formData.email} onChange={handleChange} />
          </div>
          <div>
            <label htmlFor="role" className="block text-sm font-medium text-gray-700">Rolle</label>
            <Input id="role" name="role" value={formData.role || ''} onChange={handleChange} />
          </div>
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700">Telefon</label>
            <Input id="phone" name="phone" value={formData.phone} onChange={handleChange} />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onCancel}>Abbrechen</Button>
            <Button type="submit">Speichern</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default EndkundenKontaktForm;
