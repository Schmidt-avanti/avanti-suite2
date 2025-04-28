
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { Calendar as CalendarIcon, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface FollowUpDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (date: Date) => void;
}

export function FollowUpDialog({ open, onOpenChange, onSave }: FollowUpDialogProps) {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [hour, setHour] = useState<string>("9");
  const [minute, setMinute] = useState<string>("00");

  const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, "0"));
  const minutes = Array.from({ length: 12 }, (_, i) => (i * 5).toString().padStart(2, "0"));

  const handleSave = () => {
    if (!date) return;
    
    const followUpDate = new Date(date);
    followUpDate.setHours(parseInt(hour), parseInt(minute), 0, 0);
    
    onSave(followUpDate);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Wiedervorlage erstellen</DialogTitle>
          <DialogDescription>
            Wählen Sie Datum und Uhrzeit für die Wiedervorlage.
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4 space-y-6">
          <div className="space-y-2">
            <Label>Datum</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, 'PPP', { locale: de }) : <span>Datum wählen</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  initialFocus
                  locale={de}
                />
              </PopoverContent>
            </Popover>
          </div>
          
          <div className="flex items-end gap-4">
            <div className="space-y-2">
              <Label>Stunde</Label>
              <Select 
                value={hour}
                onValueChange={setHour}
              >
                <SelectTrigger className="w-[100px]">
                  <SelectValue placeholder="Stunde" />
                </SelectTrigger>
                <SelectContent>
                  {hours.map((h) => (
                    <SelectItem key={h} value={h}>
                      {h}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Minute</Label>
              <Select 
                value={minute}
                onValueChange={setMinute}
              >
                <SelectTrigger className="w-[100px]">
                  <SelectValue placeholder="Minute" />
                </SelectTrigger>
                <SelectContent>
                  {minutes.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <Button
              variant="outline"
              size="icon"
              className="mb-0.5"
              onClick={() => {
                // Set to current time
                const now = new Date();
                setHour(now.getHours().toString().padStart(2, "0"));
                setMinute((Math.floor(now.getMinutes() / 5) * 5).toString().padStart(2, "0"));
              }}
            >
              <Clock className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Abbrechen
          </Button>
          <Button onClick={handleSave}>Speichern</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
