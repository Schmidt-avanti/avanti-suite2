
import React, { useState } from 'react';
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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";

export interface FollowUpDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onScheduled: (date: Date, note: string) => void;
}

export function FollowUpDialog({ open, onOpenChange, onScheduled }: FollowUpDialogProps) {
  const [date, setDate] = useState<Date | undefined>(new Date(Date.now() + 24 * 60 * 60 * 1000)); // Tomorrow by default
  const [note, setNote] = useState("");
  const [calendarOpen, setCalendarOpen] = useState(false);

  const handleSchedule = () => {
    if (!date) return;
    onScheduled(date, note);
    setNote("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Wiedervorlage planen</DialogTitle>
          <DialogDescription>
            Wählen Sie ein Datum für die Wiedervorlage dieser Aufgabe aus.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="followup-date">Datum</Label>
            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger asChild>
                <Button
                  id="followup-date"
                  variant="outline"
                  className={cn(
                    "justify-start text-left font-normal",
                    !date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, "PPP", { locale: de }) : <span>Datum wählen</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={(date) => {
                    setDate(date);
                    setCalendarOpen(false);
                  }}
                  initialFocus
                  disabled={(day) => day < new Date()}
                />
              </PopoverContent>
            </Popover>
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="followup-note">Notiz</Label>
            <Textarea
              id="followup-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Optionale Notiz zur Wiedervorlage..."
              className="min-h-[100px]"
            />
          </div>
        </div>
        
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Abbrechen
          </Button>
          <Button
            onClick={handleSchedule}
            disabled={!date}
          >
            Wiedervorlage planen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
