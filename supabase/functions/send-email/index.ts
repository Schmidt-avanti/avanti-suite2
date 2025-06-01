import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.0";

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const sendgridApiKey = Deno.env.get('SENDGRID_API_KEY')!;
const sendgridVerifiedDomain = Deno.env.get('SENDGRID_VERIFIED_DOMAIN') || 'inbox.avanti.cx';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SendEmailRequest {
  to: string;
  cc?: string;
  subject: string;
  text: string;
  taskId?: string;
  readableId?: string;
  fromName?: string;
  fromEmail?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse the request body
    const requestData: SendEmailRequest = await req.json();
    const { 
      to, 
      cc, 
      subject, 
      text, 
      taskId,
      readableId,
      fromName = 'Avanti Service',
      fromEmail = `service@${sendgridVerifiedDomain}`
    } = requestData;
    
    if (!to || !subject || !text) {
      throw new Error('Missing required fields: to, subject, text');
    }
    
    console.log(`Processing email request to: ${to}, subject: ${subject}`);
    
    // Create a Supabase client with the service role key
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
    
    // Prepare the SendGrid API request
    const sendgridPayload: any = {
      personalizations: [
        {
          to: [{ email: to }],
        },
      ],
      from: {
        email: fromEmail,
        name: fromName,
      },
      subject: subject,
      content: [
        {
          type: 'text/plain',
          value: text,
        },
      ]
    };

    // Add CC recipients if provided
    if (cc) {
      sendgridPayload.personalizations[0].cc = [{ email: cc }];
    }
    
    console.log('SendGrid payload prepared, sending email...');
    
    // Make the SendGrid API request
    const sendgridResponse = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${sendgridApiKey}`,
      },
      body: JSON.stringify(sendgridPayload),
    });
    
    if (!sendgridResponse.ok) {
      const errorText = await sendgridResponse.text();
      console.error('SendGrid API error:', sendgridResponse.status, errorText);
      throw new Error(`SendGrid API error: ${errorText}`);
    }
    
    console.log('Email sent successfully to:', to);

    // Log the email to the database if taskId is provided
    if (taskId) {
      try {
        await supabase
          .from('email_logs')
          .insert({
            task_id: taskId,
            readable_id: readableId,
            recipient: to,
            cc: cc || null,
            subject: subject,
            content: text,
            sent_at: new Date().toISOString()
          });
        
        console.log('Email log saved to database');
      } catch (logError) {
        console.error('Error logging email:', logError);
        // Don't throw here, we want to return success even if logging fails
      }
    }
    
    return new Response(
      JSON.stringify({ success: true }),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json' 
        } 
      }
    );
    
  } catch (error) {
    console.error('Error processing email request:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        status: 400, 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json' 
        } 
      }
    );
  }
});
