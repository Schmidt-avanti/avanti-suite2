
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
    let attributes = {};
    if (req.body) {
      try {
        const body = await req.json();
        if (body.attributes) {
          attributes = body.attributes;
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
            user.id = body.userId;
          }
        }
      } catch (e) {
        console.error('Error parsing request body:', e);
      }
    }
    
    // Get Twilio credentials
    const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID');
    const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN');
    const TWILIO_WORKSPACE_SID = Deno.env.get('TWILIO_WORKSPACE_SID');
    
    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_WORKSPACE_SID) {
      return new Response(
        JSON.stringify({ error: 'Twilio credentials not fully configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
    
    // Check if this user already has a worker assigned
    const { data: userProfile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    
    if (profileError) {
      console.error('Error fetching user profile:', profileError);
      return new Response(
        JSON.stringify({ error: 'User profile not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    let workerId = userProfile.twilio_worker_sid;
    let workerName = userProfile["Full Name"] || `User-${user.id.substring(0, 8)}`;
    
    // Merge user_id into attributes
    attributes = {
      ...attributes,
      user_id: user.id
    };
    
    // If user already has a worker SID, try to fetch it first
    if (workerId) {
      try {
        await client.taskrouter.v1
          .workspaces(TWILIO_WORKSPACE_SID)
          .workers(workerId)
          .fetch();
          
        // Worker exists, return it
        return new Response(
          JSON.stringify({ 
            success: true, 
            workerId, 
            message: 'Worker already registered' 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch (err) {
        // Worker doesn't exist anymore, we'll create a new one
        console.log('Worker not found, creating new one');
      }
    }
    
    // Create a new worker
    try {
      const worker = await client.taskrouter.v1
        .workspaces(TWILIO_WORKSPACE_SID)
        .workers
        .create({
          friendlyName: workerName,
          attributes: JSON.stringify(attributes)
        });
      
      workerId = worker.sid;
      
      // Update user profile with worker SID
      await supabase
        .from('profiles')
        .update({ 
          twilio_worker_sid: workerId,
          voice_status: 'offline'
        })
        .eq('id', user.id);
        
      return new Response(
        JSON.stringify({ 
          success: true, 
          workerId,
          message: 'Worker registered successfully' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
      
    } catch (err) {
      console.error('Error creating worker:', err);
      return new Response(
        JSON.stringify({ 
          error: err.message, 
          success: false 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
  } catch (error) {
    console.error('Unhandled error:', error);
    return new Response(
      JSON.stringify({ error: error.message, success: false }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
