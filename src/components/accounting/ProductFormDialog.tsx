import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Database } from '@/integrations/supabase/database.types';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';

type Product = Database['public']['Tables']['products']['Row'];
type ProductFormData = Omit<Product, 'id' | 'created_at' | 'deleted_at' | 'deleted_by'>;

interface ProductFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  product: Partial<Product> | null;
}

const getInitialFormData = (): ProductFormData => ({
  product_number: '',
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
});

const ProductFormDialog = ({ isOpen, onClose, onSuccess, product }: ProductFormDialogProps) => {
  const { toast } = useToast();
  const [formData, setFormData] = useState<ProductFormData>(getInitialFormData());
  const [loading, setLoading] = useState(false);
  const [openingHoursOptions, setOpeningHoursOptions] = useState<Pick<Database['public']['Tables']['opening_hours']['Row'], 'id' | 'name'>[]>([]);

  const isEditMode = useMemo(() => !!product?.id, [product]);
  const isDuplicateMode = useMemo(() => !!product?.product_number && !product.id, [product]);

  useEffect(() => {
    const fetchOpeningHours = async () => {
      const { data, error } = await supabase.from('opening_hours').select('id, name').order('name');
      if (error) {
        console.error('Failed to fetch opening hours', error);
        toast({ title: 'Fehler', description: 'Öffnungszeiten-Vorlagen konnten nicht geladen werden.', variant: 'destructive' });
      } else {
        setOpeningHoursOptions(data || []);
      }
    };

    if (isOpen) {
      fetchOpeningHours();
    }

    if (isOpen && product) {
      setFormData({
        product_number: product.product_number ?? '',
        version: product.version ?? 1,
        name: product.name ?? '',
        minutes: product.minutes ?? 1000,
        outbound_hours: product.outbound_hours ?? 20,
        monthly_fee: product.monthly_fee ?? 0,
        setup_fee: product.setup_fee ?? 0,
        status: product.status ?? 'active',
        opening_hours_id: product.opening_hours_id ?? null,
        valid_from: product.valid_from ? format(parseISO(product.valid_from), 'yyyy-MM-dd') : null,
        valid_to: product.valid_to ? format(parseISO(product.valid_to), 'yyyy-MM-dd') : null,
      });
    } else if (!isOpen) {
      setFormData(getInitialFormData());
    }
  }, [isOpen, product]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleDateChange = (date: Date | undefined, field: 'valid_from' | 'valid_to') => {
    setFormData((prev) => ({ ...prev, [field]: date ? format(date, 'yyyy-MM-dd') : null }));
  };

  const handleOpeningHoursChange = (value: string) => {
    setFormData(prev => ({ ...prev, opening_hours_id: value === 'none' ? null : value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (!formData.name || !formData.product_number) {
      toast({ title: 'Fehler', description: 'Produktnummer und Name sind Pflichtfelder.', variant: 'destructive' });
      setLoading(false);
      return;
    }

    const dataToSubmit = {
      ...formData,
      version: Number(formData.version),
      minutes: Number(formData.minutes),
      outbound_hours: Number(formData.outbound_hours),
      monthly_fee: Number(formData.monthly_fee),
      setup_fee: Number(formData.setup_fee),
    };

    try {
      if (isEditMode) {
        const { data, error } = await supabase
          .from('products')
          .update(dataToSubmit)
          .eq('id', product!.id!)
          .select()
          .single();
        if (error) throw error;
        if (!data) throw new Error('Produkt wurde nicht gefunden oder konnte nicht aktualisiert werden.');
        toast({ title: 'Erfolg', description: 'Produkt erfolgreich aktualisiert.' });
      } else {
        const { error } = await supabase.from('products').insert(dataToSubmit).select();
        if (error) throw error;
        toast({ title: 'Erfolg', description: `Produkt erfolgreich ${isDuplicateMode ? 'dupliziert' : 'angelegt'}.` });
      }
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Fehler beim Speichern:', error);
      toast({ title: 'Fehler beim Speichern', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const dialogTitle = isEditMode ? 'Produkt bearbeiten' : (isDuplicateMode ? 'Produkt duplizieren' : 'Neues Produkt anlegen');

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="product_number" className="text-right">Produktnummer</Label>
              <Input id="product_number" name="product_number" value={formData.product_number} disabled className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="version" className="text-right">Version</Label>
              <Input id="version" name="version" type="number" value={formData.version} disabled className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">Name</Label>
              <Input id="name" name="name" value={formData.name} onChange={handleChange} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="minutes" className="text-right">Minuten</Label>
              <Input id="minutes" name="minutes" type="number" value={formData.minutes} onChange={handleChange} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="outbound_hours" className="text-right">Outbound-Stunden</Label>
              <Input id="outbound_hours" name="outbound_hours" type="number" value={formData.outbound_hours} onChange={handleChange} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="monthly_fee" className="text-right">Monatlich (€)</Label>
              <Input id="monthly_fee" name="monthly_fee" type="number" value={formData.monthly_fee} onChange={handleChange} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="setup_fee" className="text-right">Setup (€)</Label>
              <Input id="setup_fee" name="setup_fee" type="number" value={formData.setup_fee} onChange={handleChange} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="opening_hours_id" className="text-right">Öffnungszeiten</Label>
              <Select onValueChange={handleOpeningHoursChange} value={formData.opening_hours_id ?? 'none'}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Vorlage auswählen" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Keine Vorlage</SelectItem>
                  {openingHoursOptions.map(option => (
                    <SelectItem key={option.id} value={option.id}>{option.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="valid_from" className="text-right">Gültig von</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant={"outline"} className={cn("col-span-3 justify-start text-left font-normal", !formData.valid_from && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.valid_from ? format(parseISO(formData.valid_from), "dd.MM.yyyy") : <span>Datum wählen</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={formData.valid_from ? parseISO(formData.valid_from) : undefined} onSelect={(date) => handleDateChange(date, 'valid_from')} weekStartsOn={1} initialFocus />
                </PopoverContent>
              </Popover>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="valid_to" className="text-right">Gültig bis</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant={"outline"} className={cn("col-span-3 justify-start text-left font-normal", !formData.valid_to && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.valid_to ? format(parseISO(formData.valid_to), "dd.MM.yyyy") : <span>Datum wählen</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={formData.valid_to ? parseISO(formData.valid_to) : undefined} onSelect={(date) => handleDateChange(date, 'valid_to')} weekStartsOn={1} initialFocus />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Abbrechen</Button>
            <Button type="submit" disabled={loading}>{loading ? 'Speichern...' : 'Speichern'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ProductFormDialog;
