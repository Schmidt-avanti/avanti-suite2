
// supabase/functions/twilio-register-worker/index.ts
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
  
  try {
    // Get request data
    const { userId, attributes = {} } = await req.json();
    
    // Validate input
    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'User ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log(`Registering worker for user: ${userId}`);
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
      
    if (profileError || !profile) {
      console.error('Error fetching user profile:', profileError);
      return new Response(
        JSON.stringify({ error: 'User profile not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Get Twilio credentials from system_settings
    const { data: settings, error: settingsError } = await supabase
      .from('system_settings')
      .select('*')
      .in('key', ['TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'TWILIO_WORKSPACE_SID'])
      .order('key');
      
    if (settingsError) {
      console.error('Error fetching Twilio settings:', settingsError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch Twilio settings' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Convert settings array to object for easier access
    const twilioSettings = settings.reduce((acc: Record<string, string>, setting) => {
      if (setting.key && setting.value) {
        acc[setting.key] = setting.value;
      }
      return acc;
    }, {});
    
    // Fallback to environment variables if settings not found in database
    const TWILIO_ACCOUNT_SID = twilioSettings['TWILIO_ACCOUNT_SID'] || Deno.env.get('TWILIO_ACCOUNT_SID')!;
    const TWILIO_AUTH_TOKEN = twilioSettings['TWILIO_AUTH_TOKEN'] || Deno.env.get('TWILIO_AUTH_TOKEN')!;
    const TWILIO_WORKSPACE_SID = twilioSettings['TWILIO_WORKSPACE_SID'] || Deno.env.get('TWILIO_WORKSPACE_SID')!;
    
    // Validate Twilio credentials
    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_WORKSPACE_SID) {
      console.error('Missing Twilio credentials:', { 
        hasAccountSid: !!TWILIO_ACCOUNT_SID,
        hasAuthToken: !!TWILIO_AUTH_TOKEN,
        hasWorkspaceSid: !!TWILIO_WORKSPACE_SID
      });
      return new Response(
        JSON.stringify({ error: 'Twilio configuration incomplete' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Initialize Twilio client
    const client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
    
    // Prepare worker attributes
    const workerAttributes = {
      user_id: userId,
      name: profile['Full Name'] || 'Agent',
      contact_uri: `client:${userId}`,
      ...attributes
    };
    
    console.log('Worker attributes:', workerAttributes);
    
    // Check if worker already exists
    if (profile.twilio_worker_sid) {
      try {
        // Try to fetch the worker to see if it exists
        const worker = await client.taskrouter.v1
          .workspaces(TWILIO_WORKSPACE_SID)
          .workers(profile.twilio_worker_sid)
          .fetch();
          
        if (worker) {
          console.log('Worker already exists, updating attributes');
          // Update the worker attributes
          await worker.update({
            attributes: JSON.stringify(workerAttributes)
          });
          
          return new Response(
            JSON.stringify({ 
              success: true, 
              message: 'Worker updated', 
              workerId: profile.twilio_worker_sid,
              attributes: workerAttributes
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      } catch (error) {
        // Worker not found or other error, we'll create a new one
        console.log('Error fetching worker, will create new one:', error);
      }
    }
    
    // Create a new worker
    console.log('Creating new worker with attributes:', workerAttributes);
    const worker = await client.taskrouter.v1
      .workspaces(TWILIO_WORKSPACE_SID)
      .workers
      .create({
        friendlyName: profile['Full Name'] || `Agent-${userId.substring(0, 8)}`,
        attributes: JSON.stringify(workerAttributes)
      });
      
    // Update the user profile with the worker SID
    if (worker && worker.sid) {
      await supabase
        .from('profiles')
        .update({ 
          twilio_worker_sid: worker.sid,
          twilio_worker_attributes: workerAttributes
        })
        .eq('id', userId);
    }
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        workerId: worker.sid,
        attributes: workerAttributes
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error registering worker:', error);
    return new Response(
      JSON.stringify({ error: `Failed to register worker: ${error.message || 'Unknown error'}` }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
