
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
import { ShortBreakHistory } from './ShortBreakHistory';
import { useAuth } from '@/contexts/AuthContext';
import { useIsMobile } from '@/hooks/use-mobile';

export const ShortBreakButton = () => {
  const { user } = useAuth();
  const { activeBreaks, startBreak } = useShortBreaks();
  const [currentBreakId, setCurrentBreakId] = useState<string | null>(null);
  const isMobile = useIsMobile();

  const canStartBreak = activeBreaks && 
    activeBreaks.activeSlots < activeBreaks.maxSlots && 
    activeBreaks.availableMinutes >= 5;

  const handleStartBreak = async () => {
    const result = await startBreak.mutateAsync();
    setCurrentBreakId(result.id);
  };

  // Only show Button for authenticated users
  if (!user) return null;

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button 
          variant="ghost" 
          className={`relative ${isMobile ? 'h-8 w-8' : 'h-9 w-9'} bg-gray-100 rounded-full flex items-center justify-center`}
        >
          <Timer className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'} text-gray-600 hover:text-gray-800`} />
        </Button>
      </SheetTrigger>
      <SheetContent className={isMobile ? 'w-full' : ''}>
        <SheetHeader>
          <SheetTitle>Short-Break</SheetTitle>
          <SheetDescription className="space-y-1">
            <div>
              Verfügbare Slots: {activeBreaks ? 
                `${activeBreaks.activeSlots} von ${activeBreaks.maxSlots}` : 
                'Lädt...'
              }
            </div>
            <div>
              Verbleibende Pausenzeit heute: {activeBreaks ? 
                `${activeBreaks.availableMinutes} Minuten` : 
                'Lädt...'
              }
            </div>
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

          <ShortBreakHistory />
        </div>
      </SheetContent>
    </Sheet>
  );
};
