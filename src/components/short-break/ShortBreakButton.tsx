
import { Timer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { ShortBreakTimer } from './ShortBreakTimer';
import { useState } from 'react';
import { useShortBreaks } from '@/hooks/useShortBreaks';
import { useToast } from '@/hooks/use-toast';

export function ShortBreakButton() {
  const isMobile = useIsMobile();
  const [breakId, setBreakId] = useState<string | null>(null);
  const { startBreak } = useShortBreaks();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);

  const handleOpenChange = async (isOpen: boolean) => {
    if (isOpen && !breakId) {
      try {
        const result = await startBreak.mutateAsync();
        if (result?.id) {
          setBreakId(result.id);
        }
      } catch (error) {
        console.error("Failed to start break:", error);
      }
    }
    setOpen(isOpen);
  };

  const handleComplete = () => {
    setOpen(false);
    setBreakId(null);
    toast({
      title: "Break completed",
      description: "Your short break has been completed.",
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button 
          variant="ghost" 
          className={`relative ${isMobile ? 'h-8 w-8' : 'h-9 w-9'} bg-gray-100 rounded-full flex items-center justify-center`}
          aria-label="Short Break"
        >
          <Timer className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'} text-gray-600`} />
        </Button>
      </DialogTrigger>
      <DialogContent className={`${isMobile ? 'w-[90%] max-w-md p-4' : 'w-[450px] p-6'}`}>
        {breakId && <ShortBreakTimer breakId={breakId} onComplete={handleComplete} />}
      </DialogContent>
    </Dialog>
  );
}
