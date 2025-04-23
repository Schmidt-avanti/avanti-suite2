
import { useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export const useBreakTimer = (breakId: string | null) => {
  const [timeLeft, setTimeLeft] = useState<number>(300); // 5 minutes in seconds
  const [isRunning, setIsRunning] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    let interval: number;

    if (isRunning && timeLeft > 0) {
      interval = window.setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            endBreak();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning, timeLeft]);

  const endBreak = async () => {
    if (!breakId) return;

    setIsRunning(false);
    const duration = 300 - timeLeft;

    const { error } = await supabase
      .from('short_breaks')
      .update({
        status: 'completed',
        end_time: new Date().toISOString(),
        duration
      })
      .eq('id', breakId);

    if (error) {
      toast({
        title: "Fehler",
        description: "Pause konnte nicht beendet werden",
        variant: "destructive"
      });
      return;
    }

    toast({
      title: "Pause beendet",
      description: `Pause nach ${Math.floor(duration / 60)} Minuten beendet.`
    });
  };

  const startTimer = () => setIsRunning(true);
  const stopTimer = () => endBreak();

  return {
    timeLeft,
    isRunning,
    startTimer,
    stopTimer
  };
};
