import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowUpDown } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import EndkundenForm from '@/components/admin/EndkundenForm';
import AssignContactDialog from '@/components/admin/AssignContactDialog';
import { supabase } from '@/integrations/supabase/client';
import { Endkunde, EndkundenContact } from '../../types/db.types';

interface EndkundenListProps {
  customerId: string | null;
  refreshTrigger?: number;
}

const EndkundenList: React.FC<EndkundenListProps> = ({ customerId, refreshTrigger }) => {
  const [endkunden, setEndkunden] = useState<Endkunde[]>([]);
  const [contactsMap, setContactsMap] = useState<Record<string, EndkundenContact>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEndkunde, setSelectedEndkunde] = useState<Endkunde | null>(null);
  const [endkundeToDelete, setEndkundeToDelete] = useState<Endkunde | null>(null);
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [sortConfig, setSortConfig] = useState<{ key: keyof Endkunde; direction: 'ascending' | 'descending' } | null>({ key: 'Nachname', direction: 'ascending' });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const { toast } = useToast();
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [lastSelectedRowIndex, setLastSelectedRowIndex] = useState<number | null>(null);

  const fetchEndkunden = useCallback(async () => {
    let endkundenQuery = supabase.from('endkunden').select('*');
    if (customerId) {
      endkundenQuery = endkundenQuery.eq('customer_ID', customerId);
    }

    const { data: endkundenData, error: endkundenError } = await endkundenQuery;

    if (endkundenError) {
      console.error('Error fetching endkunden:', endkundenError);
      setEndkunden([]);
      return;
    }

    if (!endkundenData || endkundenData.length === 0) {
      setEndkunden([]);
      setContactsMap({});
      return;
    }
    
    setEndkunden(endkundenData);

    const contactIds = Array.from(
      new Set(
        endkundenData.flatMap(ek => (ek.endkunden_contacts ? ek.endkunden_contacts.split(',') : [])).filter(id => id)
      )
    );

    if (contactIds.length === 0) {
      setContactsMap({});
      return;
    }

    const { data: contactsData, error: contactsError } = await supabase
      .from('endkunden_contacts')
      .select('*')
      .in('id', contactIds);

    if (contactsError) {
      console.error('Error fetching contacts:', contactsError);
      setContactsMap({});
      return;
    }

    const newContactsMap = new Map(contactsData.map(c => [c.id, c]));
    setContactsMap(Object.fromEntries(newContactsMap));
  }, [customerId]);

  useEffect(() => {
    fetchEndkunden();
  }, [customerId, refreshTrigger, fetchEndkunden]);

  const sortedAndFilteredEndkunden = useMemo(() => {
    let filteredItems = endkunden;
    if (searchTerm) {
      const lowercasedFilter = searchTerm.toLowerCase();
      filteredItems = endkunden.filter(ek => {
        const searchString = Object.values(ek).join(' ').toLowerCase();
        return searchString.includes(lowercasedFilter);
      });
    }

    const sortedItems = [...filteredItems];
    if (sortConfig !== null) {
      sortedItems.sort((a, b) => {
        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];

        if (aValue === null || aValue === undefined) return sortConfig.direction === 'ascending' ? 1 : -1;
        if (bValue === null || bValue === undefined) return sortConfig.direction === 'ascending' ? -1 : 1;

        const valA = typeof aValue === 'string' ? aValue.toLowerCase() : aValue;
        const valB = typeof bValue === 'string' ? bValue.toLowerCase() : bValue;

        if (valA < valB) return sortConfig.direction === 'ascending' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'ascending' ? 1 : -1;
        return 0;
      });
    }
    return sortedItems;
  }, [searchTerm, endkunden, sortConfig]);

  const requestSort = (key: keyof Endkunde) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const handleSelectAll = (checked: boolean) => {
    setSelectedRows(checked ? sortedAndFilteredEndkunden.map(ek => ek.id) : []);
  };

  const handleRowClick = (clickedId: string, clickedIndex: number, event: React.MouseEvent) => {
    if ((event.target as HTMLElement).closest('button, a')) {
      return;
    }

    if (event.shiftKey && lastSelectedRowIndex !== null) {
      const start = Math.min(lastSelectedRowIndex, clickedIndex);
      const end = Math.max(lastSelectedRowIndex, clickedIndex);
      const rangeIds = sortedAndFilteredEndkunden.slice(start, end + 1).map(ek => ek.id);

      setSelectedRows(prev => {
        const selection = new Set(prev);
        rangeIds.forEach(id => selection.add(id));
        return Array.from(selection);
      });
    } else {
      setSelectedRows(prev =>
        prev.includes(clickedId) ? prev.filter(rowId => rowId !== clickedId) : [...prev, clickedId]
      );
    }
    setLastSelectedRowIndex(clickedIndex);
  };

  const handleAdd = () => {
    setSelectedEndkunde(null);
    setIsModalOpen(true);
  };

  const handleEdit = (endkunde: Endkunde) => {
    setSelectedEndkunde(endkunde);
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    const ekToDelete = endkunden.find(ek => ek.id === id);
    if (ekToDelete) setEndkundeToDelete(ekToDelete);
  };

  const confirmDelete = async () => {
    if (!endkundeToDelete) return null;

    try {
      const { error } = await supabase.from('endkunden').delete().eq('id', endkundeToDelete.id);

      if (error) {
        throw error;
      }

      toast({
        title: 'Erfolgreich gelöscht',
        description: `Der Endkunde "${endkundeToDelete.Firma || `${endkundeToDelete.Vorname} ${endkundeToDelete.Nachname}`}" wurde erfolgreich entfernt.`,
      });

      fetchEndkunden();
      setEndkundeToDelete(null);
      return null;

    } catch (error: any) {
      console.error('Error deleting endkunde:', error);
      toast({
        title: 'Fehler beim Löschen',
        description: `Es ist ein Fehler aufgetreten: ${error.message}`,
        variant: 'destructive',
      });
      setEndkundeToDelete(null);
      return error;
    }
  };

  const confirmBulkDelete = async () => {
    try {
      const { error } = await supabase.from('endkunden').delete().in('id', selectedRows);

      if (error) {
        throw error;
      }

      toast({
        title: 'Erfolgreich gelöscht',
        description: `${selectedRows.length} Endkunden wurden erfolgreich entfernt.`,
      });

      setSelectedRows([]);
      fetchEndkunden();
    } catch (error: any) {
      console.error('Error bulk deleting endkunden:', error);
      toast({
        title: 'Fehler beim Löschen',
        description: `Es ist ein Fehler aufgetreten: ${error.message}`,
        variant: 'destructive',
      });
    } finally {
      setShowDeleteConfirm(false);
    }
  };

  const handleSave = () => {
    setIsModalOpen(false);
    setSelectedEndkunde(null);
    fetchEndkunden();
  };

  const handleCancel = () => {
    setIsModalOpen(false);
    setSelectedEndkunde(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <Input
            placeholder={`Suchen in ${sortedAndFilteredEndkunden.length} Endkunden...`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm"
          />
          {selectedRows.length > 0 && (
            <>
              <Button variant="outline" size="sm" onClick={() => setShowAssignDialog(true)}>Ansprechpartner zuweisen</Button>
              <Button variant="destructive" size="sm" onClick={() => setShowDeleteConfirm(true)}>Auswahl löschen ({selectedRows.length})</Button>
            </>
          )}
        </div>
        <Button onClick={handleAdd}>Endkunde hinzufügen</Button>
      </div>

      <AssignContactDialog
        open={showAssignDialog}
        onOpenChange={setShowAssignDialog}
        customerId={customerId}
        selectedEndkundenIds={selectedRows}
        onAssignSuccess={() => {
          setShowAssignDialog(false);
          setSelectedRows([]);
          fetchEndkunden();
        }}
      />

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">
                <Checkbox
                  checked={sortedAndFilteredEndkunden.length > 0 && selectedRows.length === sortedAndFilteredEndkunden.length}
                  onCheckedChange={(checked) => handleSelectAll(Boolean(checked))}
                  aria-label="Alle auswählen"
                />
              </TableHead>
              {['Nachname', 'Vorname', 'Adresse', 'Postleitzahl', 'Ort'].map(key => (
                <TableHead key={key}>
                  <Button variant="ghost" onClick={() => requestSort(key as keyof Endkunde)}>
                    {key} <ArrowUpDown className="ml-2 h-4 w-4" />
                  </Button>
                </TableHead>
              ))}
              <TableHead>Ansprechpartner</TableHead>
              <TableHead className="text-right">Aktionen</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedAndFilteredEndkunden.map((endkunde, index) => (
              <TableRow 
                key={endkunde.id} 
                data-state={selectedRows.includes(endkunde.id) ? "selected" : undefined}
                onClick={(e) => handleRowClick(endkunde.id, index, e)}
                className="cursor-pointer"
              >
                <TableCell className="w-[50px]">
                  <Checkbox
                    checked={selectedRows.includes(endkunde.id)}
                    aria-label={`Endkunde ${endkunde.Vorname} ${endkunde.Nachname} auswählen`}
                  />
                </TableCell>
                <TableCell>{endkunde.Nachname}</TableCell>
                <TableCell>{endkunde.Vorname}</TableCell>
                <TableCell>{endkunde.Adresse}</TableCell>
                <TableCell>{endkunde.Postleitzahl}</TableCell>
                <TableCell>{endkunde.Ort}</TableCell>
                <TableCell>
                  {(() => {
                    const contactIdsForEk = endkunde.endkunden_contacts ? endkunde.endkunden_contacts.split(',').filter(id => id) : [];
                    const contactsForEk = contactIdsForEk.map(id => contactsMap[id]).filter(Boolean);

                    return contactsForEk.length > 0 ? (
                      <HoverCard>
                        <HoverCardTrigger asChild>
                          <span className="cursor-pointer underline decoration-dotted">
                            {contactsForEk.length} Ansprechpartner
                          </span>
                        </HoverCardTrigger>
                        <HoverCardContent>
                          <ul className="space-y-1">
                            {contactsForEk.map(c => (
                              <li key={c.id} className="text-sm">{c.name} ({c.email || c.phone || 'Kein Kontakt'})</li>
                            ))}
                          </ul>
                        </HoverCardContent>
                      </HoverCard>
                    ) : (
                      'Keine'
                    );
                  })()}
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleEdit(endkunde); }}>Bearbeiten</Button>
                  <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600" onClick={(e) => { e.stopPropagation(); handleDelete(endkunde.id); }}>Löschen</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{selectedEndkunde ? 'Endkunde bearbeiten' : 'Endkunde hinzufügen'}</DialogTitle>
          </DialogHeader>
          <EndkundenForm
            key={selectedEndkunde?.id || 'new'}
            initialValues={selectedEndkunde}
            onSave={handleSave}
            onCancel={handleCancel}
            customerId={customerId}
          />
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!endkundeToDelete} onOpenChange={(open) => !open && setEndkundeToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sind Sie sicher?</AlertDialogTitle>
            <AlertDialogDescription>
              Dies wird den Endkunden "{endkundeToDelete?.Vorname} {endkundeToDelete?.Nachname}" dauerhaft löschen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={async () => {
              const error = await confirmDelete();
              if (error) {
                toast({
                  title: 'Fehler beim Löschen',
                  description: `Es ist ein Fehler aufgetreten: ${(error as any).message}`,
                  variant: 'destructive',
                });
              } else {
                toast({
                  title: 'Erfolgreich gelöscht',
                  description: 'Der Endkunde wurde erfolgreich entfernt.',
                });
              }
            }}>
              Löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sind Sie sicher?</AlertDialogTitle>
            <AlertDialogDescription>
              Diese Aktion kann nicht rückgängig gemacht werden. Dies wird {selectedRows.length} ausgewählte Endkunden dauerhaft löschen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={confirmBulkDelete}>Löschen</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default EndkundenList;
