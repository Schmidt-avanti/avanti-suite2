
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { TaskTimeSummary } from '@/types';
import { toast } from 'sonner';

export const useTaskTimeSummaries = (taskIds: string[]) => {
  // Debug-Logging für den Input
  console.log('useTaskTimeSummaries called with taskIds:', taskIds);
  
  const { data: taskTimeSummaries, isLoading, error } = useQuery({
    queryKey: ['taskTimeSummaries', taskIds],
    queryFn: async () => {
      try {
        // Sofort leeres Array zurückgeben, wenn keine Task-IDs vorhanden sind
        if (!taskIds || !Array.isArray(taskIds) || taskIds.length === 0) {
          console.log('No task IDs provided, returning empty array');
          return [];
        }
        
        console.log(`Fetching time summaries for ${taskIds.length} task IDs`);
        
        // Verwende eine direkte Abfrage statt RPC (da RPC-Funktion möglicherweise nicht definiert ist)
        // Dies löst das erste TypeScript-Problem (TS2345)
        const { data: timeEntries, error: timeError } = await supabase
          .from('task_times')
          .select('id, task_id, user_id, duration_seconds, started_at, ended_at')
          .in('task_id', taskIds);
            
        if (timeError) {
          console.error('Error fetching task times directly:', timeError);
          throw timeError;
        }
        
        console.log(`Raw time entries returned: ${timeEntries ? timeEntries.length : 0}`);
        
        if (!timeEntries || timeEntries.length === 0) {
          console.log('No time entries found for the selected tasks');
          return [];
        }
        
        // Verarbeite die Zeiteinträge und berechne die Zusammenfassungen
        const taskSummaries: Record<string, TaskTimeSummary> = {};
        const now = new Date();
        
        timeEntries.forEach(entry => {
          if (!entry.task_id) return;
          
          if (!taskSummaries[entry.task_id]) {
            taskSummaries[entry.task_id] = {
              task_id: entry.task_id,
              user_id: entry.user_id,
              session_count: 0,
              total_seconds: 0,
              total_hours: 0
            };
          }
          
          const summary = taskSummaries[entry.task_id];
          summary.session_count++;
          
          // Verwende duration_seconds, wenn verfügbar
          let duration = entry.duration_seconds;
          
          // Berechne die Dauer, wenn keine direkt gespeicherte Dauer verfügbar ist
          if ((!duration || duration <= 0) && entry.started_at) {
            const startTime = new Date(entry.started_at).getTime();
            let endTime;
            
            if (entry.ended_at) {
              endTime = new Date(entry.ended_at).getTime();
            } else {
              // Wenn keine Endzeit vorhanden ist, nutzen wir die aktuelle Zeit für laufende Sitzungen
              // aber nur wenn die Startzeit nicht älter als 24 Stunden ist
              const oneDay = 24 * 60 * 60 * 1000; // 24 Stunden in Millisekunden
              if (now.getTime() - startTime <= oneDay) {
                endTime = now.getTime();
              } else {
                // Setze ein festes Ende für verwaiste Sitzungen (30 Minuten nach Start)
                endTime = startTime + (30 * 60 * 1000);
              }
            }
            
            duration = Math.round((endTime - startTime) / 1000);
            console.log(`Calculated duration for entry ${entry.id}: ${duration}s`);
          }
          
          // Addiere die Dauer nur, wenn sie positiv ist
          if (duration && duration > 0) {
            summary.total_seconds += duration;
            summary.total_hours = Number((summary.total_seconds / 3600).toFixed(2));
          }
        });
        
        const result = Object.values(taskSummaries);
        console.log('Calculated summaries:', result);
        
        return result;
      } catch (error) {
        console.error('Fatal error in useTaskTimeSummaries:', error);
        toast.error('Fehler beim Laden der Bearbeitungszeiten');
        throw error;
      }
    },
    enabled: taskIds && Array.isArray(taskIds) && taskIds.length > 0,
    staleTime: 1000 * 60 * 5, // 5 Minuten Cache
  });
  
  // Debug-Logging für das Ergebnis
  console.log('useTaskTimeSummaries result:', {
    taskTimeSummaries: taskTimeSummaries || [],
    isLoading,
    hasError: !!error
  });
  
  return {
    taskTimeSummaries: taskTimeSummaries || [],
    isLoading,
    error
  };
};
