
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.0";

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
    const { task_id, subject, body } = await req.json();

    if (!task_id || !body) {
      throw new Error('Missing required fields: task_id and body are required');
    }

    // Get task details to get recipient email
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') || '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    );

    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .select('endkunde_email, title')
      .eq('id', task_id)
      .single();

    if (taskError) {
      console.error('Error fetching task:', taskError);
      throw new Error('Could not find task');
    }

    if (!task?.endkunde_email) {
      throw new Error('No recipient email found for this task');
    }

    console.log('Sending email to:', task.endkunde_email);

    const emailSubject = subject || `Re: ${task.title || 'Ihre Anfrage'}`;
    
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('SENDGRID_API_KEY') || ''}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [{
          to: [{ email: task.endkunde_email }]
        }],
        from: { email: "m.gawlich@ja-dialog.de", name: "avanti-suite" },
        subject: emailSubject,
        content: [{
          type: 'text/plain',
          value: body
        }]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('SendGrid error:', errorText);
      throw new Error(`Failed to send email: ${errorText}`);
    }

    // Update task history with sent email
    const { error: historyError } = await supabase
      .from('task_messages')
      .insert({
        task_id,
        role: 'user',
        content: `Email gesendet: ${body}`,
      });

    if (historyError) {
      console.error('Error logging email history:', historyError);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Error in send-reply-email function:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Unknown error occurred' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
