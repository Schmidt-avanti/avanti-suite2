import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PlusCircle, MoreHorizontal } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import ProductOptionFormDialog from '@/components/accounting/ProductOptionFormDialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

// This type definition is used by both the page and the dialog form
export interface ProductOptionWithLatestVersion {
  id: string;
  name: string;
  product_id: string | null;
  product_name: string | null;
  description: string;
  price_monthly: number;
  price_once: number;
  version: number;
  is_active: boolean;
};

const ProductOptionsPage: React.FC = () => {
  const [options, setOptions] = useState<ProductOptionWithLatestVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedOption, setSelectedOption] = useState<ProductOptionWithLatestVersion | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreatingVersion, setIsCreatingVersion] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // useCallback helps to memoize the function so it's not recreated on every render
  const fetchOptions = useCallback(async () => {
    setLoading(true);
    try {
      // We're selecting all product options along with their latest version details
      // Korrigierte Abfrage ohne products-Join - wir holen uns die Produkte manuell
      const { data, error } = await supabase
        .from('product_options')
        .select(`
          id,
          name,
          product_id,
          is_active,
          product_option_versions!inner (description, price_monthly, price_once, version)
        `)
        .order('name');

      if (error) throw error;

      // Transform the returned data to match our expected structure
      // For each option, we only keep the latest version (by version number)
      if (data) {
        // Hole alle benötigten Produkt-IDs
        const productIds = data
          .map(item => item.product_id)
          .filter(id => id !== null) as string[];
        
        // Lade Produktnamen separat, falls nötig
        let productMap: Record<string, string> = {};
        
        if (productIds.length > 0) {
          const { data: productsData } = await supabase
            .from('products')
            .select('id, name')
            .in('id', productIds);
            
          if (productsData) {
            productMap = productsData.reduce((acc, prod) => {
              acc[prod.id] = prod.name;
              return acc;
            }, {} as Record<string, string>);
          }
        }
          
        const optionsWithLatestVersion = data.map((item: any) => {
          // Hole Produktnamen aus der Map
          const productName = item.product_id ? productMap[item.product_id] : null;
          
          // Sort versions to find the latest one
          const versions = item.product_option_versions;
          const latestVersion = versions.sort((a: any, b: any) => b.version - a.version)[0];
          
          // Return the option with its latest version details
          return {
            id: item.id,
            name: item.name,
            product_id: item.product_id,
            product_name: productName,
            description: latestVersion.description,
            price_monthly: latestVersion.price_monthly,
            price_once: latestVersion.price_once,
            version: latestVersion.version,
            is_active: item.is_active !== false // Default to true if undefined
          };
        });
        
        setOptions(optionsWithLatestVersion);
      }
    } catch (error: any) {
      console.error('Error fetching product options:', error);
      toast.error('Fehler beim Laden der Produktoptionen: ' + error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch options when the component mounts
  useEffect(() => {
    fetchOptions();
  }, [fetchOptions]);

  // Handle editing an option
  const handleEdit = (option: ProductOptionWithLatestVersion) => {
    setSelectedOption(option);
    setIsEditing(true);
  };

  // Handle creating a new version
  const handleCreateVersion = (option: ProductOptionWithLatestVersion) => {
    setSelectedOption(option);
    setIsCreatingVersion(true);
  };

  // Handle delete confirmation dialog
  const handleDelete = (id: string) => {
    setDeletingId(id);
    setDeleteDialogOpen(true);
  };

  // Handle actual deletion after confirmation
  const confirmDelete = async () => {
    if (!deletingId) return;
    
    try {
      const { error } = await supabase.rpc('delete_product_option', {
        p_option_id: deletingId
      });
      
      if (error) throw error;
      
      toast.success('Produkt-Option erfolgreich gelöscht');
      fetchOptions();
    } catch (error: any) {
      console.error('Error deleting product option:', error);
      toast.error('Fehler beim Löschen der Option: ' + error.message);
    } finally {
      setDeleteDialogOpen(false);
      setDeletingId(null);
    }
  };
  
  // Handle toggling active state
  const handleToggleActive = async (id: string, newActiveState: boolean) => {
    try {
      // Update the option's active state in the database
      const { error } = await supabase
        .from('product_options')
        .update({ is_active: newActiveState })
        .eq('id', id);
      
      if (error) throw error;
      
      toast.success(`Produkt-Option ${newActiveState ? 'aktiviert' : 'deaktiviert'}`);
      fetchOptions(); // Refresh the data
    } catch (error: any) {
      console.error('Error updating product option status:', error);
      toast.error(`Fehler beim ${newActiveState ? 'Aktivieren' : 'Deaktivieren'} der Option: ${error.message}`);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Produkt-Optionen</h1>
        <Button onClick={() => setIsFormOpen(true)}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Neue Option erstellen
        </Button>
      </div>

      <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[250px]">Name</TableHead>
              <TableHead>Produkt</TableHead>
              <TableHead className="text-center">Version</TableHead>
              <TableHead className="text-right">Monatl. Preis</TableHead>
              <TableHead className="text-right">Einmal. Preis</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead><span className="sr-only">Aktionen</span></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={7} className="text-center py-10">Lade Optionen...</TableCell></TableRow>
            ) : options.length > 0 ? (
              options.map((option) => (
                <TableRow key={option.id}>
                  <TableCell className="font-medium">{option.name}</TableCell>
                  <TableCell>
                    {option.product_name ? <Badge>{option.product_name}</Badge> : '-'}
                  </TableCell>
                  <TableCell className="text-center">{option.version}</TableCell>
                  <TableCell className="text-right">{option.price_monthly.toFixed(2)} €</TableCell>
                  <TableCell className="text-right">{option.price_once.toFixed(2)} €</TableCell>
                  <TableCell>
                    <Badge 
                      className={`hover:cursor-pointer ${option.is_active ? 'bg-blue-600' : 'bg-gray-500'}`} 
                      onClick={() => handleToggleActive(option.id, !option.is_active)}
                    >
                      {option.is_active ? 'Aktiv' : 'Inaktiv'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Menü öffnen</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEdit(option)}>Bearbeiten</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleCreateVersion(option)}>Neue Version erstellen</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleDelete(option.id)} className="text-red-600">Löschen</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow><TableCell colSpan={7} className="text-center py-10">Keine Optionen gefunden. Erstellen Sie die erste!</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      {/* Main Create Dialog */}
      <ProductOptionFormDialog
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSuccess={() => {
          setIsFormOpen(false); // Close the dialog on success
          fetchOptions();      // Refetch data to update the table
        }}
      />
      
      {/* Edit Dialog */}
      <ProductOptionFormDialog
        isOpen={isEditing}
        onClose={() => {
          setIsEditing(false);
          setSelectedOption(null);
        }}
        onSuccess={() => {
          setIsEditing(false);
          setSelectedOption(null);
          fetchOptions();
        }}
        option={selectedOption}
        isEditing={true}
      />
      
      {/* Create New Version Dialog */}
      <ProductOptionFormDialog
        isOpen={isCreatingVersion}
        onClose={() => {
          setIsCreatingVersion(false);
          setSelectedOption(null);
        }}
        onSuccess={() => {
          setIsCreatingVersion(false);
          setSelectedOption(null);
          fetchOptions();
        }}
        option={selectedOption}
        isNewVersion={true}
      />
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Produkt-Option löschen</AlertDialogTitle>
            <AlertDialogDescription>
              Möchten Sie diese Produkt-Option wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden und löscht auch alle Versionen dieser Option.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">Löschen</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ProductOptionsPage;
