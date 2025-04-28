
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
        
        // First, let's check for and fix any orphaned sessions
        await cleanupOrphanedSessions(taskIds);
        
        // Then proceed with regular query
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
              // For open sessions, use the current time but cap at 30 minutes
              const thirtyMinutesMs = 30 * 60 * 1000;
              const timeSinceStart = now.getTime() - startTime;
              endTime = startTime + Math.min(timeSinceStart, thirtyMinutesMs);
              
              // Log this to help debug open sessions
              console.log(`Open session for task ${entry.task_id}, started at ${entry.started_at}, capped duration: ${Math.floor(Math.min(timeSinceStart, thirtyMinutesMs) / 1000)}s`);
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

// Helper function to clean up orphaned sessions
async function cleanupOrphanedSessions(taskIds: string[]) {
  try {
    console.log(`Checking for orphaned sessions for ${taskIds.length} tasks`);
    
    // Find all open task times for these tasks
    const { data: openSessions, error } = await supabase
      .from('task_times')
      .select('id, task_id, started_at')
      .in('task_id', taskIds)
      .is('ended_at', null);
      
    if (error) {
      console.error('Error fetching open sessions:', error);
      return;
    }
    
    if (!openSessions || openSessions.length === 0) {
      console.log('No orphaned sessions found');
      return;
    }
    
    console.log(`Found ${openSessions.length} potentially orphaned sessions`);
    
    const oneHourAgo = new Date();
    oneHourAgo.setHours(oneHourAgo.getHours() - 1);
    
    // Process each open session
    for (const session of openSessions) {
      const startedAt = new Date(session.started_at);
      
      // Only close sessions older than 1 hour
      if (startedAt < oneHourAgo) {
        // Calculate duration - cap at 30 minutes for orphaned sessions
        const endTime = new Date(startedAt);
        endTime.setMinutes(startedAt.getMinutes() + 30); // Max 30 minutes
        
        const durationSeconds = Math.floor((endTime.getTime() - startedAt.getTime()) / 1000);
        
        console.log(`Auto-closing orphaned session ${session.id} for task ${session.task_id} with duration: ${durationSeconds}s`);
        
        await supabase
          .from('task_times')
          .update({
            ended_at: endTime.toISOString(),
            duration_seconds: durationSeconds
          })
          .eq('id', session.id);
      } else {
        console.log(`Session ${session.id} for task ${session.task_id} is recent, not closing it`);
      }
    }
  } catch (err) {
    console.error('Error cleaning up orphaned sessions:', err);
  }
}
