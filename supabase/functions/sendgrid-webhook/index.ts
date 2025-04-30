
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.0";

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
    } else if (contentType.includes('application/x-www-form-urlencoded') || 
               contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      
      // Helper to safely extract value
      const getValue = async (key) => {
        const val = formData.get(key);
        return typeof val === 'string' ? val : await val?.text?.() || '';
      };
      
      // Log and handle attachments
      for (const [key, value] of formData.entries()) {
        const isAttachment = key.startsWith('attachment') && value instanceof File;
        const preview = typeof value === 'string' ? value : await value?.text?.();
        console.log(`[formData] ${key}:`, preview?.slice?.(0, 200));
        
        if (isAttachment) {
          const ext = value.name?.split('.').pop() || 'bin';
          const fileName = `${Date.now()}-${key}.${ext}`;
          const { error: uploadError } = await supabase.storage
            .from('email-attachments')
            .upload(fileName, value, {
              contentType: value.type || 'application/octet-stream'
            });
            
          if (uploadError) {
            console.error(`Upload failed (${key})`, uploadError);
          } else {
            const url = supabase.storage
              .from('email-attachments')
              .getPublicUrl(fileName).data.publicUrl;
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
        references: await getValue('references'),
        in_reply_to: await getValue('in_reply_to'),
        sg_message_id: await getValue('sg_message_id') || `manual-${Date.now()}`
      };
      
      // Optional MIME fallback
      if (!data.text && !data.html && formData.get('email')) {
        const rawMime = await formData.get('email')?.text?.();
        const bodyMatch = rawMime?.match(/\r?\n\r?\n([\s\S]+)$/);
        data.text = bodyMatch?.[1]?.trim() || '';
        console.log('[MIME fallback body]', data.text.slice(0, 200));
      }
    } else {
      const textContent = await req.text();
      console.log('Received non-JSON/non-form content:', textContent.slice(0, 200) + '...');
      throw new Error(`Unsupported content type: ${contentType}`);
    }
    
    console.log('Processed webhook data:', JSON.stringify(data).slice(0, 500) + '...');
    
    let eventsToProcess = Array.isArray(data) ? data : [data];
    
    for (const event of eventsToProcess) {
      const senderEmail = event.from || event.email || event.from_email;
      
      if (!senderEmail) {
        console.warn('Skipping event with missing email data:', JSON.stringify(event).slice(0, 200));
        continue;
      }
      
      // Store email in inbound_emails table
      const { data: emailData, error } = await supabase
        .from('inbound_emails')
        .insert({
          from_email: senderEmail,
          from_name: event.from_name || event.sender_name || '',
          subject: event.subject || '',
          body_text: event.text || event.plain || event.body || '',
          body_html: event.html || '',
          to_emails: Array.isArray(event.to) ? event.to : [event.to || ''],
          message_id: event.sg_message_id || `manual-${Date.now()}`,
          processed: false,
          attachments: attachments.length > 0 ? attachments : null,
          raw_headers: typeof event.headers === 'string' ? event.headers : JSON.stringify(event.headers || {})
        })
        .select('id');

      if (error) {
        console.error('Error storing email:', error);
        throw error;
      }
      
      const emailId = emailData?.[0]?.id;
      
      // Get the actual recipient email (the 'to' address)
      const toEmail = event.to;
      
      // IMPROVED REPLY DETECTION
      // Step 1: Check for task ID in subject [XX000000]
      const taskIdMatch = event.subject?.match(/\[(.*?)\]/);
      const taskReadableId = taskIdMatch ? taskIdMatch[1].trim() : null;
      
      // Step 2: Check for references/in-reply-to headers that indicate a reply
      const inReplyTo = event.in_reply_to || '';
      const references = event.references || '';
      const rawHeaders = event.headers || '';
      
      console.log(`Processing email - Subject: "${event.subject}", To: ${toEmail}`);
      console.log(`Reply detection - taskReadableId: ${taskReadableId}, inReplyTo: ${!!inReplyTo}, references: ${!!references}`);
      
      // Check if this is a reply to an existing task using various methods
      let existingTaskId = null;
      let relatedTask = null;
      
      // Method 1: Task ID in subject
      if (taskReadableId) {
        console.log(`Looking for task with readable_id: ${taskReadableId}`);
        const { data: taskData } = await supabase
          .from('tasks')
          .select('id, customer_id, title')
          .eq('readable_id', taskReadableId)
          .maybeSingle();
          
        if (taskData) {
          existingTaskId = taskData.id;
          relatedTask = taskData;
          console.log(`Found existing task by readable_id: ${taskReadableId} (ID: ${existingTaskId})`);
        }
      }
      
      // Method 2: Look for message ID in email_threads if we have In-Reply-To header
      if (!existingTaskId && (inReplyTo || references)) {
        // Extract message-id from headers (could be in References or In-Reply-To)
        let possibleMessageIds = [];
        
        if (inReplyTo) {
          possibleMessageIds.push(inReplyTo.trim());
        }
        
        if (references) {
          // References can contain multiple IDs separated by spaces
          const refIds = references.split(/\s+/).map(id => id.trim()).filter(id => id);
          possibleMessageIds = [...possibleMessageIds, ...refIds];
        }
        
        // Also try to extract from raw headers as a fallback
        if (rawHeaders) {
          const refMatch = rawHeaders.match(/References:\s*([^\n]+)/i);
          const replyMatch = rawHeaders.match(/In-Reply-To:\s*([^\n]+)/i);
          
          if (refMatch && refMatch[1]) {
            const extractedRefs = refMatch[1].split(/\s+/).map(id => id.trim()).filter(id => id);
            possibleMessageIds = [...possibleMessageIds, ...extractedRefs];
          }
          
          if (replyMatch && replyMatch[1]) {
            possibleMessageIds.push(replyMatch[1].trim());
          }
        }
        
        if (possibleMessageIds.length > 0) {
          console.log(`Looking for related task using ${possibleMessageIds.length} message IDs`);
          
          // Search for any message ID in the email_threads table
          for (const msgId of possibleMessageIds) {
            // Clean the message ID (sometimes they come with < > brackets)
            const cleanMsgId = msgId.replace(/[<>]/g, '');
            
            if (!cleanMsgId) continue;
            
            // Try to find a task that has a thread entry with this message ID
            const { data: threadData } = await supabase
              .from('email_threads')
              .select('task_id')
              .eq('thread_id', cleanMsgId)
              .maybeSingle();
              
            if (threadData?.task_id) {
              existingTaskId = threadData.task_id;
              
              // Get task details
              const { data: foundTask } = await supabase
                .from('tasks')
                .select('id, customer_id, title, readable_id')
                .eq('id', existingTaskId)
                .maybeSingle();
                
              if (foundTask) {
                relatedTask = foundTask;
                console.log(`Found existing task by message ID reference: ${cleanMsgId} (Task ID: ${existingTaskId}, readable_id: ${foundTask.readable_id})`);
                break; // Found a match, no need to check other message IDs
              }
            }
          }
        }
      }
      
      // Method 3: Check recipient avanti email domain to link to existing tasks
      if (!existingTaskId && toEmail && toEmail.includes('@inbox.avanti.cx')) {
        console.log(`Looking for customer with avanti_email: ${toEmail}`);
        
        // If it's an avanti email address being used as recipient,
        // try to find the customer by their avanti_email
        const { data: customerByAvanti } = await supabase
          .from('customers')
          .select('id, name')
          .ilike('avanti_email', toEmail)
          .maybeSingle();
          
        if (customerByAvanti) {
          // Check if there's a recent task for this customer that this could be a reply to
          const { data: recentTasks } = await supabase
            .from('tasks')
            .select('id, customer_id, title, readable_id')
            .eq('customer_id', customerByAvanti.id)
            .eq('source', 'email')
            .order('created_at', { ascending: false })
            .limit(1);
            
          if (recentTasks && recentTasks.length > 0) {
            existingTaskId = recentTasks[0].id;
            relatedTask = recentTasks[0];
            console.log(`Found recent task for customer ${customerByAvanti.name} with avanti_email ${toEmail}: ${recentTasks[0].readable_id} (${existingTaskId})`);
          }
        }
      }
      
      // If we found a related task, add this email as a thread entry
      if (existingTaskId && relatedTask) {
        console.log(`Adding email as thread to existing task ${relatedTask.readable_id} (${existingTaskId})`);
        
        // Add this email as a thread entry to the existing task
        const { data: threadData, error: threadError } = await supabase
          .from('email_threads')
          .insert({
            task_id: existingTaskId,
            direction: 'inbound',
            sender: senderEmail,
            recipient: toEmail,
            subject: event.subject || '',
            content: event.text || event.html?.replace(/<[^>]+>/g, '') || '',
            attachments: attachments.length > 0 ? attachments : null,
            thread_id: event.sg_message_id // Store message ID for future reference
          });
          
        if (threadError) {
          console.error('Error creating email thread:', threadError);
        } else {
          console.log(`Successfully added email to task ${relatedTask.readable_id} (${existingTaskId}) as email thread`);
        }
        
        // Mark the email as processed
        await supabase
          .from('inbound_emails')
          .update({ processed: true })
          .eq('id', emailId);
          
        // Continue to next email since we've added this to an existing task
        continue;
      }
      
      // If we couldn't match to an existing task, create a new one
      console.log(`No existing task found for this email, attempting to create new task`);
      
      // Try to match the email to a customer to create a new task
      let customerId = null;
      
      // First check if recipient is an avanti email
      if (toEmail && toEmail.toLowerCase().includes('@inbox.avanti.cx')) {
        // Try to find the customer by their avanti_email
        const { data: customerByAvanti } = await supabase
          .from('customers')
          .select('id, name')
          .ilike('avanti_email', toEmail)
          .maybeSingle();
          
        if (customerByAvanti) {
          customerId = customerByAvanti.id;
          console.log(`Found customer by avanti_email: ${customerByAvanti.name} (${customerId})`);
        }
      }
      
      // If we couldn't find by avanti_email, try to match the sender email
      if (!customerId) {
        const { data: customerMatchResult } = await supabase.rpc('match_email_to_customer', { 
          email_address: senderEmail 
        });
        
        customerId = customerMatchResult;
        if (customerId) {
          console.log(`Found customer by match_email_to_customer function: ${customerId}`);
        }
      }
      
      if (customerId) {
        // First look up customer name for better logging
        const { data: customerData } = await supabase
          .from('customers')
          .select('name')
          .eq('id', customerId)
          .single();
          
        const customerName = customerData?.name || 'Unknown';
        
        // Create a new task for this email
        const { data: taskData, error: taskError } = await supabase
          .from('tasks')
          .insert({
            title: event.subject || 'Email ohne Betreff',
            description: event.text?.trim() || event.html?.replace(/<[^>]+>/g, '').trim() || event.subject?.trim() || 'Keine Beschreibung',
            status: 'new',
            customer_id: customerId,
            source: 'email',
            endkunde_email: senderEmail,
            attachments: attachments.length > 0 ? attachments : null,
            source_email_id: emailId
          })
          .select('id, readable_id');
            
        if (taskError) {
          console.error('Error creating task from email:', taskError);
        } else {
          console.log(`Successfully created task ${taskData[0].readable_id} from email for customer ${customerName} (${customerId})`);
          
          // Create email thread record
          const taskId = taskData[0].id;
          
          // Store as an email thread for conversation history
          await supabase
            .from('email_threads')
            .insert({
              task_id: taskId,
              direction: 'inbound',
              sender: senderEmail,
              recipient: toEmail,
              subject: event.subject || '',
              content: event.text || event.html?.replace(/<[^>]+>/g, '') || '',
              attachments: attachments.length > 0 ? attachments : null,
              thread_id: event.sg_message_id // Store message ID for future reference
            });
          
          // Mark the email as processed
          await supabase
            .from('inbound_emails')
            .update({ processed: true })
            .eq('id', emailId);
        }
      } else {
        console.warn(`Could not create task: No matching customer found for email ${senderEmail} to ${toEmail}`);
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
