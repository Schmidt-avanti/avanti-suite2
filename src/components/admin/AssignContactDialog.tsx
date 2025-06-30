import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { PostgrestResponse } from '@supabase/supabase-js';
import { EndkundenContact } from '../../types/db.types';

interface AssignContactDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerId: string | null;
  selectedEndkundenIds: string[];
  onAssignSuccess: () => void;
}

const AssignContactDialog: React.FC<AssignContactDialogProps> = ({
  open,
  onOpenChange,
  customerId,
  selectedEndkundenIds,
  onAssignSuccess,
}) => {
  const [dialogContacts, setDialogContacts] = useState<EndkundenContact[]>([]);
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!open || !customerId) {
      setDialogContacts([]);
      return;
    }

    const fetchDialogContacts = async () => {
      const response: PostgrestResponse<EndkundenContact> = await supabase
        .from('endkunden_contacts')
        .select('*')
        .eq('customer_id', customerId);
      
      const { data, error } = response;

      if (error) {
        console.error('Error fetching contacts for dialog:', error);
        setDialogContacts([]);
      } else {
        setDialogContacts(data || []);
      }
    };

    fetchDialogContacts();
  }, [open, customerId]);

  const handleAssignContact = async () => {
    if (!selectedContactId || selectedEndkundenIds.length === 0) return;

    const { data: endkundenToUpdate, error: fetchError } = await supabase
      .from('endkunden')
      .select('id, endkunden_contacts')
      .in('id', selectedEndkundenIds);

    if (fetchError || !endkundenToUpdate) {
      console.error('Error fetching endkunden for update:', fetchError);
      toast({ title: 'Fehler', description: 'Endkunden für Update konnten nicht geladen werden.', variant: 'destructive' });
      return;
    }

    const updatePromises = endkundenToUpdate.map(ek => {
      const currentContactIds = ek.endkunden_contacts ? ek.endkunden_contacts.split(',').filter(id => id) : [];
      if (!currentContactIds.includes(selectedContactId)) {
        currentContactIds.push(selectedContactId);
      }
      return supabase
        .from('endkunden')
        .update({ endkunden_contacts: currentContactIds.join(',') })
        .eq('id', ek.id);
    });

    const results = await Promise.all(updatePromises);
    const firstError = results.find(res => res.error);

    if (firstError) {
      console.error('Error assigning contact:', firstError.error);
      toast({
        title: 'Fehler bei der Zuweisung',
        description: `Es ist ein Fehler aufgetreten: ${firstError.error.message}`,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Erfolgreich zugewiesen',
        description: `Der Ansprechpartner wurde ${selectedEndkundenIds.length} Endkunden zugewiesen.`,
      });
      onAssignSuccess();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ansprechpartner zuweisen</DialogTitle>
          <DialogDescription>
            Wählen Sie einen Ansprechpartner aus, der den ausgewählten {selectedEndkundenIds.length} Endkunden zugewiesen werden soll.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <Select onValueChange={setSelectedContactId} value={selectedContactId || ''}>
            <SelectTrigger>
              <SelectValue placeholder="Ansprechpartner auswählen..." />
            </SelectTrigger>
            <SelectContent>
              {dialogContacts.map(contact => (
                <SelectItem key={contact.id} value={contact.id}>
                  {contact.name} ({contact.email || contact.phone})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Abbrechen</Button>
          <Button onClick={handleAssignContact} disabled={!selectedContactId}>Zuweisen</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AssignContactDialog;
