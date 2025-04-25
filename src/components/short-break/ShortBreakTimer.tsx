
import { useBreakTimer } from '@/hooks/useBreakTimer';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useEffect } from 'react';

export interface ShortBreakTimerProps {
  breakId: string;
  onComplete: () => void;
}

export const ShortBreakTimer = ({ breakId, onComplete }: ShortBreakTimerProps) => {
  const { timeLeft, isRunning, startTimer, stopTimer } = useBreakTimer(breakId);
  
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const progress = ((300 - timeLeft) / 300) * 100;

  useEffect(() => {
    if (timeLeft === 0) {
      onComplete();
    }
  }, [timeLeft, onComplete]);

  return (
    <div className="space-y-4">
      <div className="text-center">
        <div className="text-2xl font-bold mb-2">
          {minutes}:{seconds.toString().padStart(2, '0')}
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {!isRunning ? (
        <Button onClick={startTimer} className="w-full">
          Pause starten
        </Button>
      ) : (
        <Button onClick={stopTimer} variant="outline" className="w-full">
          Pause beenden
        </Button>
      )}
    </div>
  );
};
