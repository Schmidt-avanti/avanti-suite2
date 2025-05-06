
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.0";
import { v4 as uuidv4 } from "https://esm.sh/uuid@9.0.0";

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  console.log("SendGrid webhook received a request");
  console.log("Method:", req.method);
  console.log("Content-Type:", req.headers.get('content-type'));
  
  if (req.method === 'OPTIONS') {
    console.log("Handling CORS preflight request");
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
    const contentType = req.headers.get('content-type') || '';
    let data;
    const attachments = [];

    console.log("Processing request with content type:", contentType);

    if (contentType.includes('application/json')) {
      try {
        data = await req.json();
        console.log("Parsed JSON data:", JSON.stringify(data).slice(0, 500) + "...");
      } catch (error) {
        console.error('Error parsing JSON:', error);
        throw new Error('Invalid JSON format');
      }
    } else if (contentType.includes('application/x-www-form-urlencoded') || contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      
      // Log all form fields for debugging
      console.log("FormData fields received:");
      for (const [key, value] of formData.entries()) {
        const isFile = value instanceof File;
        const preview = isFile ? `[File: ${value.name}, ${value.size} bytes]` : value;
        console.log(`- ${key}: ${preview}`);
      }
      
      // Helper to safely extract value
      const getValue = async (key) => {
        const val = formData.get(key);
        if (!val) return '';
        return typeof val === 'string' ? val : await val?.text?.() || '';
      };
      
      // Log and handle attachments
      for (const [key, value] of formData.entries()){
        const isAttachment = key.startsWith('attachment') && value instanceof File;
        
        if (isAttachment) {
          console.log(`Processing attachment: ${key}, name: ${value.name}, size: ${value.size}bytes`);
          const ext = value.name?.split('.').pop() || 'bin';
          const fileName = `${Date.now()}-${key}.${ext}`;
          
          try {
            const { data: uploadData, error: uploadError } = await supabase.storage.from('email-attachments').upload(fileName, value, {
              contentType: value.type || 'application/octet-stream'
            });
            
            if (uploadError) {
              console.error(`Upload failed (${key})`, uploadError);
            } else {
              const url = supabase.storage.from('email-attachments').getPublicUrl(fileName).data.publicUrl;
              attachments.push(url);
              console.log(`[attachment saved] ${fileName} → ${url}`);
            }
          } catch (uploadErr) {
            console.error(`Error uploading attachment ${key}:`, uploadErr);
          }
        }
      }
      
      data = {
        from: await getValue('from'),
        from_name: await getValue('from_name') || await getValue('sender_name'),
        subject: await getValue('subject'),
        text: await getValue('text') || await getValue('plain'),
        html: await getValue('html'),
        to: await getValue('to'),
        headers: await getValue('headers'),
        sg_message_id: await getValue('sg_message_id') || `manual-${Date.now()}`
      };
      
      // Optional MIME fallback
      if (!data.text && !data.html && formData.get('email')) {
        const rawMime = await formData.get('email')?.text?.();
        const bodyMatch = rawMime?.match(/\r?\n\r?\n([\s\S]+)$/);
        data.text = bodyMatch?.[1]?.trim() || '';
        console.log('[MIME fallback body]', data.text.slice(0, 200));
      }
      
      // Try to parse message_id and in_reply_to from headers
      try {
        const rawHeaders = data.headers;
        let messageId = null;
        let inReplyTo = null;
        let references = [];
        
        // Try to extract message_id and in_reply_to from headers
        if (rawHeaders) {
          // Extract Message-ID
          const messageIdMatch = rawHeaders.match(/Message-ID:\s*<([^>]+)>/i);
          if (messageIdMatch && messageIdMatch[1]) {
            messageId = messageIdMatch[1];
            console.log("Extracted Message-ID:", messageId);
          }
          
          // Extract In-Reply-To
          const inReplyToMatch = rawHeaders.match(/In-Reply-To:\s*<([^>]+)>/i);
          if (inReplyToMatch && inReplyToMatch[1]) {
            inReplyTo = inReplyToMatch[1];
            console.log("Extracted In-Reply-To:", inReplyTo);
          }
          
          // Extract References
          const referencesMatch = rawHeaders.match(/References:\s*(.+?)(?:\r?\n\S|\r?\n$)/i);
          if (referencesMatch && referencesMatch[1]) {
            // Split references by spaces, but only keep message IDs (those that look like <something>)
            references = referencesMatch[1].split(/\s+/).filter(ref => /^<.+>$/.test(ref)).map(ref => ref.substring(1, ref.length - 1));
            console.log("Extracted References:", references);
          }
        }
        
        // Add these fields to the data object
        data.message_id = messageId || data.sg_message_id;
        data.in_reply_to = inReplyTo;
        data.reference_ids = references;
      } catch (error) {
        console.error('Error extracting header information:', error);
      }
    } else {
      const textContent = await req.text();
      console.log('Received non-JSON/non-form content:', textContent.slice(0, 200) + '...');
      throw new Error(`Unsupported content type: ${contentType}`);
    }
    
    console.log('Processed webhook data:', JSON.stringify(data).slice(0, 500) + '...');
    
    let eventsToProcess = Array.isArray(data) ? data : [data];
    
    for (const event of eventsToProcess){
      const senderEmail = event.from || event.email || event.from_email;
      const fromMatch = senderEmail ? senderEmail.match(/<([^>]+)>/) : null;
      const fromEmail = fromMatch ? fromMatch[1] : senderEmail;
      const fromName = senderEmail && senderEmail.match(/^([^<]+)</) ? senderEmail.match(/^([^<]+)</)[1].trim() : '';
      
      if (!fromEmail) {
        console.warn('Skipping event with missing email data:', JSON.stringify(event).slice(0, 200));
        continue;
      }
      
      console.log(`Processing email from: ${fromEmail} (${fromName})`);
      
      // Store the email in inbound_emails
      try {
        const { data: emailData, error: emailError } = await supabase.from('inbound_emails').insert({
          from_email: fromEmail,
          from_name: fromName || event.from_name || event.sender_name || '',
          subject: event.subject || '',
          body_text: event.text || event.plain || event.body || '',
          body_html: event.html || '',
          to_emails: Array.isArray(event.to) ? event.to : [event.to || ''],
          received_at: new Date().toISOString(),
          processed: false,
          attachments: attachments.length > 0 ? attachments : null,
          message_id: event.message_id,
          in_reply_to: event.in_reply_to,
          reference_ids: event.reference_ids?.length > 0 ? event.reference_ids.join(' ') : null,
          raw_headers: typeof event.headers === 'string' ? event.headers : JSON.stringify(event.headers || {})
        }).select();
        
        if (emailError) {
          console.error('Error storing email:', emailError);
          throw emailError;
        }
        
        const emailId = emailData?.[0]?.id;
        console.log(`Stored email with ID: ${emailId}`);
      } catch (insertError) {
        console.error('Failed to insert inbound email:', insertError);
      }
      
      // Get the actual recipient email (the 'to' address)
      const toEmail = event.to;
      
      // Extract the recipient's email address from a potential formatted string (e.g., "Name <email@example.com>")
      const toEmailMatch = toEmail ? toEmail.match(/<([^>]+)>/) : null;
      const actualToEmail = toEmailMatch ? toEmailMatch[1].trim() : toEmail?.trim();
      
      console.log(`Looking for customer with avanti_email: ${actualToEmail}`);

      // First try to find a related task if this is a reply
      let relatedTaskId = null;
      
      if (event.in_reply_to) {
        try {
          // Try to find a related task by message_id
          const { data: threadData, error: threadError } = await supabase
            .from('email_threads')
            .select('task_id')
            .eq('message_id', event.in_reply_to)
            .maybeSingle();
          
          if (threadError) {
            console.error('Error finding related thread:', threadError);
          } else if (threadData) {
            relatedTaskId = threadData.task_id;
            console.log(`Found related task: ${relatedTaskId} for reply to: ${event.in_reply_to}`);
          }
        } catch (threadLookupError) {
          console.error('Error looking up related thread:', threadLookupError);
        }
      }
      
      try {
        // Use the match_email_to_customer function to find the customer
        console.log(`Calling match_email_to_customer with: ${actualToEmail}`);
        const { data: customerMatchResult, error: matchError } = await supabase.rpc('match_email_to_customer', {
          email_address: actualToEmail
        });
        
        if (matchError) {
          console.error('Error calling match_email_to_customer:', matchError);
          continue;
        }
        
        const customerId = customerMatchResult;
        console.log(`Customer match result: ${customerId}`);
      
        if (customerId) {
          // First look up customer name for better logging
          const { data: customerData, error: customerError } = await supabase.from('customers')
            .select('name')
            .eq('id', customerId)
            .single();
            
          if (customerError) {
            console.error('Error fetching customer details:', customerError);
          }
            
          const customerName = customerData?.name || 'Unknown';
          
          if (relatedTaskId) {
            // If this is a reply to an existing task, add it to the email_threads
            console.log(`Adding reply to existing task ${relatedTaskId}`);
            const newThreadId = uuidv4();
            
            try {
              const { error: threadInsertError } = await supabase
                .from('email_threads')
                .insert({
                  id: uuidv4(), // Explicitly generate a UUID for the thread
                  task_id: relatedTaskId,
                  direction: 'inbound',
                  sender: fromEmail,
                  recipient: actualToEmail,
                  subject: event.subject || '',
                  content: event.text || event.html || '',
                  message_id: event.message_id,
                  thread_id: newThreadId
                });
                
              if (threadInsertError) {
                console.error('Error inserting thread:', threadInsertError);
              } else {
                console.log(`Added email to existing task ${relatedTaskId} as a reply`);
                
                // Mark the email as processed
                const { error: updateError } = await supabase.from('inbound_emails')
                  .update({ processed: true })
                  .eq('id', emailId);
                  
                if (updateError) {
                  console.error('Error marking email as processed:', updateError);
                }
              }
            } catch (threadError) {
              console.error('Error creating email thread for reply:', threadError);
            }
          } else {
            // Create a new task from this email
            console.log(`Creating new task for customer ${customerName} (${customerId}) from email`);
            try {
              const { data: newTask, error: taskError } = await supabase.from('tasks').insert({
                title: event.subject || 'Email ohne Betreff',
                description: event.text?.trim() || event.html?.replace(/<[^>]+>/g, '').trim() || event.subject?.trim() || 'Keine Beschreibung',
                status: 'new',
                customer_id: customerId,
                source: 'email',
                endkunde_email: fromEmail,
                attachments: attachments.length > 0 ? attachments : null,
                source_email_id: emailId
              }).select();
              
              if (taskError) {
                console.error('Error creating task from email:', taskError);
              } else {
                console.log(`Successfully created task from email for customer ${customerName} (${customerId})`);
                
                // Create an initial email_thread entry
                const newThreadId = uuidv4();
                
                try {
                  const { error: threadError } = await supabase
                    .from('email_threads')
                    .insert({
                      id: uuidv4(), // Explicitly generate a UUID
                      task_id: newTask[0].id,
                      direction: 'inbound',
                      sender: fromEmail,
                      recipient: actualToEmail,
                      subject: event.subject || '',
                      content: event.text || event.html || '',
                      message_id: event.message_id,
                      thread_id: newThreadId
                    });
                    
                  if (threadError) {
                    console.error('Error creating email thread:', threadError);
                  } else {
                    console.log(`Created email thread for task ${newTask[0].id}`);
                  }
                } catch (threadCreateError) {
                  console.error('Error creating email thread:', threadCreateError);
                }
                
                // Mark the email as processed
                const { error: updateError } = await supabase.from('inbound_emails')
                  .update({ processed: true })
                  .eq('id', emailId);
                  
                if (updateError) {
                  console.error('Error marking email as processed:', updateError);
                }
              }
            } catch (taskCreateError) {
              console.error('Error creating task:', taskCreateError);
            }
          }
        } else {
          console.warn(`Could not create task: No matching customer found for email ${actualToEmail}`);
        }
      } catch (customerMatchError) {
        console.error('Error in customer matching process:', customerMatchError);
      }
    }
    
    return new Response(JSON.stringify({
      success: true,
      message: 'Webhook processed successfully'
    }), {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  } catch (err) {
    console.error('Webhook Error:', err);
    return new Response(JSON.stringify({
      error: err.message || 'Unknown error processing webhook'
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
});
