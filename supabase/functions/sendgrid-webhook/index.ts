
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
      
      const headers = await getValue('headers') || '{}';
      let parsedHeaders = {};
      try {
        // Some email services provide headers as JSON, others as string
        parsedHeaders = typeof headers === 'string' && headers.startsWith('{') 
          ? JSON.parse(headers) 
          : parseEmailHeaders(headers);
      } catch (e) {
        console.log("Could not parse headers as JSON, treating as string:", e);
        parsedHeaders = parseEmailHeaders(headers);
      }
      
      data = {
        from: await getValue('from'),
        from_name: await getValue('from_name') || await getValue('sender_name'),
        subject: await getValue('subject'),
        text: await getValue('text') || await getValue('plain'),
        html: await getValue('html'),
        to: await getValue('to'),
        headers: parsedHeaders,
        raw_headers: headers,
        sg_message_id: await getValue('sg_message_id') || `manual-${Date.now()}`,
        references: parsedHeaders.References || parsedHeaders.references || '',
        in_reply_to: parsedHeaders['In-Reply-To'] || parsedHeaders.in_reply_to || '',
        message_id: parsedHeaders['Message-ID'] || parsedHeaders.message_id || `manual-${Date.now()}`
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
          message_id: event.message_id || event.sg_message_id || `manual-${Date.now()}`,
          references: event.references || '',
          in_reply_to: event.in_reply_to || '',
          processed: false,
          attachments: attachments.length > 0 ? attachments : null,
          raw_headers: typeof event.raw_headers === 'string' ? event.raw_headers : JSON.stringify(event.headers || {})
        })
        .select('id');

      if (error) {
        console.error('Error storing email:', error);
        throw error;
      }
      
      const emailId = emailData?.[0]?.id;
      
      // Get the actual recipient email (the 'to' address)
      const toEmail = event.to;
      
      // Match email to customer
      const { data: customerMatchResult } = await supabase.rpc('match_email_to_customer', { 
        email_address: toEmail 
      });
      
      const customerId = customerMatchResult;
      
      if (customerId) {
        // Check if this is a reply to an existing thread
        let existingTaskId = null;
        
        // First look for a related task based on in-reply-to header
        if (event.in_reply_to) {
          console.log(`Checking for existing task with in_reply_to: ${event.in_reply_to}`);
          const { data: threadData } = await supabase
            .from('email_threads')
            .select('task_id')
            .eq('message_id', event.in_reply_to)
            .maybeSingle();
            
          if (threadData) {
            existingTaskId = threadData.task_id;
            console.log(`Found existing task ${existingTaskId} based on in_reply_to header`);
          }
        }
        
        // If not found by in-reply-to, try checking references
        if (!existingTaskId && event.references) {
          const references = event.references.split(/\s+/);
          if (references.length > 0) {
            // Try to match any of the references to a known message ID
            console.log(`Checking for existing task with references: ${references.join(', ')}`);
            for (const ref of references) {
              if (!ref.trim()) continue;
              
              const { data: threadData } = await supabase
                .from('email_threads')
                .select('task_id')
                .eq('message_id', ref.trim())
                .maybeSingle();
                
              if (threadData) {
                existingTaskId = threadData.task_id;
                console.log(`Found existing task ${existingTaskId} based on references header`);
                break;
              }
            }
          }
        }
        
        // First look up customer name for better logging
        const { data: customerData } = await supabase
          .from('customers')
          .select('name')
          .eq('id', customerId)
          .single();
          
        const customerName = customerData?.name || 'Unknown';
        let taskId;
        
        if (existingTaskId) {
          // This is a reply to an existing thread
          console.log(`Adding to existing task ${existingTaskId} for customer ${customerName}`);
          taskId = existingTaskId;
        } else {
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
            .select('id');
              
          if (taskError) {
            console.error('Error creating task from email:', taskError);
            continue;
          } else {
            console.log(`Successfully created task from email for customer ${customerName} (${customerId})`);
            taskId = taskData[0].id;
          }
        }
        
        // Store as an email thread for conversation history
        const { data: threadData, error: threadError } = await supabase
          .from('email_threads')
          .insert({
            task_id: taskId,
            direction: 'inbound',
            sender: senderEmail,
            recipient: toEmail,
            subject: event.subject || '',
            content: event.text || event.html?.replace(/<[^>]+>/g, '') || '',
            attachments: attachments.length > 0 ? attachments : null,
            message_id: event.message_id || `inbound-${Date.now()}`
          });
        
        if (threadError) {
          console.error('Error creating email thread:', threadError);
        }
        
        // Create appropriate notification with task number included
        let notificationMessage = '';
        const { data: taskData } = await supabase
          .from('tasks')
          .select('readable_id, title')
          .eq('id', taskId)
          .single();
          
        const taskReadableId = taskData?.readable_id || '';
        const taskTitle = taskData?.title || '';
        
        if (existingTaskId) {
          // For reply to existing task
          notificationMessage = `Neue E-Mail-Antwort für Aufgabe ${taskReadableId}: "${taskTitle}" von ${senderEmail}`;
        } else {
          // For new task
          notificationMessage = `Neue Aufgabe ${taskReadableId} via E-Mail von ${customerName}: "${taskTitle}"`;
        }
        
        // Create notifications for admins
        await supabase
          .from('notifications')
          .insert([{
            message: notificationMessage,
            task_id: taskId,
            user_id: null, // Will be replaced in the SQL function for each user
          }])
          .select();
        
        // Mark the email as processed
        await supabase
          .from('inbound_emails')
          .update({ processed: true })
          .eq('id', emailId);
      } else {
        console.warn(`Could not create task: No matching customer found for email ${toEmail}`);
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

// Helper function to parse email headers from string format
function parseEmailHeaders(headerString) {
  if (!headerString || typeof headerString !== 'string') return {};
  
  const headers = {};
  // Split by newline and process each header line
  const lines = headerString.split(/\r?\n/);
  let currentKey = '';
  let currentValue = '';
  
  for (const line of lines) {
    // If line starts with whitespace, it's a continuation of the previous header
    if (/^\s+/.test(line) && currentKey) {
      currentValue += ' ' + line.trim();
      headers[currentKey] = currentValue;
    } else {
      // New header
      const match = line.match(/^([^:]+):\s*(.*)/);
      if (match) {
        currentKey = match[1];
        currentValue = match[2];
        headers[currentKey] = currentValue;
      }
    }
  }
  
  return headers;
}
