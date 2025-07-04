import { supabase } from '@/integrations/supabase/client';
import type { NextApiRequest, NextApiResponse } from 'next';

/**
 * API endpoint to handle synchronous session termination during page unload events
 * This endpoint is specifically for reliability during browser tab/window closing
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { sessionId, taskId, endTime, durationSeconds } = req.body;

  if (!sessionId || !taskId || !endTime || durationSeconds === undefined) {
    return res.status(400).json({ 
      success: false, 
      error: 'Missing required fields' 
    });
  }

  try {
    console.log(`Ending session ${sessionId} for task ${taskId} with duration ${durationSeconds}s`);
    
    // Update the session with end time and duration
    const { error } = await supabase
      .from('task_sessions')
      .update({
        end_time: endTime,
        duration_seconds: durationSeconds
      })
      .eq('id', sessionId);

    if (error) {
      console.error('Error updating session:', error);
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to update session' 
      });
    }
    
    // Get detailed sessions data with user info to verify correct calculation
    const { data: detailedSessions, error: sessionsError } = await supabase
      .from('task_sessions')
      .select('id, user_id, duration_seconds')
      .eq('task_id', taskId)
      .not('duration_seconds', 'is', null);
    
    if (!sessionsError && detailedSessions) {
      // Group by user to see individual contributions
      const userContributions: Record<string, number> = {};
      let totalDuration = 0;
      
      // Calculate per-user and total duration
      detailedSessions.forEach(session => {
        const userId = session.user_id;
        const duration = session.duration_seconds || 0;
        
        // Add to user's contribution
        if (!userContributions[userId]) {
          userContributions[userId] = 0;
        }
        userContributions[userId] += duration;
        
        // Add to total
        totalDuration += duration;
      });
      
      // Log detailed breakdown
      console.log(`===== END SESSION API - TASK TIME VERIFICATION FOR TASK ${taskId} =====`);
      console.log(`Total sessions found: ${detailedSessions.length}`);
      console.log('Per-user contributions:');
      Object.entries(userContributions).forEach(([userId, time]) => {
        console.log(`  User ${userId}: ${time}s`);
      });
      console.log(`TOTAL across all users: ${totalDuration}s`);
      console.log('===============================================');
      
      // Update the tasks table directly
      const { error: updateError } = await supabase
        .from('tasks')
        .update({ total_duration_seconds: totalDuration })
        .eq('id', taskId);
      
      if (updateError) {
        console.error('Error updating task total duration:', updateError);
      } else {
        console.log(`Updated task ${taskId} total duration to ${totalDuration}s`);
      }
    }

    // Also try RPC function as backup
    const { error: rpcError } = await supabase
      .rpc('calculate_task_total_duration', { task_id: taskId });

    if (rpcError) {
      console.error('Error calculating task duration via RPC:', rpcError);
      // We still mark this as success since the session was updated
    }

    return res.status(200).json({ 
      success: true, 
      message: 'Session ended successfully' 
    });
  } catch (error) {
    console.error('Error in end-session API:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Server error' 
    });
  }
}
