import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/database.types';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { PlusCircle, Trash2 } from 'lucide-react';
import { Switch } from '@/components/ui/switch';

type OpeningHours = Database['public']['Tables']['opening_hours']['Row'];

// Define a structured type for the 'weekdays' JSON blob
export type TimeSlot = { from: string; to: string };
export type DayHours = { enabled: boolean; slots: TimeSlot[] };
export type WeekdayHours = {
  monday: DayHours;
  tuesday: DayHours;
  wednesday: DayHours;
  thursday: DayHours;
  friday: DayHours;
  saturday: DayHours;
  sunday: DayHours;
};

interface OpeningHoursFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  openingHours?: OpeningHours | null;
}

const weekdays_german: { key: keyof WeekdayHours, label: string }[] = [
    { key: 'monday', label: 'Montag' },
    { key: 'tuesday', label: 'Dienstag' },
    { key: 'wednesday', label: 'Mittwoch' },
    { key: 'thursday', label: 'Donnerstag' },
    { key: 'friday', label: 'Freitag' },
    { key: 'saturday', label: 'Samstag' },
    { key: 'sunday', label: 'Sonntag' },
];

const getInitialFormData = (): { name: string; weekdays: WeekdayHours } => ({
    name: '',
    weekdays: {
        monday: { enabled: true, slots: [{ from: '08:00', to: '18:00' }] },
        tuesday: { enabled: true, slots: [{ from: '08:00', to: '18:00' }] },
        wednesday: { enabled: true, slots: [{ from: '08:00', to: '18:00' }] },
        thursday: { enabled: true, slots: [{ from: '08:00', to: '18:00' }] },
        friday: { enabled: true, slots: [{ from: '08:00', to: '18:00' }] },
        saturday: { enabled: false, slots: [] },
        sunday: { enabled: false, slots: [] },
    },
});

const OpeningHoursFormDialog = ({ isOpen, onClose, onSuccess, openingHours }: OpeningHoursFormDialogProps) => {
      const { toast } = useToast();
  const [formData, setFormData] = useState(getInitialFormData());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (openingHours) {
        setFormData({
          name: openingHours.name,
          // Ensure weekdays is a valid WeekdayHours object, otherwise use default
          weekdays: (openingHours.weekdays as WeekdayHours) ?? getInitialFormData().weekdays,
        });
      } else {
        setFormData(getInitialFormData());
      }
    }
  }, [isOpen, openingHours]);

  const handleDayToggle = (day: keyof WeekdayHours) => {
    setFormData(prev => {
        const newWeekdays = { ...prev.weekdays };
        newWeekdays[day].enabled = !newWeekdays[day].enabled;
        if (newWeekdays[day].enabled && newWeekdays[day].slots.length === 0) {
            newWeekdays[day].slots.push({ from: '08:00', to: '18:00' });
        }
        return { ...prev, weekdays: newWeekdays };
    });
  };

  const handleSlotChange = (day: keyof WeekdayHours, slotIndex: number, field: 'from' | 'to', value: string) => {
    setFormData(prev => {
        const newWeekdays = { ...prev.weekdays };
        newWeekdays[day].slots[slotIndex][field] = value;
        return { ...prev, weekdays: newWeekdays };
    });
  };

  const addSlot = (day: keyof WeekdayHours) => {
    setFormData(prev => {
        const newWeekdays = { ...prev.weekdays };
        newWeekdays[day].slots.push({ from: '08:00', to: '18:00' });
        return { ...prev, weekdays: newWeekdays };
    });
  };

  const removeSlot = (day: keyof WeekdayHours, slotIndex: number) => {
    setFormData(prev => {
        const newWeekdays = { ...prev.weekdays };
        newWeekdays[day].slots.splice(slotIndex, 1);
        return { ...prev, weekdays: newWeekdays };
    });
  };

          const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) {
        toast({ title: 'Fehler', description: 'Bitte geben Sie der Vorlage einen Namen.', variant: 'destructive' });
        return;
    }
    setLoading(true);

    const dataToSubmit = {
        name: formData.name,
        weekdays: formData.weekdays as any,
    };

    try {
        if (openingHours?.id) {
            const { error } = await supabase.from('opening_hours').update(dataToSubmit).eq('id', openingHours.id);
            if (error) throw error;
            toast({ title: 'Erfolg', description: 'Vorlage erfolgreich aktualisiert.' });
        } else {
            const { error } = await supabase.from('opening_hours').insert(dataToSubmit);
            if (error) throw error;
            toast({ title: 'Erfolg', description: 'Neue Vorlage erfolgreich erstellt.' });
        }
        onSuccess();
        onClose();
    } catch (error: any) {
        console.error('Error saving opening hours:', error);
        toast({ title: 'Fehler beim Speichern', description: error.message, variant: 'destructive' });
    } finally {
        setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{openingHours ? 'Vorlage bearbeiten' : 'Neue Vorlage erstellen'}</DialogTitle>
          <DialogDescription>Definieren Sie hier die Zeitfenster für diese Vorlage.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="name" className="text-right">Name der Vorlage</Label>
                    <Input id="name" value={formData.name} onChange={(e) => setFormData(f => ({...f, name: e.target.value}))} className="col-span-3" />
                </div>

                {weekdays_german.map(({ key, label }) => (
                    <div key={key} className="grid grid-cols-4 items-start gap-4 border-t pt-4">
                        <Label className="text-right pt-2 flex items-center gap-2 justify-end">
                            <Switch checked={formData.weekdays[key].enabled} onCheckedChange={() => handleDayToggle(key)} />
                            {label}
                        </Label>
                        <div className="col-span-3 space-y-2">
                            {formData.weekdays[key].enabled ? (
                                formData.weekdays[key].slots.map((slot, index) => (
                                    <div key={index} className="flex items-center gap-2">
                                        <Input type="time" value={slot.from} onChange={(e) => handleSlotChange(key, index, 'from', e.target.value)} />
                                        <span>-</span>
                                        <Input type="time" value={slot.to} onChange={(e) => handleSlotChange(key, index, 'to', e.target.value)} />
                                        <Button type="button" variant="ghost" size="icon" onClick={() => removeSlot(key, index)} disabled={formData.weekdays[key].slots.length <= 1}>
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ))
                            ) : (
                                <p className="text-sm text-gray-500 pt-2">Geschlossen</p>
                            )}
                            {formData.weekdays[key].enabled && (
                                <Button type="button" variant="outline" size="sm" onClick={() => addSlot(key)}>
                                    <PlusCircle className="mr-2 h-4 w-4" /> Zeitfenster hinzufügen
                                </Button>
                            )}
                        </div>
                    </div>
                ))}
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

export default OpeningHoursFormDialog;
