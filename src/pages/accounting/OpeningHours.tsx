import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/database.types';
import { Button } from '@/components/ui/button';
import { PlusCircle, Edit, Trash2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import OpeningHoursFormDialog from '@/components/accounting/OpeningHoursFormDialog';

type OpeningHours = Database['public']['Tables']['opening_hours']['Row'];

const OpeningHoursPage = () => {
  const [openingHours, setOpeningHours] = useState<OpeningHours[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingHours, setEditingHours] = useState<OpeningHours | null>(null);
  const { toast } = useToast();

  const fetchOpeningHours = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('opening_hours')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching opening hours:', error);
      toast({ title: 'Fehler', description: 'Öffnungszeiten konnten nicht geladen werden.', variant: 'destructive' });
    } else {
      setOpeningHours(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchOpeningHours();
  }, []);

  const handleAdd = () => {
    setEditingHours(null);
    setIsDialogOpen(true);
  };

  const handleEdit = (hours: OpeningHours) => {
    setEditingHours(hours);
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Sind Sie sicher, dass Sie diese Öffnungszeiten-Vorlage löschen möchten?')) {
      return;
    }

    const { error } = await supabase.from('opening_hours').delete().eq('id', id);

    if (error) {
      toast({ title: 'Fehler', description: 'Vorlage konnte nicht gelöscht werden. Möglicherweise wird sie noch von Produkten verwendet.', variant: 'destructive' });
    } else {
      toast({ title: 'Erfolg', description: 'Vorlage erfolgreich gelöscht.' });
      fetchOpeningHours(); // Refresh the list
    }
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setEditingHours(null);
  }

  const handleSuccess = () => {
    handleDialogClose();
    fetchOpeningHours();
  }

  return (
    <div className="p-4 md:p-8">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Öffnungszeiten-Vorlagen</CardTitle>
          <Button onClick={handleAdd}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Neue Vorlage
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p>Lade Vorlagen...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead className="text-right">Aktionen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {openingHours.map((hours) => (
                  <TableRow key={hours.id}>
                    <TableCell className="font-medium">{hours.name}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(hours)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(hours.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
           { !loading && openingHours.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-500">Noch keine Vorlagen für Öffnungszeiten angelegt.</p>
                <p className="text-gray-400 text-sm mt-2">Klicken Sie auf "Neue Vorlage", um zu beginnen.</p>
              </div>
            )}
        </CardContent>
      </Card>

      <OpeningHoursFormDialog
        isOpen={isDialogOpen}
        onClose={handleDialogClose}
        onSuccess={handleSuccess}
        openingHours={editingHours}
      />
    </div>
  );
};

export default OpeningHoursPage;
