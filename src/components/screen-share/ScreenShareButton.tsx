
import { Monitor } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';

export function ScreenShareButton() {
  const isMobile = useIsMobile();
  
  const handleScreenShare = () => {
    window.open('https://www.screenleap.com/', '_blank');
  };

  return (
    <Button 
      variant="ghost" 
      className={`relative ${isMobile ? 'h-8 w-8' : 'h-9 w-9'} bg-gray-100 rounded-full flex items-center justify-center`}
      onClick={handleScreenShare}
      aria-label="Screen Share"
    >
      <Monitor className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'} text-gray-600`} />
    </Button>
  );
}
