
// supabase/functions/twilio-register-worker/index.ts
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
  
  try {
    // Parse request body if it exists
    let requestAttributes = {};
    let requestUserId = user.id;
    
    if (req.body) {
      try {
        const body = await req.json();
        if (body.attributes) {
          requestAttributes = body.attributes;
        }
        
        // If userId is provided in the body, use that (for admin creating workers)
        if (body.userId) {
          const { data: adminProfile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();
            
          // Only admins can create workers for other users
          if (adminProfile?.role === 'admin') {
            requestUserId = body.userId;
          }
        }
      } catch (e) {
        console.error('Error parsing request body:', e);
      }
    }
    
    // Get user profile data to include in the worker attributes
    const { data: userProfile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', requestUserId)
      .single();
    
    if (profileError) {
      console.error('Error fetching user profile:', profileError);
      return new Response(
        JSON.stringify({ error: 'User profile not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Get Twilio credentials from system_settings
    const { data: settings, error: settingsError } = await supabase
      .from('system_settings')
      .select('key, value')
      .in('key', ['TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'TWILIO_WORKSPACE_SID']);
      
    if (settingsError) {
      console.error('Error fetching Twilio settings:', settingsError);
      return new Response(
        JSON.stringify({ error: 'Failed to load Twilio settings' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Convert settings array to object for easier access
    const twilioSettings: Record<string, string> = {};
    settings.forEach(setting => {
      if (setting.value) {
        twilioSettings[setting.key] = setting.value;
      }
    });
    
    // Fallback to environment variables if settings not found in database
    const TWILIO_ACCOUNT_SID = twilioSettings.TWILIO_ACCOUNT_SID || Deno.env.get('TWILIO_ACCOUNT_SID');
    const TWILIO_AUTH_TOKEN = twilioSettings.TWILIO_AUTH_TOKEN || Deno.env.get('TWILIO_AUTH_TOKEN');
    const TWILIO_WORKSPACE_SID = twilioSettings.TWILIO_WORKSPACE_SID || Deno.env.get('TWILIO_WORKSPACE_SID');
    
    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_WORKSPACE_SID) {
      return new Response(
        JSON.stringify({ 
          error: 'Twilio credentials not fully configured',
          missing: {
            accountSid: !TWILIO_ACCOUNT_SID,
            authToken: !TWILIO_AUTH_TOKEN,
            workspaceSid: !TWILIO_WORKSPACE_SID
          }
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Create a Twilio client
    const twilio = await import("https://esm.sh/twilio@4.19.0");
    const client = twilio.default(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
    
    let workerId = userProfile.twilio_worker_sid;
    const workerName = userProfile["Full Name"] || `User-${requestUserId.substring(0, 8)}`;
    
    // Create worker attributes object - properly formatted for TaskRouter
    const workerAttributes = {
      user_id: requestUserId,
      name: workerName,
      email: userProfile.email || "",
      role: userProfile.role || "agent",
      ...requestAttributes
    };
    
    // Store the JSON string representation of attributes
    const attributesString = JSON.stringify(workerAttributes);
    
    // If user already has a worker SID, try to fetch it first
    if (workerId) {
      try {
        const worker = await client.taskrouter.v1
          .workspaces(TWILIO_WORKSPACE_SID)
          .workers(workerId)
          .fetch();
          
        // Update worker attributes if needed
        if (worker.attributes !== attributesString) {
          await worker.update({ attributes: attributesString });
          console.log('Updated worker attributes');
        }
          
        // Worker exists, return it
        return new Response(
          JSON.stringify({ 
            success: true, 
            workerId, 
            message: 'Worker already registered',
            attributes: workerAttributes
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch (err) {
        console.log('Worker not found or error fetching worker, creating new one:', err);
        // Continue to create a new worker
      }
    }
    
    // Create a new worker
    try {
      console.log(`Creating new worker with name: ${workerName}`);
      console.log(`Worker attributes: ${attributesString}`);
      
      const worker = await client.taskrouter.v1
        .workspaces(TWILIO_WORKSPACE_SID)
        .workers
        .create({
          friendlyName: workerName,
          attributes: attributesString
        });
      
      workerId = worker.sid;
      
      console.log(`Worker created with SID: ${workerId}`);
      
      // Update user profile with worker SID
      await supabase
        .from('profiles')
        .update({ 
          twilio_worker_sid: workerId,
          voice_status: 'offline',
          twilio_worker_attributes: workerAttributes
        })
        .eq('id', requestUserId);
        
      return new Response(
        JSON.stringify({ 
          success: true, 
          workerId,
          message: 'Worker registered successfully',
          attributes: workerAttributes
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
      
    } catch (err) {
      console.error('Error creating worker:', err);
      return new Response(
        JSON.stringify({ 
          error: err instanceof Error ? err.message : 'Unknown error creating worker', 
          success: false 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
  } catch (error) {
    console.error('Unhandled error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error', success: false }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
