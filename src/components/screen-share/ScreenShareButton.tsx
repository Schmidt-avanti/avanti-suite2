
import React from 'react';
import { Monitor } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export const ScreenShareButton = () => {
  const handleScreenShare = () => {
    // Open Screenleap homepage in a new tab
    window.open('https://www.screenleap.com/', '_blank');
    
    toast.info('Bildschirmfreigabe wird gestartet', {
      description: 'Ein neuer Tab wurde geöffnet. Folgen Sie den Anweisungen dort.',
    });
  };

  return (
    <div className="relative group">
      <Button
        variant="ghost"
        size="icon"
        className="relative h-9 w-9 rounded-full bg-gray-100 hover:bg-gray-200"
        onClick={handleScreenShare}
      >
        <Monitor className="h-5 w-5 text-gray-600" />
      </Button>
      <div className="absolute hidden group-hover:block right-0 top-full mt-2 p-2 bg-white rounded-lg shadow-lg border border-gray-200 w-64 text-xs text-gray-600">
        Hinweis: Die kostenlose Bildschirmfreigabe ist auf 40 Minuten pro Tag limitiert (Screenleap).
      </div>
    </div>
  );
};
