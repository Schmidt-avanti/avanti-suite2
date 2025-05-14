
// supabase/functions/twilio-task-assignment/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// This function needs to be public to receive webhooks from Twilio
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const formData = await req.formData();
    const twilioParams = Object.fromEntries(formData.entries());
    console.log('Received TaskRouter webhook:', twilioParams);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Extract task attributes if available
    let taskAttributes = {};
    if (twilioParams.TaskAttributes) {
      try {
        taskAttributes = JSON.parse(twilioParams.TaskAttributes);
        console.log('Task attributes:', taskAttributes);
      } catch (e) {
        console.error('Error parsing task attributes:', e);
      }
    }
    
    // Extract worker attributes if available
    let workerAttributes = {};
    if (twilioParams.WorkerAttributes) {
      try {
        workerAttributes = JSON.parse(twilioParams.WorkerAttributes);
        console.log('Worker attributes:', workerAttributes);
      } catch (e) {
        console.error('Error parsing worker attributes:', e);
      }
    }
    
    // Handle different TaskRouter event types
    if (twilioParams.EventType === 'reservation.created') {
      // A new task has been assigned to a worker
      if (taskAttributes.call_sid) {
        // Update call session with the worker assignment
        if (workerAttributes.user_id) {
          const { error: updateError } = await supabase
            .from('call_sessions')
            .update({ agent_id: workerAttributes.user_id })
            .eq('call_sid', taskAttributes.call_sid);
            
          if (updateError) {
            console.error('Error updating call session:', updateError);
          }
        }
        
        // If there's a task_id in the attributes, update the task assignment
        if (taskAttributes.task_id) {
          const { error: taskError } = await supabase
            .from('tasks')
            .update({ 
              assigned_to: workerAttributes.user_id,
              status: 'in_progress' 
            })
            .eq('id', taskAttributes.task_id);
            
          if (taskError) {
            console.error('Error updating task assignment:', taskError);
          }
        } else if (workerAttributes.user_id && taskAttributes.customer_id) {
          // If there's no task_id but we have customer_id, create a new task for this call
          // This happens for incoming calls
          try {
            const { data: taskData, error: taskError } = await supabase
              .from('tasks')
              .insert({
                title: `Incoming call from ${taskAttributes.from || 'unknown'}`,
                description: `Call from ${taskAttributes.from || 'unknown'} to ${taskAttributes.to || 'unknown'}`,
                customer_id: taskAttributes.customer_id,
                endkunde_id: taskAttributes.endkunde_id,
                assigned_to: workerAttributes.user_id,
                status: 'in_progress',
                source: 'voice_call'
              })
              .select()
              .single();
              
            if (taskError) {
              console.error('Error creating task for call:', taskError);
            } else if (taskData) {
              // Link the call session to the new task
              await supabase
                .from('call_sessions')
                .update({ task_id: taskData.id })
                .eq('call_sid', taskAttributes.call_sid);
            }
          } catch (e) {
            console.error('Error handling task creation:', e);
          }
        }
      }
    } else if (twilioParams.EventType === 'reservation.accepted') {
      // Worker accepted the task
      console.log('Reservation accepted');
    } else if (twilioParams.EventType === 'reservation.rejected') {
      // Worker rejected the task
      console.log('Reservation rejected');
    } else if (twilioParams.EventType === 'reservation.timeout') {
      // Reservation timed out
      console.log('Reservation timed out');
    } else if (twilioParams.EventType === 'reservation.canceled') {
      // Reservation was canceled
      console.log('Reservation canceled');
    } else if (twilioParams.EventType === 'task.completed') {
      // Task was completed
      console.log('Task completed');
    }
    
    // Return a 200 OK response to Twilio
    return new Response('OK', {
      status: 200,
      headers: corsHeaders
    });
    
  } catch (error) {
    console.error('Error handling TaskRouter webhook:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
