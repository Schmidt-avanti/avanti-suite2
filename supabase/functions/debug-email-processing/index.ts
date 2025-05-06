
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
    
    const results = {
      email_threads: null,
      inbound_emails: null,
      customers_with_avanti_email: null,
      email_function: true
    };
    
    // Check for recent inbound emails
    const { data: emailsData, error: emailsError } = await supabase
      .from('inbound_emails')
      .select('id, from_email, to_emails, subject, received_at, processed')
      .order('received_at', { ascending: false })
      .limit(10);
      
    if (emailsError) {
      results.inbound_emails = { error: emailsError.message };
    } else {
      results.inbound_emails = emailsData;
    }
    
    // Check for recent email threads
    const { data: threadsData, error: threadsError } = await supabase
      .from('email_threads')
      .select('id, task_id, direction, sender, recipient, subject, created_at')
      .order('created_at', { ascending: false })
      .limit(10);
      
    if (threadsError) {
      results.email_threads = { error: threadsError.message };
    } else {
      results.email_threads = threadsData;
    }
    
    // Check for customers with avanti_email set
    const { data: customersData, error: customersError } = await supabase
      .from('customers')
      .select('id, name, avanti_email')
      .not('avanti_email', 'is', null)
      .limit(20);
      
    if (customersError) {
      results.customers_with_avanti_email = { error: customersError.message };
    } else {
      results.customers_with_avanti_email = customersData;
    }
    
    return new Response(JSON.stringify({
      status: 'success',
      message: 'Email system diagnostics completed',
      data: results
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  } catch (error) {
    return new Response(JSON.stringify({
      status: 'error',
      message: error.message
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  }
});
