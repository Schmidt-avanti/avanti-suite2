
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
    // Get request body
    const { userId, friendlyName, attributes } = await req.json();

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'User ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
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

    // Initialize Twilio client
    const client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Get user profile
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
      
    if (profileError || !profileData) {
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Check if worker already exists in Twilio
    if (profileData.twilio_worker_sid) {
      try {
        // Try to fetch the worker to see if it's still valid
        const worker = await client.taskrouter.v1
          .workspaces(TWILIO_WORKSPACE_SID)
          .workers(profileData.twilio_worker_sid)
          .fetch();
          
        // Update worker attributes if needed
        const workerAttributes = {
          skills: ['voice', 'customer_service'],
          languages: ['german'],
          voice_status: profileData.voice_status || 'offline',
          user_id: userId,
          ...attributes
        };
        
        await client.taskrouter.v1
          .workspaces(TWILIO_WORKSPACE_SID)
          .workers(profileData.twilio_worker_sid)
          .update({
            attributes: JSON.stringify(workerAttributes)
          });
        
        return new Response(
          JSON.stringify({
            success: true,
            message: 'Worker updated',
            workerId: profileData.twilio_worker_sid
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch (error) {
        // Worker doesn't exist anymore, create a new one
        console.log('Existing worker not found, creating new one');
      }
    }
    
    // Create a new worker
    const name = profileData["Full Name"] || `Agent ${userId.substring(0, 6)}`;
    const workerAttributes = {
      skills: ['voice', 'customer_service'],
      languages: ['german'],
      voice_status: 'offline',
      user_id: userId,
      ...attributes
    };
    
    const worker = await client.taskrouter.v1
      .workspaces(TWILIO_WORKSPACE_SID)
      .workers
      .create({
        friendlyName: friendlyName || name,
        attributes: JSON.stringify(workerAttributes)
      });
      
    // Update the user profile with the worker SID
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        twilio_worker_sid: worker.sid,
        twilio_worker_attributes: workerAttributes
      })
      .eq('id', userId);
      
    if (updateError) {
      console.error('Error updating profile:', updateError);
    }
    
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Worker created',
        workerId: worker.sid
      }),
      { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('Error registering worker:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
