
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Formats a chat message for inclusion in an email.
 * Handles different message formats (JSON or plain text).
 */
function formatChatMessage(message) {
  if (!message || !message.content) return '';
  
  try {
    // Try to parse the content as JSON
    const parsedContent = JSON.parse(message.content);
    // Return just the text part without the options
    return parsedContent.text || message.content;
  } catch (e) {
    // Not valid JSON, return as is
    return message.content;
  }
}

/**
 * Formats the chat history into a readable email format
 */
function formatChatHistory(messages) {
  if (!messages || messages.length === 0) return '';
  
  let formattedHistory = '\n\n---------- Chat-Verlauf ----------\n\n';
  
  messages.forEach(message => {
    const role = message.role === 'assistant' ? 'Ava' : 'Kunde';
    // Format the content properly
    const content = formatChatMessage(message);
    formattedHistory += `${role}: ${content}\n\n`;
  });
  
  return formattedHistory;
}

/**
 * Processes attachments and returns an array of valid SendGrid attachment objects
 */
async function processAttachments(attachments) {
  if (!attachments || attachments.length === 0) return [];
  
  const processedAttachments = await Promise.all(attachments.map(async (url) => {
    try {
      // Fetch the file from the URL
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Failed to fetch attachment: ${response.statusText}`);
      
      const buffer = await response.arrayBuffer();
      const base64Content = btoa(String.fromCharCode(...new Uint8Array(buffer)));
      
      // Get filename from URL
      const filename = url.split('/').pop() || 'attachment';
      
      // Determine content type based on file extension
      let contentType = 'application/octet-stream'; // Default
      const ext = filename.split('.').pop()?.toLowerCase();
      if (ext === 'pdf') contentType = 'application/pdf';
      else if (['jpg', 'jpeg'].includes(ext || '')) contentType = 'image/jpeg';
      else if (ext === 'png') contentType = 'image/png';
      else if (ext === 'gif') contentType = 'image/gif';
      else if (ext === 'doc') contentType = 'application/msword';
      else if (ext === 'docx') contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      else if (ext === 'xls') contentType = 'application/vnd.ms-excel';
      else if (ext === 'xlsx') contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      
      return {
        content: base64Content,
        filename,
        type: contentType,
        disposition: 'attachment'
      };
    } catch (error) {
      console.error('Error processing attachment:', error);
      return null;
    }
  }));
  
  // Filter out null attachments (failed to process)
  return processedAttachments.filter(att => att !== null);
}

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

    // Get the customer name for sender display and formatting
    const customerName = task.customer?.name || "avanti-suite";
    const originalEmail = task.source === 'email' 
      ? (task.inbound_email?.from_email || task.endkunde_email)
      : null;
      
    console.log('Original from email:', originalEmail);
    console.log('Customer name:', customerName);
    console.log('Sending email to:', recipient_email);

    // Get the SendGrid API key
    const sendgridApiKey = Deno.env.get('SENDGRID_API_KEY');
    if (!sendgridApiKey) {
      throw new Error('SENDGRID_API_KEY environment variable is not set');
    }

    // Get the verified domain or fallback to a default
    const verifiedDomain = Deno.env.get('SENDGRID_VERIFIED_DOMAIN') || 'inbox.avanti.cx';
    
    // Create a safe sender name by removing special characters and spaces
    // This will be used as the local part of the email address
    let safeSenderName = customerName
      .toLowerCase()
      .replace(/[^\w.-]/g, '-') // Replace any non-word chars with hyphens
      .replace(/--+/g, '-')     // Replace multiple hyphens with single hyphen
      .substring(0, 30);        // Limit length
    
    if (!safeSenderName || safeSenderName.length < 2) {
      safeSenderName = 'customer';
    }
    
    // Create a dynamic sender email from the verified domain
    const dynamicSenderEmail = `${safeSenderName}@${verifiedDomain}`;
    
    // Fallback to a static verified sender if needed
    const fallbackSenderEmail = Deno.env.get('SENDGRID_VERIFIED_SENDER') || `noreply@${verifiedDomain}`;
    
    // Use the dynamic sender if domain is verified, otherwise use fallback
    const senderEmail = dynamicSenderEmail;
    
    console.log('Using sender email:', senderEmail);
    
    // Use task title in subject or fallback
    const emailSubject = subject || `Re: ${task.title || 'Ihre Anfrage'}`;
    
    // Add reply-to header with customer original email
    const replyToEmail = originalEmail || fallbackSenderEmail;
    
    // Fetch task messages if we need to include chat history
    let taskMessages = [];
    if (body.includes('Chat-Verlauf')) {
      const { data: messages } = await supabase
        .from('task_messages')
        .select('*')
        .eq('task_id', task_id)
        .order('created_at', { ascending: true });
      
      taskMessages = messages || [];
    }

    // Process any attachments
    const validAttachments = await processAttachments(attachments);
    
    // Prepare email content
    let emailBody = body;
    
    // Replace chat history placeholder with properly formatted history if needed
    if (body.includes('Chat-Verlauf') && taskMessages.length > 0) {
      emailBody = body.replace(/---------- Chat-Verlauf ----------(\s|\S)*/, formatChatHistory(taskMessages));
    }
    
    // Prepare email request data
    const emailRequestData = {
      personalizations: [{
        to: [{ email: recipient_email }]
      }],
      from: { 
        email: senderEmail,
        name: customerName 
      },
      reply_to: {
        email: replyToEmail,
        name: customerName
      },
      subject: emailSubject,
      content: [{
        type: 'text/plain',
        value: emailBody
      }]
    };
    
    // Only add attachments field if we have valid attachments
    if (validAttachments.length > 0) {
      emailRequestData.attachments = validAttachments;
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

    // Log success response
    console.log('SendGrid response status:', response.status);

    // Update task history with sent email
    const { error: historyError } = await supabase
      .from('task_messages')
      .insert({
        task_id,
        role: 'user',
        content: `Email gesendet an ${recipient_email}: ${subject ? `Betreff: ${subject} - ` : ''}${body.substring(0, 100)}${body.length > 100 ? '...' : ''}`,
      });

    if (historyError) {
      console.error('Error logging email history:', historyError);
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
