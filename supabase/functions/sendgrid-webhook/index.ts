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
      data = {
        from: formData.get('from'),
        from_name: formData.get('from_name') || formData.get('sender_name'),
        subject: formData.get('subject'),
        text: formData.get('text') || formData.get('plain'),
        html: formData.get('html'),
        to: formData.get('to'),
        headers: formData.get('headers'),
        sg_message_id: formData.get('sg_message_id') || `manual-${Date.now()}`
      };
    } else {
      const textContent = await req.text();
      console.log('Received non-JSON/non-form content:', textContent.slice(0, 200) + '...');
      throw new Error(`Unsupported content type: ${contentType}`);
    }
    
    console.log('Processed webhook data:', JSON.stringify(data).slice(0, 500) + '...');
    
    let eventsToProcess = Array.isArray(data) ? data : [data];
    
    for (const event of eventsToProcess) {
      if (event && (event.from || event.email || event.from_email)) {
        const { data: emailData, error } = await supabase
          .from('inbound_emails')
          .insert({
            from_email: event.from || event.email || event.from_email,
            from_name: event.from_name || event.sender_name || '',
            subject: event.subject || '',
            body_text: event.text || event.plain || event.body || '',
            body_html: event.html || '',
            to_emails: Array.isArray(event.to) ? event.to : [event.to || ''],
            message_id: event.sg_message_id || `manual-${Date.now()}`,
            processed: false,
            raw_headers: typeof event.headers === 'string' ? event.headers : JSON.stringify(event.headers || {})
          })
          .select('id');

        if (error) {
          console.error('Error storing email:', error);
          throw error;
        }
        
        const emailId = emailData?.[0]?.id;
        
        const toEmail = event.to;
        let mappedEmail = 'test@test.de';
        
        const { data: customerByEmail } = await supabase
          .from('customers')
          .select('id, name')
          .eq('email', mappedEmail)
          .maybeSingle();
          
        const { data: customerByContact } = !customerByEmail ? await supabase
          .from('customer_contacts')
          .select('customer_id')
          .eq('email', mappedEmail)
          .maybeSingle() : { data: null };
        
        let customerId = customerByEmail?.id || customerByContact?.customer_id;
        
        if (customerId) {
          const { error: taskError } = await supabase
            .from('tasks')
            .insert({
              title: event.subject || 'Email ohne Betreff',
              description: event.text || event.plain || event.body || event.html || '',
              status: 'new',
              customer_id: customerId,
              created_by: event.from || event.email || event.from_email
            });
            
          if (taskError) {
            console.error('Error creating task from email:', taskError);
          } else {
            console.log(`Successfully created task from email for customer ${customerId}`);
            
            await supabase
              .from('inbound_emails')
              .update({ processed: true })
              .eq('id', emailId);
          }
        } else {
          console.warn('Could not create task: No matching customer found');
        }
      } else {
        console.warn('Skipping event with missing email data:', JSON.stringify(event).slice(0, 200));
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
