import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Database } from '@/integrations/supabase/database.types';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Plus, RefreshCw, Trash2, Copy, Edit } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/components/ui/use-toast';
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle 
} from '@/components/ui/alert-dialog';
import { format } from 'date-fns';
import ProductFormDialog from '@/components/accounting/ProductFormDialog';

type Product = Database['public']['Tables']['products']['Row'];

type ProductWithOpeningHours = Product & {
  opening_hours: {
    name: string;
  } | null;
};

export default function ProductsPage() {
  const [products, setProducts] = useState<ProductWithOpeningHours[]>([]);
  const [loading, setLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Partial<Product> | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deletingProductId, setDeletingProductId] = useState<string | null>(null);
  const [nextProductNumber, setNextProductNumber] = useState('');
  const { toast } = useToast();

  const fetchProducts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('products')
      .select('*, opening_hours(name)')
      .order('product_number', { ascending: true })
      .order('version', { ascending: true });

    if (!error) {
      setProducts(data || []);
      if (data && data.length > 0) {
        const highestProductNumberStr = data.reduce((max, p) => (p.product_number > max ? p.product_number : max), "P-00000");
        const number = parseInt(highestProductNumberStr.split('-')[1]) + 1;
        const newProductNumber = `P-${String(number).padStart(5, '0')}`;
        setNextProductNumber(newProductNumber);
      } else {
        setNextProductNumber('P-00001');
      }
    } else {
        console.error("Error fetching products:", error);
        toast({ title: 'Fehler', description: 'Produkte konnten nicht geladen werden.', variant: 'destructive' });
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleCreateProduct = () => {
    const newProductTemplate: Partial<Product> = {
      product_number: nextProductNumber,
      version: 1,
      name: '',
      minutes: 1000,
      outbound_hours: 20,
      monthly_fee: 0,
      setup_fee: 0,
      status: 'active',
      opening_hours_id: null,
      valid_from: null,
      valid_to: null,
    };
    setEditingProduct(newProductTemplate);
    setIsDialogOpen(true);
  };

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
    setIsDialogOpen(true);
  };

  const handleDuplicateProduct = async (product: Product) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('products')
        .select('version')
        .eq('product_number', product.product_number)
        .order('version', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') { // Ignore 'exact one row not found'
        throw error;
      }

      const newVersion = (data?.version || 0) + 1;

      const newProductTemplate: Partial<Product> = {
        ...product,
        version: newVersion,
      };
      delete (newProductTemplate as any).id;
      delete (newProductTemplate as any).created_at;

      setEditingProduct(newProductTemplate);
      setIsDialogOpen(true);
    } catch (err: any) {
      console.error('Error preparing product duplication:', err);
      toast({ title: 'Fehler', description: `Produkt konnte nicht dupliziert werden: ${err.message}`, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteConfirmation = (productId: string) => {
    setDeletingProductId(productId);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteProduct = async () => {
    if (!deletingProductId) return;
    setLoading(true);
    try {
      const { error, count } = await supabase
        .from('products')
        .delete({ count: 'exact' })
        .eq('id', deletingProductId);

      if (error) throw error;
      if (count === 0 || count === null) throw new Error('Produkt wurde nicht gefunden oder konnte nicht gelöscht werden (RLS-Richtlinie?).');

      toast({ title: 'Erfolg', description: 'Produkt erfolgreich gelöscht.' });
      fetchProducts();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Fehler beim Löschen',
        description: error.message,
      });
    } finally {
      setLoading(false);
      setIsDeleteDialogOpen(false);
      setDeletingProductId(null);
    }
  };  

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingProduct(null);
  };

  return (
    <div className="p-8">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <h2 className="text-xl font-semibold">Produkte</h2>
          <div className="flex gap-2">
            <Button variant="outline" onClick={fetchProducts} disabled={loading}>
              <RefreshCw className="w-4 h-4 mr-2" /> Aktualisieren
            </Button>
            <Button variant="default" onClick={handleCreateProduct} disabled={!nextProductNumber || loading}>
              <Plus className="w-4 h-4 mr-2" /> Neu
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produktnr.</TableHead>
                <TableHead>Ver.</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Minuten</TableHead>
                <TableHead>Outbound-Std.</TableHead>
                <TableHead>Monatlich (€)</TableHead>
                <TableHead>Setup (€)</TableHead>
                <TableHead>Gültig von</TableHead>
                <TableHead>Gültig bis</TableHead>
                <TableHead>Öffnungszeiten</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Aktionen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={12} className="text-center">
                    Lade Produkte...
                  </TableCell>
                </TableRow>
              ) : products.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={12} className="text-center">
                    Keine Produkte gefunden.
                  </TableCell>
                </TableRow>
              ) : (
                products.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>{p.product_number}</TableCell>
                    <TableCell>{p.version}</TableCell>
                    <TableCell>{p.name}</TableCell>
                    <TableCell>{p.minutes}</TableCell>
                    <TableCell>{p.outbound_hours}</TableCell>
                    <TableCell>{p.monthly_fee}</TableCell>
                    <TableCell>{p.setup_fee}</TableCell>
                    <TableCell>{p.valid_from ? format(new Date(p.valid_from), 'dd.MM.yyyy') : '-'}</TableCell>
                    <TableCell>{p.valid_to ? format(new Date(p.valid_to), 'dd.MM.yyyy') : '-'}</TableCell>
                    <TableCell>{p.opening_hours?.name || '-'}</TableCell>
                    <TableCell>{p.status}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => handleEditProduct(p)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" title="Duplizieren" onClick={() => handleDuplicateProduct(p)}>
                        <Copy className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteConfirmation(p.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      {isDialogOpen && (
        <ProductFormDialog
          isOpen={isDialogOpen}
          onClose={handleCloseDialog}
          onSuccess={() => {
            handleCloseDialog();
            fetchProducts();
          }}
          product={editingProduct}
        />
      )}

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sind Sie sicher?</AlertDialogTitle>
            <AlertDialogDescription>
              Diese Aktion kann nicht rückgängig gemacht werden. Das Produkt wird dauerhaft gelöscht.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteProduct}>Löschen</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
