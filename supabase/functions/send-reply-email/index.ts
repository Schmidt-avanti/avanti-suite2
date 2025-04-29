
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
    const { task_id, recipient_email, subject, body, attachments } = await req.json();

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

    // Get the SendGrid API key
    const sendgridApiKey = Deno.env.get('SENDGRID_API_KEY');
    if (!sendgridApiKey) {
      throw new Error('SENDGRID_API_KEY environment variable is not set');
    }

    // Get the verified domain or fallback to a default
    const verifiedDomain = Deno.env.get('SENDGRID_VERIFIED_DOMAIN') || 'inbox.avanti.cx';
    
    // Create a safe sender name by removing special characters and spaces
    let safeSenderName = (task.customer?.name || 'support')
      .toLowerCase()
      .replace(/[^\w.-]/g, '-')
      .replace(/--+/g, '-')
      .substring(0, 30);
    
    if (!safeSenderName || safeSenderName.length < 2) {
      safeSenderName = 'support';
    }
    
    // Create a dynamic sender email from the verified domain
    const senderEmail = `${safeSenderName}@${verifiedDomain}`;
    
    // Use task title in subject or fallback
    const emailSubject = subject || `Re: ${task.title || 'Ihre Anfrage'}`;
    
    // Use the original from email as reply-to when available
    const replyToEmail = task.source === 'email' ? 
      (task.inbound_email?.from_email || task.endkunde_email) : null;
    
    // Prepare email request data
    const emailRequestData: any = {
      personalizations: [{
        to: [{ email: recipient_email }]
      }],
      from: { 
        email: senderEmail,
        name: task.customer?.name || 'Support'
      },
      subject: emailSubject,
      content: [{
        type: 'text/plain',
        value: body
      }]
    };
    
    // Add reply-to if available
    if (replyToEmail) {
      emailRequestData.reply_to = {
        email: replyToEmail,
        name: task.customer?.name || 'Support'
      };
    }
    
    // Add attachments if provided - FIXED IMPLEMENTATION
    if (attachments && attachments.length > 0) {
      const processedAttachments = [];
      
      for (const url of attachments) {
        try {
          console.log(`Processing attachment: ${url}`);
          
          // Get filename from URL first to use in error messages
          const filename = url.split('/').pop() || 'attachment';
          
          // Fetch the file from the URL
          const response = await fetch(url);
          if (!response.ok) {
            console.error(`Failed to fetch attachment ${filename}: ${response.statusText}`);
            continue;
          }
          
          // Use a safer approach to convert to Base64
          const arrayBuffer = await response.arrayBuffer();
          const bytes = new Uint8Array(arrayBuffer);
          
          // Convert to Base64 manually in chunks to avoid stack overflow
          let binary = '';
          const chunkSize = 10240; // Process in ~10KB chunks
          for (let i = 0; i < bytes.length; i += chunkSize) {
            const chunk = bytes.slice(i, Math.min(i + chunkSize, bytes.length));
            binary += String.fromCharCode.apply(null, chunk as unknown as number[]);
          }
          const base64Content = btoa(binary);
          
          // Determine content type based on file extension
          let contentType = 'application/octet-stream'; // Default
          const ext = filename.split('.').pop()?.toLowerCase();
          if (ext === 'pdf') contentType = 'application/pdf';
          else if (['jpg', 'jpeg'].includes(ext || '')) contentType = 'image/jpeg';
          else if (ext === 'png') contentType = 'image/png';
          // Add more file types as needed
          
          processedAttachments.push({
            content: base64Content,
            filename,
            type: contentType,
            disposition: 'attachment'
          });
          
          console.log(`Successfully processed attachment: ${filename}`);
        } catch (error) {
          console.error('Error processing attachment:', error.message);
        }
      }
      
      // Only add attachments if we successfully processed any
      if (processedAttachments.length > 0) {
        emailRequestData.attachments = processedAttachments;
        console.log(`Added ${processedAttachments.length} attachments to email`);
      }
    }
    
    // Send the email using SendGrid
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${sendgridApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(emailRequestData)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('SendGrid error:', errorText);
      throw new Error(`Failed to send email: ${errorText}`);
    }

    // Store the email thread in the database
    const { error: threadError } = await supabase
      .from('email_threads')
      .insert({
        task_id,
        subject: emailSubject,
        direction: 'outbound',
        sender: senderEmail,
        recipient: recipient_email,
        content: body,
        attachments: attachments || null
      });

    if (threadError) {
      console.error('Error storing email thread:', threadError);
      // We don't throw here because the email was already sent
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
