
// supabase/functions/twilio-workspace-setup/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { load } from "https://deno.land/std@0.190.0/dotenv/mod.ts";

// Load environment variables
const env = await load();

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
    // Get Twilio credentials from system settings first
    const { data: settingsData, error: settingsError } = await supabase
      .from('system_settings')
      .select('key, value')
      .in('key', ['TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'TWILIO_TWIML_APP_SID', 'TWILIO_WORKSPACE_SID', 'TWILIO_WORKFLOW_SID']);
    
    if (settingsError) {
      return new Response(
        JSON.stringify({ error: 'Failed to retrieve system settings', details: settingsError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Convert settings to a map for easier access
    const settings = new Map<string, string>();
    settingsData.forEach(setting => {
      if (setting.value) {
        settings.set(setting.key, setting.value);
      }
    });
    
    // Get credentials from settings or environment variables
    const TWILIO_ACCOUNT_SID = settings.get('TWILIO_ACCOUNT_SID') || Deno.env.get('TWILIO_ACCOUNT_SID');
    const TWILIO_AUTH_TOKEN = settings.get('TWILIO_AUTH_TOKEN') || Deno.env.get('TWILIO_AUTH_TOKEN');
    const TWILIO_TWIML_APP_SID = settings.get('TWILIO_TWIML_APP_SID') || Deno.env.get('TWILIO_TWIML_APP_SID');
    let TWILIO_WORKSPACE_SID = settings.get('TWILIO_WORKSPACE_SID') || Deno.env.get('TWILIO_WORKSPACE_SID');
    let TWILIO_WORKFLOW_SID = settings.get('TWILIO_WORKFLOW_SID') || Deno.env.get('TWILIO_WORKFLOW_SID');
    
    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_TWIML_APP_SID) {
      return new Response(
        JSON.stringify({ 
          error: 'Twilio credentials not fully configured',
          missing: {
            accountSid: !TWILIO_ACCOUNT_SID,
            authToken: !TWILIO_AUTH_TOKEN,
            twimlAppSid: !TWILIO_TWIML_APP_SID
          }
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Import Twilio client
    const twilio = await import("https://esm.sh/twilio@4.19.0");
    const client = twilio.default(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
    
    let result = {
      workspace: null,
      workflow: null,
      queues: [],
      errors: [],
      success: true
    };
    
    // Create or get workspace
    if (!TWILIO_WORKSPACE_SID) {
      try {
        console.log('Creating new Twilio TaskRouter workspace');
        const workspace = await client.taskrouter.workspaces.create({
          friendlyName: 'Avanti Call Center',
          eventCallbackUrl: `${supabaseUrl}/functions/v1/twilio-task-assignment`
        });
        
        TWILIO_WORKSPACE_SID = workspace.sid;
        result.workspace = { sid: workspace.sid, name: workspace.friendlyName };
        
        // Store workspace SID in system_settings
        await supabase
          .from('system_settings')
          .update({ value: TWILIO_WORKSPACE_SID })
          .eq('key', 'TWILIO_WORKSPACE_SID');
          
        console.log('Workspace created with SID:', TWILIO_WORKSPACE_SID);
      } catch (err) {
        console.error('Error creating workspace:', err);
        result.errors.push(`Workspace creation error: ${err instanceof Error ? err.message : 'Unknown error'}`);
        result.success = false;
      }
    } else {
      // Get existing workspace
      try {
        const workspace = await client.taskrouter.workspaces(TWILIO_WORKSPACE_SID).fetch();
        result.workspace = { sid: workspace.sid, name: workspace.friendlyName };
      } catch (err) {
        console.error('Error fetching workspace:', err);
        result.errors.push(`Workspace fetch error: ${err instanceof Error ? err.message : 'Unknown error'}`);
        result.success = false;
      }
    }
    
    // Only continue if we have a workspace
    if (TWILIO_WORKSPACE_SID && result.success) {
      // Create default TaskQueue if needed
      try {
        console.log('Creating default task queue');
        
        // First check if a default queue already exists
        const queues = await client.taskrouter.workspaces(TWILIO_WORKSPACE_SID)
          .taskQueues
          .list({ friendlyName: 'Default' });
          
        let defaultQueue;
        
        if (queues.length > 0) {
          defaultQueue = queues[0];
          console.log('Default queue already exists:', defaultQueue.sid);
        } else {
          defaultQueue = await client.taskrouter.workspaces(TWILIO_WORKSPACE_SID)
            .taskQueues
            .create({
              friendlyName: 'Default',
              targetWorkers: '1=1', // All workers
            });
          console.log('Default queue created:', defaultQueue.sid);
        }
        
        result.queues.push({ sid: defaultQueue.sid, name: defaultQueue.friendlyName });
        
        // Create workflow if needed
        if (!TWILIO_WORKFLOW_SID) {
          console.log('Creating default workflow');
          const workflow = await client.taskrouter.workspaces(TWILIO_WORKSPACE_SID)
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
          
          TWILIO_WORKFLOW_SID = workflow.sid;
          result.workflow = { sid: workflow.sid, name: workflow.friendlyName };
          
          // Store workflow SID in system_settings
          await supabase
            .from('system_settings')
            .update({ value: TWILIO_WORKFLOW_SID })
            .eq('key', 'TWILIO_WORKFLOW_SID');
            
          console.log('Workflow created with SID:', TWILIO_WORKFLOW_SID);
        } else {
          // Get existing workflow
          try {
            const workflow = await client.taskrouter.workspaces(TWILIO_WORKSPACE_SID)
              .workflows(TWILIO_WORKFLOW_SID)
              .fetch();
            result.workflow = { sid: workflow.sid, name: workflow.friendlyName };
          } catch (err) {
            console.error('Error fetching workflow:', err);
            
            // If the workflow doesn't exist, we'll create a new one
            const workflow = await client.taskrouter.workspaces(TWILIO_WORKSPACE_SID)
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
              
            TWILIO_WORKFLOW_SID = workflow.sid;
            result.workflow = { sid: workflow.sid, name: workflow.friendlyName };
            
            // Update the workflow SID in system_settings
            await supabase
              .from('system_settings')
              .update({ value: TWILIO_WORKFLOW_SID })
              .eq('key', 'TWILIO_WORKFLOW_SID');
          }
        }
      } catch (err) {
        console.error('Error setting up TaskRouter:', err);
        result.errors.push(`TaskRouter setup error: ${err instanceof Error ? err.message : 'Unknown error'}`);
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
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error', success: false }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
