import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from 'sonner';
import { ProductOptionWithLatestVersion } from '@/pages/accounting/ProductOptions';

interface ProductOptionFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  option?: ProductOptionWithLatestVersion | null;
  isEditing?: boolean;
  isNewVersion?: boolean;
}

interface FormData {
  name: string;
  description: string;
  price_monthly: number;
  price_once: number;
  product_id: string | null;
}

interface Product {
  id: string;
  name: string;
}

const ProductOptionFormDialog: React.FC<ProductOptionFormDialogProps> = ({ isOpen, onClose, onSuccess, option, isEditing = false, isNewVersion = false }) => {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    description: '',
    price_monthly: 0,
    price_once: 0,
    product_id: null,
  });
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchProducts = async () => {
      const { data, error } = await supabase.from('products').select('id, name');
      if (error) {
        console.error('Error fetching products:', error);
        toast.error('Fehler beim Laden der Produkte.');
      } else {
        setProducts(data || []);
      }
    };

    if (isOpen) {
      fetchProducts();
      if (option) {
        setFormData({
          name: option.name,
          description: option.description || '',
          price_monthly: option.price_monthly,
          price_once: option.price_once,
          product_id: option.product_id || null,
        });
      } else {
        setFormData({
          name: '',
          description: '',
          price_monthly: 0,
          price_once: 0,
          product_id: null,
        });
      }
      setLoading(false);
    }
  }, [isOpen, option]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: name.startsWith('price') ? parseFloat(value) || 0 : value }));
  };

  const handleProductChange = (value: string) => {
    setFormData(prev => ({ ...prev, product_id: value === 'none' ? null : value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) {
      toast.error('Der Name der Option ist ein Pflichtfeld.');
      return;
    }
    
    setLoading(true);

    try {
      let error;

      // Neue Option erstellen
      if (!option) {
        const result = await supabase.rpc('create_product_option_with_version', {
          option_name: formData.name,
          p_product_id: formData.product_id || null,
          version_description: formData.description,
          monthly_price: formData.price_monthly,
          once_price: formData.price_once,
        });
        error = result.error;

        if (!error) {
          toast.success('Neue Produkt-Option erfolgreich erstellt.');
        }
      }
      // Bestehende Option mit neuer Version aktualisieren
      else if (isNewVersion || isEditing) {
        const result = await supabase.rpc('update_product_option_version', {
          p_option_id: option.id,
          p_description: formData.description,
          p_price_monthly: formData.price_monthly,
          p_price_once: formData.price_once,
        });
        error = result.error;

        if (!error) {
          toast.success(isNewVersion 
            ? 'Neue Version der Produktoption erstellt.' 
            : 'Produktoption erfolgreich aktualisiert.');
        }
      }

      if (error) throw error;

      onSuccess();
      onClose();
    } catch (error: any) {
        console.error('Error with product option:', error);
        toast.error(`Fehler: ${error.message}`);
    } finally {
        setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Produkt-Option bearbeiten' : 
             isNewVersion ? 'Neue Version erstellen' : 
             'Neue Produkt-Option erstellen'}
          </DialogTitle>
          <DialogDescription>
            {isEditing ? 'Bearbeiten Sie die ausgewählte Produktoption.' : 
             isNewVersion ? 'Erstellen Sie eine neue Version mit aktualisierten Preisen und Beschreibung.' : 
             'Legen Sie eine neue Option und deren erste Version an. Die Preise und Beschreibung können später versioniert werden.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Name der Option</Label>
              <Input id="name" name="name" placeholder="z.B. 24/7 Erreichbarkeit" value={formData.name} onChange={handleChange} required disabled={isNewVersion || isEditing} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Beschreibung</Label>
              <Textarea id="description" name="description" placeholder="Kurze Beschreibung, was diese Option beinhaltet..." value={formData.description} onChange={handleChange} rows={4} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="price_monthly">Monatlicher Preis (€)</Label>
              <Input id="price_monthly" name="price_monthly" type="number" value={formData.price_monthly} onChange={handleChange} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="price_once">Einmaliger Preis (€)</Label>
              <Input id="price_once" name="price_once" type="number" value={formData.price_once} onChange={handleChange} />
            </div>
            
            {/* Produkt-Zuordnung nur bei neuer Option oder Bearbeiten, nicht bei neuer Version anzeigen */}
            {!isNewVersion && (
              <div className="space-y-2">
                <Label htmlFor="product_id">abhängiges Basis-Produkt</Label>
                <Select
                  value={formData.product_id || 'none'}
                  onValueChange={handleProductChange}
                  disabled={isEditing} // Bei Bearbeiten nicht änderbar
                >
                <SelectTrigger>
                  <SelectValue placeholder="Optional zuweisen..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Keine Zuordnung</SelectItem>
                  {products.map((product) => (
                    <SelectItem key={product.id} value={product.id}>{product.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            )}
          </div>  
        <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>Abbrechen</Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Wird gespeichert...' : 
               isEditing ? 'Änderungen speichern' : 
               isNewVersion ? 'Neue Version erstellen' : 
               'Option erstellen'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ProductOptionFormDialog;
