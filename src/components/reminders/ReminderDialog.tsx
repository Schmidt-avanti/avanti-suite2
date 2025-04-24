
import React, { useState } from 'react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogTrigger 
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useReminders } from '@/hooks/useReminders';
import { useToast } from '@/hooks/use-toast';

export const ReminderDialog = () => {
  const [title, setTitle] = useState('');
  const [reminderDate, setReminderDate] = useState<Date | undefined>(undefined);
  const [isOpen, setIsOpen] = useState(false);
  const { createReminder } = useReminders();
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!title.trim()) return;

    await createReminder(
      title, 
      reminderDate ? reminderDate.toISOString() : null
    );

    toast({
      title: "Notiz erstellt",
      description: "Deine Notiz wurde erfolgreich erstellt.",
    });

    setTitle('');
    setReminderDate(undefined);
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="text-sm">+ Neue Notiz</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Neue Notiz erstellen</DialogTitle>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <Input 
            placeholder="Titel der Notiz" 
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !reminderDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {reminderDate ? (
                  format(reminderDate, "PPP")
                ) : (
                  <span>Erinnerungsdatum wählen (optional)</span>
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
