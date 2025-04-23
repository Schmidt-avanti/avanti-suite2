
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.0";

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
    
    // Parse the incoming webhook data
    const data = await req.json();
    
    // SendGrid sends an array of events
    for (const event of data) {
      if (event.email) {
        const { error } = await supabase
          .from('inbound_emails')
          .insert({
            from_email: event.from,
            from_name: event.from_name,
            subject: event.subject,
            body_text: event.text,
            body_html: event.html,
            to_emails: Array.isArray(event.to) ? event.to : [event.to],
            message_id: event.sg_message_id,
            processed: false,
            raw_headers: JSON.stringify(event.headers)
          });

        if (error) {
          console.error('Error storing email:', error);
          throw error;
        }
      }
    }

    return new Response(JSON.stringify({ success: true }), { 
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (err) {
    console.error('Webhook Error:', err);
    return new Response(JSON.stringify({ error: err.message }), { 
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
