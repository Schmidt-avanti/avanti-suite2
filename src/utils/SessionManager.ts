import { supabase } from '@/integrations/supabase/client';

/**
 * SessionManager utility class
 * 
 * Handles task session lifecycle management with focus on reliable session tracking
 * even during page unloads or visibility changes.
 */
export class SessionManager {
  private taskId: string | null = null;
  private userId: string | null = null;
  private sessionId: string | null = null;
  private startTime: Date | null = null;
  private visibilityHandler: any = null;
  private beforeUnloadHandler: any = null;

  /**
   * Start a new session for the given task and user
   */
  async startSession(taskId: string, userId: string): Promise<boolean> {
    if (this.sessionId) {
      // Already tracking a session - end it first
      await this.endSession();
    }

    try {
      const now = new Date();

      // Create new session record
      const { data, error } = await supabase
        .from('task_sessions')
        .insert({
          task_id: taskId,
          user_id: userId,
          start_time: now.toISOString(),
        })
        .select('id')
        .single();

      if (error) {
        console.error('Failed to start session:', error);
        return false;
      }

      // Store session details
      this.taskId = taskId;
      this.userId = userId;
      this.sessionId = data.id;
      this.startTime = now;
      
      // Set up event listeners
      this.setupEventListeners();
      
      return true;
    } catch (err) {
      console.error('Error in startSession:', err);
      return false;
    }
  }

  /**
   * End the current session and calculate duration
   */
  async endSession(): Promise<boolean> {
    if (!this.sessionId || !this.startTime) {
      return false;
    }

    try {
      const now = new Date();
      const durationSeconds = Math.floor((now.getTime() - this.startTime.getTime()) / 1000);
      
      // Only record sessions that are at least 1 second long
      if (durationSeconds >= 1) {
        // Update session with end time and duration
        const { error } = await supabase
          .from('task_sessions')
          .update({
            end_time: now.toISOString(),
            duration_seconds: durationSeconds
          })
          .eq('id', this.sessionId);

        if (error) {
          console.error('Failed to end session:', error);
          return false;
        }

        // Update task's total_duration_seconds
        await this.updateTaskTotalDuration(this.taskId as string);
      } else {
        // Delete short sessions
        await supabase
          .from('task_sessions')
          .delete()
          .eq('id', this.sessionId);
      }

      // Remove event listeners
      this.removeEventListeners();

      // Reset state
      this.taskId = null;
      this.userId = null;
      this.sessionId = null;
      this.startTime = null;

      return true;
    } catch (err) {
      console.error('Error in endSession:', err);
      return false;
    }
  }

  /**
   * Calculate and update the total duration for a task
   */
  async updateTaskTotalDuration(taskId: string): Promise<number> {
    try {
      // Get the sum of all session durations for this task
      const { data, error } = await supabase
        .rpc('calculate_task_total_duration', { task_id: taskId });

      if (error) {
        console.error('Failed to calculate task total duration:', error);
        return 0;
      }

      const totalDuration = data || 0;

      // Update the task's total_duration_seconds field
      await supabase
        .from('tasks')
        .update({ total_duration_seconds: totalDuration })
        .eq('id', taskId);

      return totalDuration;
    } catch (err) {
      console.error('Error updating task total duration:', err);
      return 0;
    }
  }

  /**
   * Get the total duration for a task from all users
   */
  async getTaskTotalDuration(taskId: string): Promise<number> {
    try {
      // Check if task has stored total_duration_seconds
      const { data: task, error: taskError } = await supabase
        .from('tasks')
        .select('total_duration_seconds')
        .eq('id', taskId)
        .single();

      if (taskError) {
        console.error('Failed to get task total duration:', taskError);
        return 0;
      }

      // If the task has a stored duration, return it
      if (task && task.total_duration_seconds != null) {
        return task.total_duration_seconds;
      }

      // Otherwise calculate it
      return this.updateTaskTotalDuration(taskId);
    } catch (err) {
      console.error('Error getting task total duration:', err);
      return 0;
    }
  }

  /**
   * Check if a session is currently active
   */
  isSessionActive(): boolean {
    return this.sessionId !== null;
  }

  /**
   * Get the current task ID being tracked
   */
  getCurrentTaskId(): string | null {
    return this.taskId;
  }

  /**
   * Set up event listeners for page visibility and unload
   */
  private setupEventListeners(): void {
    // Handle visibility change (switching tabs)
    this.visibilityHandler = this.handleVisibilityChange.bind(this);
    document.addEventListener('visibilitychange', this.visibilityHandler);

    // Handle page unload (closing tab/window)
    this.beforeUnloadHandler = this.handleBeforeUnload.bind(this);
    window.addEventListener('beforeunload', this.beforeUnloadHandler);
  }

  /**
   * Remove event listeners
   */
  private removeEventListeners(): void {
    if (this.visibilityHandler) {
      document.removeEventListener('visibilitychange', this.visibilityHandler);
      this.visibilityHandler = null;
    }

    if (this.beforeUnloadHandler) {
      window.removeEventListener('beforeunload', this.beforeUnloadHandler);
      this.beforeUnloadHandler = null;
    }
  }

  /**
   * Handle document visibility change events
   */
  private handleVisibilityChange(): void {
    if (document.visibilityState === 'hidden' && this.sessionId) {
      // Use synchronous XMLHttpRequest to ensure the request completes before tab is closed
      this.syncEndSession();
    } else if (document.visibilityState === 'visible' && !this.sessionId && this.taskId && this.userId) {
      // Resume session when tab becomes visible again
      this.startSession(this.taskId, this.userId);
    }
  }

  /**
   * Handle beforeunload event (browser closing or navigating away)
   */
  private handleBeforeUnload(event: BeforeUnloadEvent): void {
    if (this.sessionId) {
      // Use synchronous XMLHttpRequest to ensure the request completes before page unloads
      this.syncEndSession();
    }
  }

  /**
   * End session using synchronous XMLHttpRequest for reliability during unload events
   */
  private syncEndSession(): void {
    if (!this.sessionId || !this.startTime || !this.taskId) {
      return;
    }

    try {
      const now = new Date();
      const durationSeconds = Math.floor((now.getTime() - this.startTime.getTime()) / 1000);
      
      // Only record sessions that are at least 1 second long
      if (durationSeconds >= 1) {
        // Use synchronous XMLHttpRequest to ensure the request completes
        const xhr = new XMLHttpRequest();
        xhr.open('POST', `${window.location.origin}/api/end-session`, false); // false = synchronous
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.send(JSON.stringify({
          sessionId: this.sessionId,
          taskId: this.taskId,
          endTime: now.toISOString(),
          durationSeconds: durationSeconds
        }));
      }

      // Reset state since we've ended the session
      this.sessionId = null;
      this.startTime = null;
    } catch (err) {
      console.error('Error in syncEndSession:', err);
    }
  }
}

export default SessionManager;
