
// src/components/call-center/VoiceStatusButton.tsx
import React from 'react';
import { Button } from '@/components/ui/button';
import { 
  PhoneIcon, 
  PhoneOffIcon,
  Loader2,
  AlertCircleIcon
} from 'lucide-react';
import { useTwilio } from '@/contexts/TwilioContext';
import { useToast } from '@/components/ui/use-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';

const VoiceStatusButton = () => {
  const { isAvailable, isSetup, toggleAvailability, setupTwilio, callState } = useTwilio();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = React.useState(false);
  const [setupError, setSetupError] = React.useState<string | null>(null);
  
  const handleToggle = async () => {
    setIsLoading(true);
    setSetupError(null);
    
    try {
      if (!isSetup) {
        const success = await setupTwilio();
        if (!success) {
          setSetupError('Konnte das Telefonsystem nicht initialisieren. Bitte stellen Sie sicher, dass alle Konfigurationen richtig eingestellt sind.');
          setIsLoading(false);
          return;
        }
      }
      
      await toggleAvailability();
    } catch (error) {
      console.error('Error toggling availability:', error);
      setSetupError(error instanceof Error ? error.message : 'Unbekannter Fehler bei der Statusaktualisierung');
      toast({
        title: 'Status Update Failed',
        description: error instanceof Error ? error.message : 'Unbekannter Fehler',
        variant: 'destructive'
      });
    }
    
    setIsLoading(false);
  };

  // Show different button states based on call status
  const renderButton = () => {
    // During active call
    if (callState.status === 'in-progress') {
      return (
        <Button disabled className="bg-red-600 hover:bg-red-700">
          <PhoneIcon className="h-4 w-4 mr-2" />
          In Gespräch
        </Button>
      );
    }
    
    // During connecting or ringing
    if (callState.status === 'connecting' || callState.status === 'ringing') {
      return (
        <Button disabled className="bg-yellow-600 hover:bg-yellow-700">
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
          Verbinde...
        </Button>
      );
    }
    
    // Normal toggle button
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
        {isAvailable ? 'Verfügbar für Anrufe' : 'Nicht verfügbar'}
      </Button>
    );
  };
  
  return (
    <div className="space-y-2">
      {renderButton()}
      
      {setupError && (
        <Alert variant="destructive" className="mt-2">
          <AlertCircleIcon className="h-4 w-4" />
          <AlertDescription>{setupError}</AlertDescription>
        </Alert>
      )}
    </div>
  );
};

export default VoiceStatusButton;
