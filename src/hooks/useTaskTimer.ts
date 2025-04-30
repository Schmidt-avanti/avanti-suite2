
import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

export const useTaskTimer = () => {
  const [isTracking, setIsTracking] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [formattedTime, setFormattedTime] = useState('00:00:00');
  const { toast } = useToast();

  const startTimer = useCallback(async (taskId: string, userId: string) => {
    if (!taskId || !userId) return;
    
    try {
      console.log(`Starting timer for task ${taskId} and user ${userId}`);
      
      // Create task time record
      const { error } = await supabase
        .from('task_times')
        .insert({
          task_id: taskId,
          user_id: userId,
          started_at: new Date().toISOString()
        });
        
      if (error) throw error;
      
      setIsTracking(true);
    } catch (error: any) {
      console.error('Failed to start task timer:', error);
      toast({
        variant: "destructive",
        title: "Fehler",
        description: "Timer konnte nicht gestartet werden"
      });
    }
  }, [toast]);
  
  const endTimer = useCallback(async (taskId: string, userId?: string) => {
    if (!taskId || !userId) return;
    
    try {
      console.log(`Ending timer for task ${taskId} and user ${userId}`);
      
      const now = new Date();
      
      // Find the open task time record
      const { data: times, error: fetchError } = await supabase
        .from('task_times')
        .select('*')
        .eq('task_id', taskId)
        .eq('user_id', userId)
        .is('ended_at', null)
        .order('started_at', { ascending: false })
        .limit(1);
      
      if (fetchError) throw fetchError;
      
      if (times && times.length > 0) {
        const timeRecord = times[0];
        const startedAt = new Date(timeRecord.started_at);
        const durationSeconds = Math.floor((now.getTime() - startedAt.getTime()) / 1000);
        
        // Update the task time record
        const { error: updateError } = await supabase
          .from('task_times')
          .update({
            ended_at: now.toISOString(),
            duration_seconds: durationSeconds
          })
          .eq('id', timeRecord.id);
          
        if (updateError) throw updateError;
      }
      
      setIsTracking(false);
    } catch (error: any) {
      console.error('Failed to end task timer:', error);
      toast({
        variant: "destructive",
        title: "Fehler",
        description: "Timer konnte nicht gestoppt werden"
      });
    }
  }, [toast]);
  
  return {
    isTracking,
    elapsedTime,
    formattedTime,
    startTimer,
    endTimer
  };
};
