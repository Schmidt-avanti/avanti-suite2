
// supabase/functions/twilio-voice-webhook/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import twilio from 'https://esm.sh/twilio@4.19.0';
import { VoiceResponse } from 'https://esm.sh/twilio@4.19.0/lib/twiml/VoiceResponse';

// This endpoint needs to be public to receive webhooks from Twilio
serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': '*',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse form data from Twilio
    const formData = await req.formData();
    const twilioParams = Object.fromEntries(formData.entries());
    console.log('Received Twilio webhook:', twilioParams);

    // Initialize Twilio tools
    const twiml = new VoiceResponse();
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Get Twilio credentials
    const TWILIO_WORKSPACE_SID = Deno.env.get('TWILIO_WORKSPACE_SID')!;
    const TWILIO_WORKFLOW_SID = Deno.env.get('TWILIO_WORKFLOW_SID')!;
    const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID')!;
    const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN')!;
    
    // Check if this is an incoming or outgoing call
    const direction = twilioParams.Direction || 'inbound';
    
    // Get the caller's phone number
    const from = twilioParams.From;
    const to = twilioParams.To;
    
    let customerInfo = null;
    let endkundeInfo = null;
    let twilioPhoneInfo = null;

    // First, try to identify the customer based on the called number (To)
    if (to) {
      const { data: phoneNumberData, error: phoneNumberError } = await supabase
        .from('twilio_phone_numbers')
        .select('*, customer:customer_id(*)')
        .eq('phone_number', to)
        .maybeSingle();
        
      if (!phoneNumberError && phoneNumberData) {
        twilioPhoneInfo = phoneNumberData;
        customerInfo = phoneNumberData.customer;
        
        console.log('Identified customer from phone number:', customerInfo.name);
      } else if (phoneNumberError) {
        console.error('Error finding phone number in database:', phoneNumberError);
      }
    }
    
    // If we didn't find the customer by the called number, try the legacy methods
    if (!customerInfo && from) {
      // Clean the phone number for comparison (remove spaces, etc.)
      const cleanedPhone = from.replace(/\s+/g, '');
      
      // First check endkunden
      const { data: endkundeData } = await supabase
        .from('endkunden')
        .select('*, customer_ID')
        .ilike('Adresse', `%${cleanedPhone}%`)
        .limit(1);
        
      if (endkundeData && endkundeData.length > 0) {
        endkundeInfo = endkundeData[0];
        
        // If endkunde found, get their customer
        if (endkundeInfo.customer_ID) {
          const { data: customerData } = await supabase
            .from('customers')
            .select('*')
            .eq('id', endkundeInfo.customer_ID)
            .single();
            
          if (customerData) {
            customerInfo = customerData;
          }
        }
      }
      
      // If no endkunde found, try customers directly
      if (!customerInfo) {
        const { data: directCustomerData } = await supabase
          .from('customers')
          .select('*')
          .or(`phone.ilike.%${cleanedPhone}%,contact_person.ilike.%${cleanedPhone}%`)
          .limit(1);
          
        if (directCustomerData && directCustomerData.length > 0) {
          customerInfo = directCustomerData[0];
        }
      }
    }
    
    // Initialize Twilio client for TaskRouter
    const client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
    
    // Find available agents (workers)
    const workers = await client.taskrouter.v1
      .workspaces(TWILIO_WORKSPACE_SID)
      .workers
      .list({ available: true });
    
    // Filter workers to find those assigned to this customer if we have a customer
    let assignedWorkers = workers;
    if (customerInfo?.id) {
      const { data: assignments } = await supabase
        .from('user_customer_assignments')
        .select('user_id')
        .eq('customer_id', customerInfo.id);
        
      if (assignments && assignments.length > 0) {
        const assignedUserIds = assignments.map(a => a.user_id);
        assignedWorkers = workers.filter(worker => {
          try {
            const attributes = JSON.parse(worker.attributes);
            return assignedUserIds.includes(attributes.user_id);
          } catch (e) {
            return false;
          }
        });
        
        // If no assigned workers are available, fall back to all available workers
        if (assignedWorkers.length === 0) {
          assignedWorkers = workers;
        }
      }
    }
    
    if (assignedWorkers.length === 0) {
      // No available workers, send to voicemail
      twiml.say({ voice: 'alice', language: 'de-DE' }, 
        'Derzeit sind alle Mitarbeiter beschäftigt. Bitte hinterlassen Sie eine Nachricht nach dem Signalton.');
      twiml.record({
        action: `${supabaseUrl}/functions/v1/twilio-voicemail-handler`,
        transcribe: true,
        maxLength: 120,
        playBeep: true,
        timeout: 5
      });
      twiml.hangup();
    } else {
      // Create a task for this call
      const taskAttributes = {
        direction,
        call_sid: twilioParams.CallSid,
        from: from,
        to: to,
        customer_id: customerInfo?.id,
        endkunde_id: endkundeInfo?.id,
        twilio_phone_number_id: twilioPhoneInfo?.id,
        customer_name: customerInfo?.name || 'Unknown Customer',
        endkunde_name: endkundeInfo ? `${endkundeInfo.Vorname || ''} ${endkundeInfo.Nachname || ''}`.trim() : null,
        call_type: 'voice'
      };
      
      await client.taskrouter.v1
        .workspaces(TWILIO_WORKSPACE_SID)
        .tasks
        .create({
          workflowSid: TWILIO_WORKFLOW_SID,
          attributes: JSON.stringify(taskAttributes)
        });
      
      // Create an entry in the call_sessions table
      await supabase
        .from('call_sessions')
        .insert({
          call_sid: twilioParams.CallSid,
          status: 'ringing',
          direction: direction,
          started_at: new Date().toISOString(),
          customer_id: customerInfo?.id || null,
          endkunde_id: endkundeInfo?.id || null,
          endkunde_phone: from,
          twilio_phone_number_id: twilioPhoneInfo?.id
        });
      
      // Place the caller in a queue with a customized greeting
      let greeting = 'Willkommen bei Avanti. Bitte warten Sie, während wir Sie mit dem nächsten verfügbaren Mitarbeiter verbinden.';
      
      if (customerInfo?.name) {
        greeting = `Willkommen bei ${customerInfo.name}. Bitte warten Sie, während wir Sie mit dem nächsten verfügbaren Mitarbeiter verbinden.`;
      }
      
      twiml.say({ voice: 'alice', language: 'de-DE' }, greeting);
      twiml.enqueue({
        workflowSid: TWILIO_WORKFLOW_SID,
      }, twilioParams.CallSid);
    }
    
    return new Response(twiml.toString(), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/xml'
      }
    });
    
  } catch (error) {
    console.error('Error handling voice webhook:', error);
    
    // Return a basic TwiML response even in case of error
    const twiml = new VoiceResponse();
    twiml.say(
      { voice: 'alice', language: 'de-DE' },
      'Es tut uns leid, es gab ein Problem mit Ihrem Anruf. Bitte versuchen Sie es später erneut.'
    );
    twiml.hangup();
    
    return new Response(twiml.toString(), {
      headers: {
        'Content-Type': 'text/xml',
        ...corsHeaders
      }
    });
  }
});
