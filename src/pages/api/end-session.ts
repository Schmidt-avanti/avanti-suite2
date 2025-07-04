// Using generic types instead of express dependency
interface Request {
  method: string;
  body: any;
}

interface Response {
  status: (code: number) => Response;
  json: (data: any) => void;
}
import { supabase } from '@/integrations/supabase/client';

/**
 * API endpoint to handle synchronous session termination during page unload events
 * This endpoint is specifically for reliability during browser tab/window closing
 */
export default async function handler(
  req: Request,
  res: Response
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { sessionId, taskId, endTime, durationSeconds } = req.body;

    if (!sessionId || !taskId || !endTime || durationSeconds === undefined) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required fields' 
      });
    }

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
        message: 'Failed to update session' 
      });
    }

    // Update task's total_duration_seconds using RPC
    const { error: rpcError } = await supabase
      .rpc('calculate_task_total_duration', { task_id: taskId });

    if (rpcError) {
      console.error('Error calculating task duration:', rpcError);
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to update task duration' 
      });
    }

    return res.status(200).json({ 
      success: true,
      message: 'Session ended successfully'
    });

  } catch (error) {
    console.error('Error in end-session API:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
}
