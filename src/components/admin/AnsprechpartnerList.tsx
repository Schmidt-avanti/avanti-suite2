import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowUpDown, PlusCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/database.types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import AnsprechpartnerForm from './AnsprechpartnerForm';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

type Ansprechpartner = Database['public']['Tables']['endkunden_contacts']['Row'];

interface AnsprechpartnerListProps {
  customerId: string;
}

type SortableAnsprechpartnerKeys = 'name' | 'role' | 'email' | 'phone';

type SortConfig = {
  key: SortableAnsprechpartnerKeys;
  direction: 'ascending' | 'descending';
};

const AnsprechpartnerList: React.FC<AnsprechpartnerListProps> = ({ customerId }) => {
  const { toast } = useToast();
  const [ansprechpartner, setAnsprechpartner] = useState<Ansprechpartner[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<SortConfig | null>({ key: 'name', direction: 'ascending' });
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAnsprechpartner, setEditingAnsprechpartner] = useState<Partial<Ansprechpartner> | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    fetchAnsprechpartner();
  }, [customerId]);

  const fetchAnsprechpartner = async () => {
    if (!customerId) return;
    const { data, error } = await supabase
      .from('endkunden_contacts')
      .select('*')
      .eq('customer_id', customerId)
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching ansprechpartner:', error);
    } else {
      setAnsprechpartner(data || []);
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    const { error } = await supabase.from('endkunden_contacts').delete().eq('id', deletingId);
    if (error) {
      toast({ title: 'Fehler beim Löschen', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Erfolgreich gelöscht' });
      fetchAnsprechpartner();
    }
    setDeletingId(null);
  };

  const handleSave = () => {
    setIsDialogOpen(false);
    fetchAnsprechpartner();
  };

  const requestSort = (key: SortableAnsprechpartnerKeys) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const sortedAndFiltered = useMemo(() => {
    let sortableItems: Ansprechpartner[] = [...ansprechpartner];
    if (searchTerm) {
      sortableItems = sortableItems.filter(item =>
        (item.name?.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.role?.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.email?.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.phone?.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];
        if (aValue === null || aValue === undefined) return 1;
        if (bValue === null || bValue === undefined) return -1;
        if (aValue < bValue) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableItems;
  }, [searchTerm, ansprechpartner, sortConfig]);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <Input
          placeholder={`Suchen in ${ansprechpartner.length} Ansprechpartnern...`}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditingAnsprechpartner(null)}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Ansprechpartner hinzufügen
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingAnsprechpartner ? 'Ansprechpartner bearbeiten' : 'Neuen Ansprechpartner erstellen'}</DialogTitle>
            </DialogHeader>
            <AnsprechpartnerForm 
              customerId={customerId}
              initialData={editingAnsprechpartner}
              onSave={handleSave}
              onCancel={() => setIsDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead><Button variant="ghost" onClick={() => requestSort('name')}>Name <ArrowUpDown className="ml-2 h-4 w-4" /></Button></TableHead>
              <TableHead><Button variant="ghost" onClick={() => requestSort('role')}>Rolle <ArrowUpDown className="ml-2 h-4 w-4" /></Button></TableHead>
              <TableHead><Button variant="ghost" onClick={() => requestSort('email')}>E-Mail <ArrowUpDown className="ml-2 h-4 w-4" /></Button></TableHead>
              <TableHead><Button variant="ghost" onClick={() => requestSort('phone')}>Telefon <ArrowUpDown className="ml-2 h-4 w-4" /></Button></TableHead>
              <TableHead className="text-right">Aktionen</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedAndFiltered.map((ap) => (
              <TableRow key={ap.id}>
                <TableCell>{ap.name}</TableCell>
                <TableCell>{ap.role}</TableCell>
                <TableCell>{ap.email}</TableCell>
                <TableCell>{ap.phone}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm" onClick={() => { setEditingAnsprechpartner(ap); setIsDialogOpen(true); }}>Bearbeiten</Button>
                  <AlertDialog onOpenChange={(open) => !open && setDeletingId(null)}>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600" onClick={() => setDeletingId(ap.id)}>Löschen</Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Sind Sie sicher?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Diese Aktion kann nicht rückgängig gemacht werden. Dadurch wird der Ansprechpartner dauerhaft gelöscht.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete}>Löschen</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default AnsprechpartnerList;
