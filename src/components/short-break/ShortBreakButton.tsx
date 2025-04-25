
import { Timer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { ShortBreakTimer } from './ShortBreakTimer';

export function ShortBreakButton() {
  const isMobile = useIsMobile();

  return (
    <Dialog>
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
        <ShortBreakTimer />
      </DialogContent>
    </Dialog>
  );
}
