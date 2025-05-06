
// src/components/call-center/VoiceStatusButton.tsx
import React from 'react';
import { Button } from '@/components/ui/button';
import { 
  PhoneIcon, 
  PhoneOffIcon,
  Loader2 
} from 'lucide-react';
import { useTwilio } from '@/contexts/TwilioContext';
import { useToast } from '@/components/ui/use-toast';

const VoiceStatusButton = () => {
  const { isAvailable, isSetup, toggleAvailability, setupTwilio } = useTwilio();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = React.useState(false);
  
  const handleToggle = async () => {
    setIsLoading(true);
    
    try {
      if (!isSetup) {
        const success = await setupTwilio();
        if (!success) {
          toast({
            title: 'Setup Failed',
            description: 'Could not set up the phone system',
            variant: 'destructive'
          });
          setIsLoading(false);
          return;
        }
      }
      
      await toggleAvailability();
    } catch (error) {
      console.error('Error toggling availability:', error);
      toast({
        title: 'Status Update Failed',
        description: error.message,
        variant: 'destructive'
      });
    }
    
    setIsLoading(false);
  };
  
  return (
    <Button
      onClick={handleToggle}
      variant={isAvailable ? 'default' : 'outline'}
      className={isAvailable ? 'bg-green-600 hover:bg-green-700' : ''}
      disabled={isLoading}
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin mr-2" />
      ) : isAvailable ? (
        <PhoneIcon className="h-4 w-4 mr-2" />
      ) : (
        <PhoneOffIcon className="h-4 w-4 mr-2" />
      )}
      {isAvailable ? 'Available for Calls' : 'Offline'}
    </Button>
  );
};

export default VoiceStatusButton;
