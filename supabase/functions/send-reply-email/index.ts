
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
    const { task_id, recipient_email, subject, body } = await req.json();

    if (!task_id || !body || !recipient_email) {
      throw new Error('Missing required fields: task_id, recipient_email, and body are required');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') || '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    );

    // Get task details with customer information
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .select(`
        *,
        customer:customers(name, email),
        inbound_email:source_email_id (
          from_email,
          subject
        )
      `)
      .eq('id', task_id)
      .single();

    if (taskError) {
      console.error('Error fetching task:', taskError);
      throw new Error('Could not find task');
    }

    // Try to get the original sender email from either the relationship or the direct field
    const originalEmail = task.source === 'email' 
      ? (task.inbound_email?.from_email || task.endkunde_email)
      : null;

    if (!originalEmail) {
      throw new Error('No sender email found for this task');
    }

    // Get the customer name for the sender
    const customerName = task.customer?.name || "avanti-suite";
    
    console.log('Sender: ', customerName, ' <', originalEmail, '>');
    console.log('Sending email to:', recipient_email);

    // Get the SendGrid API key
    const sendgridApiKey = Deno.env.get('SENDGRID_API_KEY');
    if (!sendgridApiKey) {
      throw new Error('SENDGRID_API_KEY environment variable is not set');
    }

    // Custom subject or use task title as fallback
    const emailSubject = subject || `Re: ${task.title || 'Ihre Anfrage'}`;
    
    // Send the email using SendGrid
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${sendgridApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [{
          to: [{ email: recipient_email }]
        }],
        from: { email: originalEmail, name: customerName },
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
        content: `Email gesendet an ${recipient_email}: ${body}`,
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
