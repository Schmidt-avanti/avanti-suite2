
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
        
        // Verwende eine SQL-Abfrage, um die Daten korrekt zu aggregieren
        const { data: summary, error: summaryError } = await supabase
          .rpc('get_task_time_summaries', { task_ids: taskIds });
        
        // Prüfe auf Fehler
        if (summaryError) {
          console.error('Error fetching task time summaries:', summaryError);
          throw summaryError;
        }
        
        // Falls keine RPC-Funktion verfügbar ist, verwenden wir direkten SQL-Zugriff
        if (!summary || summary.length === 0) {
          console.log('No data from RPC function, trying direct query...');
          
          // Direkte Abfrage der task_times Tabelle
          const { data: timeEntries, error: timeError } = await supabase
            .from('task_times')
            .select('id, task_id, user_id, duration_seconds, started_at, ended_at')
            .in('task_id', taskIds);
            
          if (timeError) {
            console.error('Error fetching task times directly:', timeError);
            throw timeError;
          }
          
          console.log(`Raw time entries returned: ${timeEntries?.length || 0}`);
          
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
        }
        
        // RPC-Funktion hat Daten zurückgegeben
        console.log('Task time summaries from RPC:', summary);
        
        // Konvertiere das RPC-Ergebnis in das erwartete Format
        const formattedSummaries: TaskTimeSummary[] = summary.map(item => ({
          task_id: item.task_id,
          user_id: item.user_id,
          session_count: item.session_count,
          total_seconds: item.total_seconds,
          total_hours: item.total_hours
        }));
        
        return formattedSummaries;
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
