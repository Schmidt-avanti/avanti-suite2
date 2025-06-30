import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/database.types';

type Ansprechpartner = Database['public']['Tables']['endkunden_contacts']['Row'];

interface AnsprechpartnerFormProps {
  customerId: string;
  initialData: Partial<Ansprechpartner> | null;
  onSave: () => void;
  onCancel: () => void;
}

const AnsprechpartnerForm: React.FC<AnsprechpartnerFormProps> = ({ customerId, initialData, onSave, onCancel }) => {
  const [formData, setFormData] = useState(initialData || {});
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setFormData(initialData || {});
  }, [initialData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) {
      toast({ title: 'Fehler', description: 'Der Name ist ein Pflichtfeld.', variant: 'destructive' });
      return;
    }

    setLoading(true);
    const dataToSave = {
      ...formData,
      customer_id: customerId,
    };

    const { error } = await supabase.from('endkunden_contacts').upsert(dataToSave, { onConflict: 'id' });

    setLoading(false);
    if (error) {
      toast({ title: 'Fehler beim Speichern', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Erfolgreich gespeichert', description: `Der Ansprechpartner ${formData.name} wurde gespeichert.` });
      onSave();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex gap-4">
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700">Name *</label>
          <Input name="name" value={formData.name || ''} onChange={handleChange} required />
        </div>
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700">Rolle</label>
          <Input name="role" value={formData.role || ''} onChange={handleChange} />
        </div>
      </div>
      <div className="flex gap-4">
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700">E-Mail</label>
          <Input type="email" name="email" value={formData.email || ''} onChange={handleChange} />
        </div>
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700">Telefon</label>
          <Input name="phone" value={formData.phone || ''} onChange={handleChange} />
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={loading}>Abbrechen</Button>
        <Button type="submit" disabled={loading}>{loading ? 'Speichern...' : 'Speichern'}</Button>
      </div>
    </form>
  );
};

export default AnsprechpartnerForm;
