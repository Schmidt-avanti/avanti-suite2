
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ValidateEmailRequest {
  email: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') as string;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') as string;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse request body
    const { email } = await req.json() as ValidateEmailRequest;
    
    if (!email) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: "Email parameter is required" 
        }),
        { 
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400 
        }
      );
    }

    // First check if the email exists in auth.users via our view
    const { data: authData, error: authError } = await supabase
      .from('auth_users_view')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    if (authError) {
      console.error('Error querying auth_users_view:', authError);
      // Continue checking profiles table since this is just a fallback
    }

    // If found in auth users, we can return immediately
    if (authData) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          exists: true,
          message: "Email exists" 
        }),
        { 
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200 
        }
      );
    }

    // Fallback to checking profiles table for the email
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    if (profileError) {
      console.error('Error validating email in profiles:', profileError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: "Error validating email" 
        }),
        { 
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500 
        }
      );
    }

    // Return whether the email exists in either table
    return new Response(
      JSON.stringify({ 
        success: true, 
        exists: !!profileData || !!authData,
        message: (!!profileData || !!authData) ? "Email exists" : "Email not found" 
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: "Internal server error" 
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500 
      }
    );
  }
});
