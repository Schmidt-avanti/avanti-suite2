
import React, { useState } from 'react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogTrigger,
  DialogDescription
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from '@/components/ui/popover';
import { CalendarIcon, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useReminders } from '@/hooks/useReminders';
import { useToast } from '@/hooks/use-toast';

export const ReminderDialog = () => {
  const [title, setTitle] = useState('');
  const [reminderDate, setReminderDate] = useState<Date | undefined>(undefined);
  const [reminderTime, setReminderTime] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const { createReminder } = useReminders();
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!title.trim()) return;

    let finalDate: string | null = null;
    if (reminderDate) {
      const date = new Date(reminderDate);
      if (reminderTime) {
        const [hours, minutes] = reminderTime.split(':');
        date.setHours(parseInt(hours, 10), parseInt(minutes, 10));
      }
      finalDate = date.toISOString();
    }

    const result = await createReminder(title, finalDate);

    if (result) {
      toast({
        title: "Notiz erstellt",
        description: "Deine Notiz wurde erfolgreich erstellt.",
      });

      setTitle('');
      setReminderDate(undefined);
      setReminderTime('');
      setIsOpen(false);
    } else {
      toast({
        title: "Fehler",
        description: "Beim Erstellen der Notiz ist ein Fehler aufgetreten.",
        variant: "destructive"
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="text-sm">+ Neue Notiz</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Neue Notiz erstellen</DialogTitle>
          <DialogDescription>
            Erstelle eine neue Notiz mit optionalem Erinnerungsdatum und -uhrzeit.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <Input 
            placeholder="Titel der Notiz" 
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          
          <div className="flex gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "justify-start text-left font-normal flex-1",
                    !reminderDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {reminderDate ? (
                    format(reminderDate, "dd.MM.yyyy")
                  ) : (
                    <span>Datum wählen</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={reminderDate}
                  onSelect={setReminderDate}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>

            <Input
              type="time"
              value={reminderTime}
              onChange={(e) => setReminderTime(e.target.value)}
              className="w-[140px]"
              placeholder="HH:MM"
              disabled={!reminderDate}
            />
          </div>
        </div>
        
        <DialogFooter>
          <Button 
            type="button" 
            onClick={handleSubmit} 
            disabled={!title.trim()}
          >
            Notiz speichern
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
