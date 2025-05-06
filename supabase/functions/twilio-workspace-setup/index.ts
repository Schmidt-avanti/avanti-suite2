
// supabase/functions/twilio-workspace-setup/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import twilio from 'https://esm.sh/twilio@4.19.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Check if authenticated
  try {
    // Get Twilio credentials from environment variables
    const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID');
    const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN');
    
    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
      return new Response(
        JSON.stringify({ error: 'Twilio credentials not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Twilio client
    const client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
    
    // Create or get existing workspace
    const workspaceName = 'Avanti Suite Call Center';
    let workspace;
    
    try {
      // Check if workspace already exists
      const workspaces = await client.taskrouter.v1.workspaces.list();
      workspace = workspaces.find(ws => ws.friendlyName === workspaceName);
      
      if (!workspace) {
        // Create a new workspace
        workspace = await client.taskrouter.v1.workspaces.create({
          friendlyName: workspaceName,
          eventCallbackUrl: `https://knoevkvjyuchhcmzsdpq.supabase.co/functions/v1/twilio-voice-webhook`,
        });
        console.log(`Created new workspace: ${workspace.sid}`);
      } else {
        console.log(`Using existing workspace: ${workspace.sid}`);
      }
      
      // Create or get default queue
      const queueName = 'Avanti Default Queue';
      let taskQueue;
      
      const queues = await client.taskrouter.v1.workspaces(workspace.sid).taskQueues.list();
      taskQueue = queues.find(q => q.friendlyName === queueName);
      
      if (!taskQueue) {
        taskQueue = await client.taskrouter.v1.workspaces(workspace.sid).taskQueues.create({
          friendlyName: queueName,
          targetWorkers: '1==1', // All workers
        });
        console.log(`Created new task queue: ${taskQueue.sid}`);
      }
      
      // Create or get workflow
      const workflowName = 'Avanti Default Workflow';
      let workflow;
      
      const workflows = await client.taskrouter.v1.workspaces(workspace.sid).workflows.list();
      workflow = workflows.find(w => w.friendlyName === workflowName);
      
      if (!workflow) {
        const config = {
          task_routing: {
            filters: [
              {
                filter_friendly_name: 'Assign to specific agent',
                expression: 'task.assignedWorker != null',
                targets: [
                  {
                    queue: taskQueue.sid,
                    expression: 'worker.sid == task.assignedWorker',
                  }
                ]
              },
              {
                filter_friendly_name: 'Assign by skill',
                expression: 'task.skill != null',
                targets: [
                  {
                    queue: taskQueue.sid,
                    expression: 'worker.skills HAS task.skill',
                    skip_if: '1==0' // Never skip
                  }
                ]
              },
              {
                filter_friendly_name: 'Everyone else',
                expression: '1==1',
                targets: [
                  {
                    queue: taskQueue.sid, 
                    expression: 'worker.voice_status == "available"'
                  }
                ]
              }
            ],
            default_filter: {
              queue: taskQueue.sid
            }
          }
        };
        
        workflow = await client.taskrouter.v1.workspaces(workspace.sid).workflows.create({
          friendlyName: workflowName,
          assignmentCallbackUrl: `https://knoevkvjyuchhcmzsdpq.supabase.co/functions/v1/twilio-task-assignment`,
          configuration: JSON.stringify(config),
        });
        console.log(`Created new workflow: ${workflow.sid}`);
      }
      
      // Save the configuration to the database
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseKey);
      
      // This would be saved to a settings or configuration table
      // For now, we'll just return the values
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            workspaceSid: workspace.sid,
            queueSid: taskQueue.sid,
            workflowSid: workflow.sid
          },
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
      
    } catch (error) {
      console.error('Error setting up Twilio workspace:', error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
