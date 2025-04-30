
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.0";
import { v4 as uuidv4 } from "https://esm.sh/uuid@9.0.0";

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EmailHeaders {
  [key: string]: string;
}

interface EmailAttachment {
  content: string;
  type: string;
  filename: string;
  disposition: string;
  content_id: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
    const formData = await req.formData();
    
    // Extract basic email information from the webhook payload
    const from = formData.get('from')?.toString() || '';
    const fromEmail = from.match(/<([^>]+)>/) ? 
                      from.match(/<([^>]+)>/)![1] : 
                      from;
                      
    const fromName = from.match(/^([^<]+)</) ? 
                    from.match(/^([^<]+)</)![1].trim() : 
                    '';
    
    const subject = formData.get('subject')?.toString() || null;
    const text = formData.get('text')?.toString() || null;
    const html = formData.get('html')?.toString() || null;
    const to = formData.get('to')?.toString() || '';
    const headers = formData.get('headers')?.toString() || '';
    
    // Parse the headers to extract message-id and in-reply-to
    let messageId: string | null = null;
    let inReplyTo: string | null = null;
    let references: string[] = [];
    
    // Log all formData fields for debugging
    for (const [key, value] of formData.entries()) {
      console.log(`[formData] ${key}: ${value}`);
    }
    
    // Extract email headers (msg_id, in_reply_to, references)
    try {
      const headersParsed: EmailHeaders = headers ? JSON.parse(headers) : {};
      if (headersParsed['Message-ID']) {
        messageId = headersParsed['Message-ID'];
      }
      if (headersParsed['In-Reply-To']) {
        inReplyTo = headersParsed['In-Reply-To'];
      }
      if (headersParsed['References']) {
        references = headersParsed['References'].split(' ');
      }
    } catch (error) {
      console.error('Error parsing headers:', error);
    }

    // Process attachments if any
    const attachments = [];
    const attachmentCount = parseInt(formData.get('attachments')?.toString() || '0');
    
    for (let i = 0; i < attachmentCount; i++) {
      try {
        const attachment: EmailAttachment = JSON.parse(formData.get(`attachment${i}`)?.toString() || '{}');
        if (attachment && attachment.filename) {
          // TODO: Store attachments in the storage bucket if needed
          attachments.push(attachment);
        }
      } catch (err) {
        console.error(`Error processing attachment ${i}:`, err);
      }
    }
    
    // Extract data for inbound email storage
    const emailData = {
      from_email: fromEmail,
      from_name: fromName,
      subject: subject,
      body_text: text,
      body_html: html,
      to_emails: Array.isArray(to) ? to : [to], // Store as an array in case there are multiple recipients
      received_at: new Date().toISOString(),
      processed: false,
      attachments: attachments.length > 0 ? attachments : null,
      message_id: messageId,
      in_reply_to: inReplyTo,
      reference_ids: references.length > 0 ? references.join(' ') : null
    };
    
    console.log("Processed webhook data:", JSON.stringify(emailData));
    
    // Insert the inbound email into the database
    const { data: inboundEmailData, error: inboundEmailError } = await supabase
      .from('inbound_emails')
      .insert(emailData)
      .select();
      
    if (inboundEmailError) {
      console.error('Error storing email:', inboundEmailError);
      throw new Error('Error storing email: ' + JSON.stringify(inboundEmailError));
    }
    
    // If this is a reply to an existing thread, find the task ID from previous threads
    let relatedTaskId: string | null = null;
    
    if (inReplyTo) {
      // Try to find a related task by message_id
      const { data: threadData, error: threadError } = await supabase
        .from('email_threads')
        .select('task_id')
        .eq('message_id', inReplyTo)
        .maybeSingle();
      
      if (threadError) {
        console.error('Error finding related thread:', threadError);
      } else if (threadData) {
        relatedTaskId = threadData.task_id;
      }
    }
    
    // If we found a related task, store this as a thread in the email_threads table
    if (relatedTaskId) {
      const newThreadId = uuidv4();
      
      const { error: threadInsertError } = await supabase
        .from('email_threads')
        .insert({
          task_id: relatedTaskId,
          direction: 'inbound',
          sender: fromEmail,
          recipient: to,
          subject: subject,
          content: text || html || '',
          message_id: messageId,
          thread_id: newThreadId,
          // If this is a reply, find the original thread by message_id
          reply_to_id: inReplyTo ? 
            (await supabase
              .from('email_threads')
              .select('id')
              .eq('message_id', inReplyTo)
              .maybeSingle()
            ).data?.id : null
        });
        
      if (threadInsertError) {
        console.error('Error inserting thread:', threadInsertError);
      }
    } else {
      // Try to match the email to a customer
      const matchCustomerQuery = await supabase.rpc('match_email_to_customer', {
        email_address: fromEmail
      });
      
      const customerId = matchCustomerQuery.data;
      
      if (customerId) {
        // Create a new task from this email
        const { data: newTask, error: taskError } = await supabase
          .from('tasks')
          .insert({
            title: subject || 'Email without subject',
            description: text || html || 'No content',
            status: 'new',
            customer_id: customerId,
            source: 'email',
            source_email_id: inboundEmailData ? inboundEmailData[0].id : null,
            endkunde_email: fromEmail
          })
          .select();
          
        if (taskError) {
          console.error('Error creating task:', taskError);
        } else if (newTask) {
          // Create an initial email_thread entry
          const newThreadId = uuidv4();
          
          await supabase
            .from('email_threads')
            .insert({
              task_id: newTask[0].id,
              direction: 'inbound',
              sender: fromEmail,
              recipient: to,
              subject: subject,
              content: text || html || '',
              message_id: messageId,
              thread_id: newThreadId
            });
        }
      }
    }
    
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (err: any) {
    console.error('Webhook Error:', err);
    return new Response(JSON.stringify({ error: err.message || 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
