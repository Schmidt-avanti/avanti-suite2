
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
      
      // Use the match_email_to_customer database function to find the customer
      const { data: customerMatchResult } = await supabase.rpc('match_email_to_customer', { 
        email_address: senderEmail 
      });
      
      const customerId = customerMatchResult;
      
      if (customerId) {
        // First look up customer name for better logging
        const { data: customerData } = await supabase
          .from('customers')
          .select('name')
          .eq('id', customerId)
          .single();
          
        const customerName = customerData?.name || 'Unknown';
        
        const { error: taskError } = await supabase
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
          });
            
        if (taskError) {
          console.error('Error creating task from email:', taskError);
        } else {
          console.log(`Successfully created task from email for customer ${customerName} (${customerId})`);
          
          await supabase
            .from('inbound_emails')
            .update({ processed: true })
            .eq('id', emailId);
        }
      } else {
        console.warn(`Could not create task: No matching customer found for email ${senderEmail}`);
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
