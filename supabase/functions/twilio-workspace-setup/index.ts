
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

  // Check for bearer token
  const authHeader = req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const token = authHeader.split(' ')[1];
  
  // Initialize Supabase client
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  // Verify token and get user
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  
  if (authError || !user) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized', details: authError?.message }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
  
  // Check if user is an admin
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
  
  if (profileError || profile?.role !== 'admin') {
    return new Response(
      JSON.stringify({ error: 'Only admin users can configure Twilio workspace' }),
      { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
  
  try {
    // Get Twilio credentials
    const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID');
    const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN');
    const TWILIO_TWIML_APP_SID = Deno.env.get('TWILIO_TWIML_APP_SID');
    
    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_TWIML_APP_SID) {
      return new Response(
        JSON.stringify({ error: 'Twilio credentials not fully configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
    let workspaceSid = Deno.env.get('TWILIO_WORKSPACE_SID');
    let workflowSid = Deno.env.get('TWILIO_WORKFLOW_SID');
    let result = {
      workspace: null,
      workflow: null,
      queues: [],
      errors: [],
      success: true
    };
    
    // Create or get workspace
    if (!workspaceSid) {
      try {
        console.log('Creating new Twilio TaskRouter workspace');
        const workspace = await client.taskrouter.workspaces.create({
          friendlyName: 'Avanti Call Center',
          eventCallbackUrl: `${supabaseUrl}/functions/v1/twilio-task-assignment`
        });
        
        workspaceSid = workspace.sid;
        result.workspace = { sid: workspace.sid, name: workspace.friendlyName };
        
        // Store workspace SID in supabase secrets
        // Note: In a production environment, this should be done outside this function
        console.log('Workspace created with SID:', workspaceSid);
      } catch (err) {
        console.error('Error creating workspace:', err);
        result.errors.push(`Workspace creation error: ${err.message}`);
        result.success = false;
      }
    } else {
      // Get existing workspace
      try {
        const workspace = await client.taskrouter.workspaces(workspaceSid).fetch();
        result.workspace = { sid: workspace.sid, name: workspace.friendlyName };
      } catch (err) {
        console.error('Error fetching workspace:', err);
        result.errors.push(`Workspace fetch error: ${err.message}`);
        result.success = false;
      }
    }
    
    // Only continue if we have a workspace
    if (workspaceSid && result.success) {
      // Create default TaskQueue if needed
      try {
        console.log('Creating default task queue');
        const defaultQueue = await client.taskrouter.workspaces(workspaceSid)
          .taskQueues
          .create({
            friendlyName: 'Default',
            targetWorkers: '1=1', // All workers
          });
        
        result.queues.push({ sid: defaultQueue.sid, name: defaultQueue.friendlyName });
        
        // Create workflow if needed
        if (!workflowSid) {
          console.log('Creating default workflow');
          const workflow = await client.taskrouter.workspaces(workspaceSid)
            .workflows
            .create({
              friendlyName: 'Default Call Flow',
              assignmentCallbackUrl: `${supabaseUrl}/functions/v1/twilio-task-assignment`,
              fallbackAssignmentCallbackUrl: `${supabaseUrl}/functions/v1/twilio-task-assignment`,
              taskReservationTimeout: 120,
              configuration: JSON.stringify({
                filters: [
                  {
                    filter_friendly_name: 'All Calls',
                    expression: '1==1',
                    targets: [
                      {
                        queue: defaultQueue.sid,
                        priority: 1,
                        expression: 'worker.available == 1'
                      }
                    ]
                  }
                ],
                default_filter: {
                  queue: defaultQueue.sid
                }
              })
            });
          
          workflowSid = workflow.sid;
          result.workflow = { sid: workflow.sid, name: workflow.friendlyName };
          
          // Store workflow SID in supabase secrets
          console.log('Workflow created with SID:', workflowSid);
        } else {
          // Get existing workflow
          const workflow = await client.taskrouter.workspaces(workspaceSid)
            .workflows(workflowSid)
            .fetch();
          result.workflow = { sid: workflow.sid, name: workflow.friendlyName };
        }
      } catch (err) {
        console.error('Error setting up TaskRouter:', err);
        result.errors.push(`TaskRouter setup error: ${err.message}`);
        result.success = false;
      }
    }
    
    return new Response(
      JSON.stringify(result),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('Unhandled error:', error);
    return new Response(
      JSON.stringify({ error: error.message, success: false }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
