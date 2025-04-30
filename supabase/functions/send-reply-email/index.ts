
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.0";
import { v4 as uuidv4 } from "https://esm.sh/uuid@9.0.0";

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const sendgridApiKey = Deno.env.get('SENDGRID_API_KEY')!;
const sendgridVerifiedDomain = Deno.env.get('SENDGRID_VERIFIED_DOMAIN') || 'inbox.avanti.cx';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SendEmailRequest {
  task_id: string;
  recipient_email: string;
  subject?: string | null;
  body: string;
  attachments?: string[];
  in_reply_to?: string | null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create a Supabase client with the service role key - this bypasses RLS
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
    
    // We won't try to get the authenticated user since we're using service role
    // Instead, proceed directly with the request data
    
    // Parse the request body
    const requestData: SendEmailRequest = await req.json();
    const { task_id, recipient_email, subject: customSubject, body, attachments = [], in_reply_to } = requestData;
    
    if (!task_id || !recipient_email || !body) {
      throw new Error('Missing required fields: task_id, recipient_email, body');
    }
    
    console.log(`Processing email reply request for task: ${task_id}, to: ${recipient_email}`);
    
    // Get task information including customer ID
    const { data: taskData, error: taskError } = await supabase
      .from('tasks')
      .select('id, title, customer_id, readable_id')
      .eq('id', task_id)
      .single();
      
    if (taskError || !taskData) {
      console.error('Task fetch error:', taskError);
      throw new Error(`Task not found: ${taskError}`);
    }
    
    // Get customer information to determine reply-from address
    const { data: customerData, error: customerError } = await supabase
      .from('customers')
      .select('name, avanti_email')
      .eq('id', taskData.customer_id)
      .single();
      
    if (customerError || !customerData) {
      console.error('Customer fetch error:', customerError);
      throw new Error('Customer not found');
    }
    
    // Generate sender email address based on customer/domain association
    const fromEmail = customerData.avanti_email || 
                     `${customerData.name.toLowerCase().replace(/\s+/g, '-')}@${sendgridVerifiedDomain}`;
    
    console.log(`Using fromEmail: ${fromEmail}`);
    
    // Determine subject line (use custom if provided, otherwise task title)
    const subject = customSubject || `Re: ${taskData.title} [${taskData.readable_id || ''}]`;
    
    // Prepare the SendGrid API request
    const messageId = `<task-${taskData.id}-${uuidv4()}@${sendgridVerifiedDomain}>`;
    const headers = {
      "Message-ID": messageId
    };
    
    // If this is a reply to a previous email, add In-Reply-To and References headers
    if (in_reply_to) {
      headers["In-Reply-To"] = in_reply_to;
      headers["References"] = in_reply_to;
    }
    
    const sendgridPayload: any = {
      personalizations: [
        {
          to: [{ email: recipient_email }],
        },
      ],
      from: {
        email: fromEmail,
        name: `Avanti ${customerData.name}`,
      },
      subject: subject,
      content: [
        {
          type: 'text/plain',
          value: body,
        },
      ],
      headers: headers
    };
    
    // Only add attachments to the payload if there are any
    if (attachments && attachments.length > 0) {
      console.log(`Processing ${attachments.length} attachments...`);
      
      sendgridPayload.attachments = [];
      
      // For each attachment, fetch its content and add to the SendGrid payload
      for (let i = 0; i < attachments.length; i++) {
        try {
          const response = await fetch(attachments[i]);
          if (!response.ok) {
            console.error(`Failed to fetch attachment ${i} (${attachments[i]}): ${response.status} ${response.statusText}`);
            continue;
          }
          
          // Extract filename from URL
          const filename = attachments[i].split('/').pop() || 'attachment';
          
          const arrayBuffer = await response.arrayBuffer();
          const base64Content = btoa(
            String.fromCharCode(...new Uint8Array(arrayBuffer))
          );
          
          sendgridPayload.attachments.push({
            content: base64Content,
            filename: filename,
            disposition: 'attachment',
            content_id: filename
          });
          
          console.log(`Successfully processed attachment: ${filename}`);
        } catch (err) {
          console.error(`Error processing attachment ${i}:`, err);
        }
      }
      
      // Remove attachments array if it's empty after processing
      if (sendgridPayload.attachments.length === 0) {
        delete sendgridPayload.attachments;
      }
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
    
    console.log('Email sent successfully to:', recipient_email);
    
    // Store the email thread for future reference
    const { data: threadData, error: threadError } = await supabase
      .from('email_threads')
      .insert({
        task_id: task_id,
        direction: 'outbound',
        sender: fromEmail,
        recipient: recipient_email,
        subject: subject,
        content: body,
        attachments: attachments.length > 0 ? attachments : null,
        message_id: messageId,
        reply_to_id: in_reply_to || null,
      })
      .select();
      
    if (threadError) {
      console.error('Error storing email thread:', threadError);
      // Don't throw here - we still sent the email successfully
    }
    
    return new Response(JSON.stringify({
      success: true,
      message: 'Email sent successfully',
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (err: any) {
    console.error('Error in send-reply-email:', err);
    
    return new Response(JSON.stringify({
      success: false,
      error: err.message || 'An unknown error occurred',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
