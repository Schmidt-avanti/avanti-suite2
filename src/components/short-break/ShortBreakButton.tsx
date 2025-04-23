
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Timer } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useShortBreaks } from '@/hooks/useShortBreaks';
import { ShortBreakTimer } from './ShortBreakTimer';

export const ShortBreakButton = () => {
  const { activeBreaks, startBreak } = useShortBreaks();
  const [currentBreakId, setCurrentBreakId] = useState<string | null>(null);

  const canStartBreak = activeBreaks && 
    activeBreaks.activeSlots < activeBreaks.maxSlots && 
    activeBreaks.availableMinutes >= 5;

  const handleStartBreak = async () => {
    const result = await startBreak.mutateAsync();
    setCurrentBreakId(result.id);
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon">
          <Timer className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Short-Break</SheetTitle>
          <SheetDescription>
            Verfügbare Slots: {activeBreaks ? 
              `${activeBreaks.activeSlots} von ${activeBreaks.maxSlots}` : 
              'Lädt...'
            }
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          {currentBreakId ? (
            <ShortBreakTimer 
              breakId={currentBreakId} 
              onComplete={() => setCurrentBreakId(null)} 
            />
          ) : (
            <>
              <div className="text-sm text-muted-foreground mb-4">
                Verfügbare Pausenzeit heute: {activeBreaks?.availableMinutes} Minuten
              </div>
              
              <Button 
                onClick={handleStartBreak} 
                disabled={!canStartBreak || startBreak.isPending}
                className="w-full"
              >
                {!canStartBreak ? 
                  "Keine Pause möglich" : 
                  "5-Minuten Pause starten"
                }
              </Button>
              
              {!canStartBreak && (
                <p className="text-sm text-muted-foreground mt-2">
                  {activeBreaks?.availableMinutes === 0 
                    ? "Tägliches Pausenlimit erreicht" 
                    : "Aktuell sind alle Pausenslots belegt"}
                </p>
              )}
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};
