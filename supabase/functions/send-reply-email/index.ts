
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
    const { task_id, subject, body } = await req.json();

    if (!task_id || !body) {
      throw new Error('Missing required fields');
    }

    // Get task details to get recipient email
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .select('endkunde_email')
      .eq('id', task_id)
      .single();

    if (taskError || !task?.endkunde_email) {
      throw new Error('Could not find task or recipient email');
    }

    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('SENDGRID_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [{
          to: [{ email: task.endkunde_email }]
        }],
        from: { email: "m.gawlich@ja-dialog.de" },
        subject: subject,
        content: [{
          type: 'text/plain',
          value: body
        }]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('SendGrid error:', errorText);
      throw new Error('Failed to send email');
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in send-reply-email function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
