
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
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
    const contentType = req.headers.get('content-type') || '';
    let data;
    const attachments = [];

    if (contentType.includes('application/json')) {
      try {
        data = await req.json();
      } catch (error) {
        console.error('Error parsing JSON:', error);
        throw new Error('Invalid JSON format');
      }
    } else if (contentType.includes('application/x-www-form-urlencoded') || contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      
      // Helper to safely extract value
      const getValue = async (key) => {
        const val = formData.get(key);
        return typeof val === 'string' ? val : await val?.text?.() || '';
      };
      
      // Log and handle attachments
      for (const [key, value] of formData.entries()){
        const isAttachment = key.startsWith('attachment') && value instanceof File;
        const preview = typeof value === 'string' ? value : await value?.text?.();
        console.log(`[formData] ${key}:`, preview?.slice?.(0, 200));
        
        if (isAttachment) {
          const ext = value.name?.split('.').pop() || 'bin';
          const fileName = `${Date.now()}-${key}.${ext}`;
          const { error: uploadError } = await supabase.storage.from('email-attachments').upload(fileName, value, {
            contentType: value.type || 'application/octet-stream'
          });
          
          if (uploadError) {
            console.error(`Upload failed (${key})`, uploadError);
          } else {
            const url = supabase.storage.from('email-attachments').getPublicUrl(fileName).data.publicUrl;
            attachments.push(url);
            console.log(`[attachment saved] ${fileName} → ${url}`);
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
        let subjectIsReply = false;
        
        // Check if subject starts with Re: or RE: or similar
        if (data.subject && /^re\s*:/i.test(data.subject.trim())) {
          subjectIsReply = true;
          console.log('Subject indicates this is a reply:', data.subject);
        }
        
        // Try to extract message_id and in_reply_to from headers
        if (rawHeaders) {
          // Extract Message-ID
          const messageIdMatch = rawHeaders.match(/Message-ID:\s*<([^>]+)>/i);
          if (messageIdMatch && messageIdMatch[1]) {
            messageId = messageIdMatch[1];
          }
          
          // Extract In-Reply-To
          const inReplyToMatch = rawHeaders.match(/In-Reply-To:\s*<([^>]+)>/i);
          if (inReplyToMatch && inReplyToMatch[1]) {
            inReplyTo = inReplyToMatch[1];
            console.log('Found In-Reply-To header:', inReplyTo);
          }
          
          // Extract References
          const referencesMatch = rawHeaders.match(/References:\s*(.+?)(?:\r?\n\S|\r?\n$)/i);
          if (referencesMatch && referencesMatch[1]) {
            // Split references by spaces, but only keep message IDs (those that look like <something>)
            references = referencesMatch[1].split(/\s+/).filter(ref => /^<.+>$/.test(ref)).map(ref => ref.substring(1, ref.length - 1));
            console.log('Found References header with', references.length, 'IDs');
          }
        }
        
        // Add these fields to the data object
        data.message_id = messageId || data.sg_message_id;
        data.in_reply_to = inReplyTo;
        data.reference_ids = references;
        data.subject_is_reply = subjectIsReply;
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
      
      // Store the email in inbound_emails - Declare emailId here at the top of loop scope
      let emailId;
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
        
        emailId = emailData?.[0]?.id;
      } catch (err) {
        console.error('Error in email insertion:', err);
        continue; // Skip to next event if we can't store this email
      }
      
      // Get the actual recipient email (the 'to' address)
      const toEmail = event.to;
      
      // Extract the recipient's email address from a potential formatted string (e.g., "Name <email@example.com>")
      const toEmailMatch = toEmail ? toEmail.match(/<([^>]+)>/) : null;
      const actualToEmail = toEmailMatch ? toEmailMatch[1].trim() : toEmail?.trim();
      
      console.log(`Looking for customer with avanti_email: ${actualToEmail}`);

      // Check if this is a reply to an existing task by looking up message_id
      let relatedTaskId = null;
      let isReply = false;
      
      // First, try to find a related task using the In-Reply-To header
      if (event.in_reply_to) {
        isReply = true;
        const { data: threadData, error: threadError } = await supabase
          .from('email_threads')
          .select('task_id')
          .eq('message_id', event.in_reply_to)
          .maybeSingle();
        
        if (threadError) {
          console.error('Error finding related thread by In-Reply-To:', threadError);
        } else if (threadData) {
          relatedTaskId = threadData.task_id;
          console.log(`Found related task: ${relatedTaskId} using In-Reply-To header: ${event.in_reply_to}`);
        }
      }
      
      // If we didn't find a task by In-Reply-To, try checking the References field
      if (!relatedTaskId && event.reference_ids && event.reference_ids.length > 0) {
        isReply = true;
        for (const refId of event.reference_ids) {
          const { data: refThreadData, error: refThreadError } = await supabase
            .from('email_threads')
            .select('task_id')
            .eq('message_id', refId)
            .maybeSingle();
            
          if (refThreadError) {
            console.error(`Error finding thread by reference ID ${refId}:`, refThreadError);
          } else if (refThreadData) {
            relatedTaskId = refThreadData.task_id;
            console.log(`Found related task: ${relatedTaskId} using References header: ${refId}`);
            break;
          }
        }
      }
      
      // If still no match, try to match by subject (if it looks like a reply)
      if (!relatedTaskId && event.subject_is_reply) {
        isReply = true;
        // Extract the original subject without the "Re:" prefix
        const originalSubject = event.subject.replace(/^re\s*:\s*/i, '').trim();
        if (originalSubject) {
          const { data: subjectThreads, error: subjectError } = await supabase
            .from('email_threads')
            .select('task_id')
            .ilike('subject', originalSubject)
            .order('created_at', { ascending: false })
            .limit(1);
            
          if (subjectError) {
            console.error('Error finding thread by subject:', subjectError);
          } else if (subjectThreads && subjectThreads.length > 0) {
            relatedTaskId = subjectThreads[0].task_id;
            console.log(`Found related task: ${relatedTaskId} using subject match: "${originalSubject}"`);
          }
        }
      }
      
      // Use the match_email_to_customer function to find the customer
      const { data: customerMatchResult } = await supabase.rpc('match_email_to_customer', {
        email_address: actualToEmail
      });
      
      const customerId = customerMatchResult;
      
      if (customerId) {
        // First look up customer name for better logging
        const { data: customerData } = await supabase.from('customers')
          .select('name')
          .eq('id', customerId)
          .single();
          
        const customerName = customerData?.name || 'Unknown';
        
        if (relatedTaskId) {
          console.log(`This is a reply to an existing task (${relatedTaskId}), adding to email_threads...`);
          
          // Generate a new UUID for this thread entry
          const newThreadId = uuidv4();
          
          const { error: threadInsertError } = await supabase
            .from('email_threads')
            .insert({
              task_id: relatedTaskId,
              direction: 'inbound',
              sender: fromEmail,
              recipient: actualToEmail,
              subject: event.subject || '',
              content: event.text || event.html || '',
              message_id: event.message_id,
              thread_id: newThreadId,
              // If this is a reply, find the original thread by message_id
              reply_to_id: event.in_reply_to ? 
                (await supabase
                  .from('email_threads')
                  .select('id')
                  .eq('message_id', event.in_reply_to)
                  .maybeSingle()
                ).data?.id : null
            });
            
          if (threadInsertError) {
            console.error('Error inserting thread:', threadInsertError);
          } else {
            console.log(`Added email to existing task ${relatedTaskId} as a reply`);
            
            // Mark the email as processed
            await supabase.from('inbound_emails')
              .update({ processed: true })
              .eq('id', emailId);
          }
        } else {
          console.log(`No related task found, creating new task from email...`);
          
          // Create a new task from this email
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
            
            const { error: threadError } = await supabase
              .from('email_threads')
              .insert({
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
            
            // Mark the email as processed
            await supabase.from('inbound_emails')
              .update({ processed: true })
              .eq('id', emailId);
          }
        }
      } else {
        console.warn(`Could not create task: No matching customer found for email ${actualToEmail}`);
      }
    }
    
    return new Response(JSON.stringify({
      success: true
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
      error: err.message
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
});
