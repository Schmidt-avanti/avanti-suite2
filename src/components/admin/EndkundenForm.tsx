import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/database.types';

type Endkunde = Database['public']['Tables']['endkunden']['Row'];
type EndkundenContact = Database['public']['Tables']['endkunden_contacts']['Row'];

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
      // endkunden_contacts is a single UUID, not comma-separated
      const initialContactIds = new Set<string>(initialValues.endkunden_contacts ? [initialValues.endkunden_contacts] : []);
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
      // Since endkunden_contacts is a single UUID, only allow one selection
      if (prev.has(contactId)) {
        return new Set(); // Deselect if already selected
      } else {
        return new Set([contactId]); // Select only this contact
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!values.Nachname || !values.Adresse) {
      toast({ title: 'Fehler', description: 'Nachname und Adresse sind Pflichtfelder.', variant: 'destructive' });
      return;
    }

    if (!customerId) {
      toast({ title: 'Fehler', description: 'Bitte wählen Sie einen Kunden aus, bevor Sie einen Endkunden hinzufügen.', variant: 'destructive' });
      return;
    }

    setLoading(true);
    
    const endkundeToSave = {
      ...values,
      Nachname: values.Nachname!,
      Vorname: values.Vorname || null,
      Adresse: values.Adresse!,
      Ort: values.Ort || null,
      Postleitzahl: values.Postleitzahl || null,
      customer_ID: customerId, // Always use the passed customerId for new entries
      endkunden_contacts: assignedContactIds.size > 0 ? Array.from(assignedContactIds)[0] : null, // Single UUID, not comma-separated
    };

    // For existing entries, preserve the original customer_ID
    if (values.id) {
      endkundeToSave.customer_ID = values.customer_ID;
    }

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
                <label className="block text-sm font-medium text-gray-700">Vorname</label>
                <Input name="Vorname" value={values.Vorname || ''} onChange={handleValueChange} />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700">Adresse *</label>
                <Input name="Adresse" value={values.Adresse || ''} onChange={handleValueChange} required />
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
        <h3 className="text-lg font-medium">Ansprechpartner zuordnen</h3>
        <p className="text-sm text-gray-600">Wählen Sie einen Ansprechpartner für diesen Endkunden aus (optional):</p>
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
