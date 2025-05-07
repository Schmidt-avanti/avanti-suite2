
// supabase/functions/twilio-task-assignment/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

// This endpoint needs to be public to receive webhooks from Twilio
serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': '*',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse form data from Twilio
    const formData = await req.formData();
    const taskAttributes = formData.get('TaskAttributes');
    const workerAttributes = formData.get('WorkerAttributes');
    const taskSid = formData.get('TaskSid');
    const workspaceSid = formData.get('WorkspaceSid');
    const reservationSid = formData.get('ReservationSid');
    
    console.log('Task assignment webhook received:', {
      taskSid,
      workspaceSid,
      reservationSid
    });
    
    if (!taskAttributes) {
      return new Response(
        JSON.stringify({ error: 'Missing task attributes' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Parse the JSON attributes
    const task = JSON.parse(taskAttributes.toString());
    const worker = workerAttributes ? JSON.parse(workerAttributes.toString()) : null;
    
    console.log('Task attributes:', task);
    console.log('Worker attributes:', worker);
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Get agent ID from worker attributes
    const agentId = worker?.user_id;
    
    // Get call SID from task attributes
    const callSid = task?.call_sid;
    
    if (callSid) {
      // Update the call session with agent info and twilio_phone_number_id if present
      const updateData: any = {
        agent_id: agentId,
        status: 'assigned'
      };
      
      if (task.twilio_phone_number_id) {
        updateData.twilio_phone_number_id = task.twilio_phone_number_id;
      }
      
      const { data, error } = await supabase
        .from('call_sessions')
        .update(updateData)
        .eq('call_sid', callSid)
        .select();
        
      if (error) {
        console.error('Error updating call session:', error);
      } else {
        console.log('Call session updated:', data);
      }
      
      // If the call is linked to a customer, create or update a task for it
      if (task?.customer_id) {
        // Check if there's an existing task for this call
        let taskId = null;
        const { data: existingCallSession } = await supabase
          .from('call_sessions')
          .select('task_id')
          .eq('call_sid', callSid)
          .not('task_id', 'is', null)
          .single();
          
        if (existingCallSession?.task_id) {
          taskId = existingCallSession.task_id;
        } else {
          // Create a new task for this call
          let taskTitle = `Call from ${task.from || 'Unknown'}`;
          let taskDescription = `Incoming call from ${task.from || 'Unknown'}`;
          
          // If we have customer info, use it in the title/description
          if (task.customer_name) {
            taskTitle += ` (${task.customer_name})`;
            taskDescription += ` for ${task.customer_name}`;
          }
          
          // If we have a phone number it was called on, add it
          if (task.to) {
            taskDescription += ` to ${task.to}`;
          }
          
          const { data: newTask, error: taskError } = await supabase
            .from('tasks')
            .insert({
              title: taskTitle,
              description: taskDescription,
              status: 'in_progress',
              customer_id: task.customer_id,
              endkunde_id: task.endkunde_id || null,
              source: 'call',
              assigned_to: agentId
            })
            .select()
            .single();
            
          if (taskError) {
            console.error('Error creating task for call:', taskError);
          } else {
            taskId = newTask.id;
            
            // Update the call session with the task ID
            await supabase
              .from('call_sessions')
              .update({ task_id: taskId })
              .eq('call_sid', callSid);
          }
        }
      }
    }
    
    // Return an acknowledgement to Twilio
    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('Error handling task assignment:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
