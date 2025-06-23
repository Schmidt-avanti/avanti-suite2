import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.39.8';


const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const SENDGRID_API_KEY = Deno.env.get('SENDGRID_API_KEY');
const FROM_EMAIL = Deno.env.get('SCHWUNGRAD_FROM_EMAIL') || 'schwungrad@inbox.avanti.cx';

interface RequestBody {
  taskId: string;
  recipient: string;
  subject: string;
  body: string;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (!SENDGRID_API_KEY) {
      throw new Error('SENDGRID_API_KEY is not set in environment variables.');
    }

    const { taskId, recipient, subject, body } = await req.json() as RequestBody;

    if (!taskId || !recipient || !subject || !body) {
      return new Response(JSON.stringify({ error: 'Missing required fields: taskId, recipient, subject, or body' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const sendgridPayload = {
      personalizations: [{ to: [{ email: recipient }] }],
      from: { email: FROM_EMAIL },
      subject: subject,
      content: [{ type: 'text/html', value: body.replace(/\n/g, '<br>') }],
    };

    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SENDGRID_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(sendgridPayload),
    });
 
    if (!response.ok) {
      const errorBody = await response.json();
      console.error('Error sending email via SendGrid:', errorBody);
      throw new Error(`Failed to send email: ${errorBody.errors?.[0]?.message || response.statusText}`);
    }

    // Log the sent email as a task message for history
    const supabaseClient: SupabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    // Update the task status to 'waiting_for_customer'
    const { error: updateError } = await supabaseClient
      .from('tasks')
      .update({ status: 'waiting_for_customer' })
      .eq('id', taskId);

    if (updateError) {
      // Log the error but don't fail the request, as the email was already sent.
      console.error('Failed to update task status to waiting_for_customer:', updateError);
    }

    const logMessage = {
      task_id: taskId,
      message_type: 'email_out',
      content: `Email sent to ${recipient}\n\nSubject: ${subject}\n\n---\n\n${body}`,
      // 'sent_by' could be added if we can resolve the user from the JWT
    };

    const { error: logError } = await supabaseClient.from('task_messages').insert(logMessage);

    if (logError) {
      // Log the error but don't fail the request, as the email was already sent.
      console.error('Failed to log sent email to task_messages:', logError);
    }

    return new Response(JSON.stringify({ success: true, message: 'Email sent successfully.' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: any) {
    console.error('Error in send-schwungrad-email function:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
