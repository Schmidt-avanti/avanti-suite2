import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/database.types';
import { Endkunde, EndkundenContact, EndkundeWithContacts } from '../../types/db.types';

interface EndkundenFormProps {
  initialValues: Partial<Endkunde> | null;
  onSave: () => void;
  onCancel: () => void;
  customerId: string | null;
}

const EndkundenForm: React.FC<EndkundenFormProps> = ({ initialValues, onSave, onCancel, customerId }) => {
  const { toast } = useToast();
  const [values, setValues] = useState<Partial<Endkunde>>(initialValues || {});
  const [allContacts, setAllContacts] = useState<EndkundenContact[]>([]);
  const [assignedContactIds, setAssignedContactIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchAllContacts = async () => {
      if (!customerId) return;
      const { data, error } = await supabase
        .from('endkunden_contacts')
        .select('*')
        .eq('customer_id', customerId)
        .order('name', { ascending: true });

      if (error) {
        console.error('Error fetching all contacts:', error);
      } else {
        setAllContacts(data || []);
      }
    };

    if (customerId) {
        fetchAllContacts();
    }
  }, [customerId]);

  useEffect(() => {
    if (initialValues) {
      setValues(initialValues);
      const initialContactIds = new Set<string>(initialValues.endkunden_contacts?.split(',').filter(Boolean) || []);
      setAssignedContactIds(initialContactIds);
    } else {
      setValues({});
      setAssignedContactIds(new Set());
    }
  }, [initialValues]);

  const handleValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValues({ ...values, [e.target.name]: e.target.value });
  };

  const handleContactToggle = (contactId: string) => {
    setAssignedContactIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(contactId)) {
        newSet.delete(contactId);
      } else {
        newSet.add(contactId);
      }
      return newSet;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!values.Nachname || !values.Vorname) {
      toast({ title: 'Fehler', description: 'Vorname und Nachname sind Pflichtfelder.', variant: 'destructive' });
      return;
    }

    setLoading(true);
    
    const endkundeToSave = {
      ...values,
      Nachname: values.Nachname!,
      Vorname: values.Vorname!,
      Adresse: values.Adresse || '',
      Ort: values.Ort || '',
      Postleitzahl: values.Postleitzahl || '',
      customer_ID: values.id ? values.customer_ID : customerId,
      endkunden_contacts: Array.from(assignedContactIds).join(','),
    };

    const { error } = await supabase.from('endkunden').upsert(endkundeToSave, { onConflict: 'id' });

    setLoading(false);
    if (error) {
      toast({ title: 'Fehler beim Speichern', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Erfolgreich gespeichert' });
      onSave();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
                <label className="block text-sm font-medium text-gray-700">Nachname *</label>
                <Input name="Nachname" value={values.Nachname || ''} onChange={handleValueChange} required />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700">Vorname *</label>
                <Input name="Vorname" value={values.Vorname || ''} onChange={handleValueChange} required />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700">Adresse</label>
                <Input name="Adresse" value={values.Adresse || ''} onChange={handleValueChange} />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700">Postleitzahl</label>
                <Input name="Postleitzahl" value={values.Postleitzahl || ''} onChange={handleValueChange} />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700">Ort</label>
                <Input name="Ort" value={values.Ort || ''} onChange={handleValueChange} />
            </div>
        </div>

      <div className="space-y-2 pt-4 border-t">
        <h3 className="text-lg font-medium">Zugeordnete Ansprechpartner</h3>
        <div className="space-y-2 p-4 border rounded-lg bg-gray-50 max-h-60 overflow-y-auto">
            {allContacts.length > 0 ? allContacts.map((contact) => (
            <div key={contact.id} className="flex items-center">
                <Checkbox
                id={`contact-${contact.id}`}
                checked={assignedContactIds.has(contact.id)}
                onCheckedChange={() => handleContactToggle(contact.id)}
                />
                <label htmlFor={`contact-${contact.id}`} className="ml-3 text-sm font-medium">
                {contact.name} {contact.role ? `(${contact.role})` : ''}
                </label>
            </div>
            )) : <p className="text-sm text-muted-foreground">Für diesen Kunden wurden keine zentralen Ansprechpartner gefunden.</p>}
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={loading}>Abbrechen</Button>
        <Button type="submit" disabled={loading}>{loading ? 'Speichern...' : 'Speichern'}</Button>
      </div>
    </form>
  );
};

export default EndkundenForm;
