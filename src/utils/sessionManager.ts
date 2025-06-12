import { supabase } from '@/integrations/supabase/client';

/**
 * Utility for managing task sessions
 * Ensures sessions are properly closed when users navigate away
 */
class SessionManager {
  private static instance: SessionManager;
  private currentSessionId: string | null = null;

  private constructor() {
    // Private constructor for singleton pattern
    this.closeOrphanedSessions();
  }

  public static getInstance(): SessionManager {
    if (!SessionManager.instance) {
      SessionManager.instance = new SessionManager();
    }
    return SessionManager.instance;
  }

  /**
   * Start a new session for a task
   */
  public async startSession(taskId: string, userId: string): Promise<string | null> {
    // End any existing session first
    await this.endCurrentSession();

    try {
      console.log('Starting new session for task:', taskId);
      const { data, error } = await supabase
        .from('task_sessions')
        .insert({
          task_id: taskId,
          user_id: userId,
          start_time: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating task session:', error);
        return null;
      }

      this.currentSessionId = data.id;
      // Store in localStorage as backup
      localStorage.setItem('current_task_session', data.id);
      localStorage.setItem('current_task_id', taskId);

      return data.id;
    } catch (error) {
      console.error('Failed to start session:', error);
      return null;
    }
  }

  /**
   * End the current session
   * 
   * @param useSync - Whether to use a synchronous XMLHttpRequest (default: false)
   * This should be true when called during page unload or navigation
   */
  public async endCurrentSession(useSync: boolean = false): Promise<boolean> {
    const sessionId = this.currentSessionId || localStorage.getItem('current_task_session');
    if (!sessionId) return false;

    try {
      console.log('Ending session:', sessionId);
      
      // Get the session details first (always async)
      const { data: session, error: fetchError } = await supabase
        .from('task_sessions')
        .select('start_time, task_id')
        .eq('id', sessionId)
        .single();

      if (fetchError) {
        console.error('Error fetching session details:', fetchError);
        return false;
      }

      if (!session || !session.start_time) {
        console.error('Invalid session data - missing start time');
        return false;
      }

      // Calculate duration
      const startTime = new Date(session.start_time).getTime();
      const now = new Date();
      const endTime = now.getTime();
      const durationSeconds = Math.round((endTime - startTime) / 1000);
      
      console.log(`Session duration: ${durationSeconds}s for task ${session.task_id}`);

      // If synchronous update is requested (for page unloads), use XMLHttpRequest
      if (useSync) {
        return this.syncUpdateSession(sessionId, now.toISOString(), durationSeconds);
      } else {
        // Otherwise use standard async update
        const { error: updateError } = await supabase
          .from('task_sessions')
          .update({
            end_time: now.toISOString(),
            duration_seconds: durationSeconds > 0 ? durationSeconds : 0
          })
          .eq('id', sessionId);

        if (updateError) {
          console.error('Error ending session:', updateError);
          return false;
        }

        // Clear session data
        this.currentSessionId = null;
        localStorage.removeItem('current_task_session');
        localStorage.removeItem('current_task_id');
        return true;
      }
    } catch (error) {
      console.error('Failed to end session:', error);
      return false;
    }
  }
  
  /**
   * Update a session using a synchronous XMLHttpRequest
   * This ensures the update completes before page unload
   */
  private syncUpdateSession(sessionId: string, endTime: string, durationSeconds: number): boolean {
    try {
      // Create a synchronous XMLHttpRequest to ensure it completes before page unload
      const xhr = new XMLHttpRequest();
      const apiUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/task_sessions?id=eq.${sessionId}`;
      
      // Open request in synchronous mode (blocks until complete)
      xhr.open('PATCH', apiUrl, false);
      
      // Set headers
      xhr.setRequestHeader('apikey', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '');
      xhr.setRequestHeader('Authorization', `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`);
      xhr.setRequestHeader('Content-Type', 'application/json');
      xhr.setRequestHeader('Prefer', 'return=minimal');
      
      // Send the request with update data
      xhr.send(JSON.stringify({
        end_time: endTime,
        duration_seconds: durationSeconds > 0 ? durationSeconds : 0
      }));
      
      // Log the response
      console.log('Synchronous session update complete with status:', xhr.status);
      
      // Clear session data
      this.currentSessionId = null;
      localStorage.removeItem('current_task_session');
      localStorage.removeItem('current_task_id');
      
      return xhr.status >= 200 && xhr.status < 300;
    } catch (error) {
      console.error('Error in synchronous session update:', error);
      return false;
    }
  }

  /**
   * Close any orphaned sessions from previous page loads
   */
  private async closeOrphanedSessions(): Promise<void> {
    const sessionId = localStorage.getItem('current_task_session');
    if (sessionId) {
      try {
        console.log('Closing orphaned session:', sessionId);
        
        // Get the session details
        const { data: session, error: fetchError } = await supabase
          .from('task_sessions')
          .select('start_time')
          .eq('id', sessionId)
          .single();

        if (fetchError) {
          console.error('Error fetching orphaned session:', fetchError);
          localStorage.removeItem('current_task_session');
          localStorage.removeItem('current_task_id');
          return;
        }

        if (!session || !session.start_time) {
          console.error('Invalid session data for orphaned session');
          localStorage.removeItem('current_task_session');
          localStorage.removeItem('current_task_id');
          return;
        }

        // Calculate duration
        const startTime = new Date(session.start_time).getTime();
        const now = new Date();
        const endTime = now.getTime();
        const durationSeconds = Math.round((endTime - startTime) / 1000);

        // Update the session
        await supabase
          .from('task_sessions')
          .update({
            end_time: now.toISOString(),
            duration_seconds: durationSeconds > 0 ? durationSeconds : 0
          })
          .eq('id', sessionId);

        console.log('Orphaned session closed successfully');
      } catch (error) {
        console.error('Error closing orphaned session:', error);
      } finally {
        localStorage.removeItem('current_task_session');
        localStorage.removeItem('current_task_id');
      }
    }
  }
}

export const sessionManager = SessionManager.getInstance();
