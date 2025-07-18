import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { PlusCircle, Edit, Trash2 } from 'lucide-react';
import EndkundenKontaktForm from './EndkundenKontaktForm';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from '@/contexts/AuthContext';

interface Kontakt {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  role: string | null;
  customer_id?: string | null;
}

const EndkundenKontakteList: React.FC = () => {
  const { id: endkundeId } = useParams<{ id: string }>();
  const [kontakte, setKontakte] = useState<Kontakt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [kontaktToEdit, setKontaktToEdit] = useState<Kontakt | null>(null);
  const [kontaktToDelete, setKontaktToDelete] = useState<Kontakt | null>(null);
  const [kunden, setKunden] = useState<{id: string, name: string}[]>([]);
  const [selectedKunde, setSelectedKunde] = useState<string>('all');
  const { user } = useAuth();

  useEffect(() => {
    const fetchKunden = async () => {
      const { data, error } = await supabase
        .from('customers')
        .select('id, name');
      if (!error && data) setKunden(data);
    };
    fetchKunden();
  }, []);

  useEffect(() => {
    fetchKontakte();
  }, [selectedKunde]);

  const fetchKontakte = async () => {
    setLoading(true);
    setError(null);
    let allowedCustomerIds: string[] | null = null;
    if (user?.role === 'agent' || user?.role === 'customer') {
      const { data: assignments, error: assignError } = await supabase
        .from('user_customer_assignments')
        .select('customer_id')
        .eq('user_id', user.id);
      if (!assignError && assignments) {
        allowedCustomerIds = assignments.map(a => a.customer_id);
      }
    }
    try {
      let query = supabase
        .from('endkunden_contacts')
        .select('id, name, email, phone, role, customer_id');
      if (user?.role === 'admin') {
        if (selectedKunde && selectedKunde !== 'all') {
          query = query.eq('customer_id', selectedKunde);
        }
      } else if (allowedCustomerIds) {
        query = query.in('customer_id', allowedCustomerIds);
      }
      const { data: contactsData, error: contactsError } = await query;
      if (contactsError) throw new Error(`Fehler beim Laden der Kontakte: ${contactsError.message}`);
      setKontakte(contactsData || []);
    } catch (err: any) {
      setError(err.message);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (kontakt: any) => {
    setError(null);
    try {
        const { id, ...kontaktDaten } = kontakt;
        
        if (id) {
            // Update existing contact
            const { error: updateError } = await supabase
                .from('endkunden_contacts')
                .update(kontaktDaten)
                .eq('id', id);
            if (updateError) throw updateError;
        } else {
            // Create new contact and link it
            const { data: newContact, error: insertError } = await supabase
                .from('endkunden_contacts')
                .insert(kontaktDaten)
                .select('id')
                .single();
            
            if (insertError) throw insertError;
            if (!newContact) throw new Error("Konnte neuen Kontakt nicht erstellen.");

            const newContactId = newContact.id;

            const { data: endkundeData, error: fetchError } = await supabase
                .from('endkunden')
                .select('endkunden_contacts')
                .eq('id', endkundeId!)
                .single();

            if (fetchError) throw fetchError;

            const existingIds = endkundeData?.endkunden_contacts || '';
            const newIdList = existingIds ? `${existingIds},${newContactId}` : newContactId;

            const { error: linkError } = await supabase
                .from('endkunden')
                .update({ endkunden_contacts: newIdList })
                .eq('id', endkundeId!);
            
            if (linkError) throw linkError;
        }

        setShowForm(false);
        setKontaktToEdit(null);
        fetchKontakte();
    } catch (err: any) {
        setError('Fehler beim Speichern des Kontakts.');
        console.error(err);
    }
  };

  const handleEdit = (kontakt: Kontakt) => {
    setKontaktToEdit(kontakt);
    setShowForm(true);
  };

  const handleDelete = (kontakt: Kontakt) => {
    setKontaktToDelete(kontakt);
  };

  const confirmDelete = async () => {
    if (!kontaktToDelete || !endkundeId) return;
    try {
        const contactIdToDelete = kontaktToDelete.id;

        const { data: endkundeData, error: fetchError } = await supabase
            .from('endkunden')
            .select('endkunden_contacts')
            .eq('id', endkundeId)
            .single();
        
        if (fetchError) throw fetchError;

        const existingIds = endkundeData?.endkunden_contacts || '';
        const idList = existingIds.split(',').map(id => id.trim());
        const newList = idList.filter(id => id !== contactIdToDelete).join(',');

        const { error: updateError } = await supabase
            .from('endkunden')
            .update({ endkunden_contacts: newList })
            .eq('id', endkundeId);
        
        if (updateError) throw updateError;

        const { error: deleteError } = await supabase
            .from('endkunden_contacts')
            .delete()
            .eq('id', contactIdToDelete);

        if (deleteError) throw deleteError;

        fetchKontakte();
    } catch (err: any) {
        setError('Fehler beim Löschen des Kontakts.');
        console.error(err);
    } finally {
        setKontaktToDelete(null);
    }
  };

  const handleAddNew = () => {
    setKontaktToEdit(null);
    setShowForm(true);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Ansprechpartner</CardTitle>
        <Button onClick={handleAddNew}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Ansprechpartner hinzufügen
        </Button>
      </CardHeader>
      <CardContent>
        <div className="mb-4 flex items-center gap-4">
          <Select value={selectedKunde} onValueChange={setSelectedKunde}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Kunde filtern..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle Kunden</SelectItem>
              {kunden.map(k => (
                <SelectItem key={k.id} value={k.id}>{k.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {showForm && (
          <EndkundenKontaktForm
            kontaktToEdit={kontaktToEdit}
            onSave={handleSave}
            onCancel={() => {
              setShowForm(false);
              setKontaktToEdit(null);
            }}
          />
        )}

        {loading ? (
          <p>Lade Kontakte...</p>
        ) : error ? (
          <p className="text-red-500">{error}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Rolle</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Telefon</TableHead>
                <TableHead className="text-right">Aktionen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {kontakte.length > 0 ? (
                kontakte.map(kontakt => (
                  <TableRow key={kontakt.id}>
                    <TableCell>{kontakt.name}</TableCell>
                    <TableCell>{kontakt.role || '-'}</TableCell>
                    <TableCell>{kontakt.email || '-'}</TableCell>
                    <TableCell>{kontakt.phone || '-'}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(kontakt)}><Edit className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(kontakt)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center">Keine Ansprechpartner für diesen Endkunden gefunden.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}

        <AlertDialog open={!!kontaktToDelete} onOpenChange={(open) => !open && setKontaktToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Sind Sie sicher?</AlertDialogTitle>
              <AlertDialogDescription>
                Möchten Sie den Kontakt <span className="font-bold">{kontaktToDelete?.name}</span> wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setKontaktToDelete(null)}>Abbrechen</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDelete}>Löschen</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

      </CardContent>
    </Card>
  );
};

export default EndkundenKontakteList;
