
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.0";

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Nur POST-Requests akzeptieren
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405, headers: corsHeaders });
  }

  try {
    // Supabase Client erstellen
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    // Form-urlencoded Daten parsen
    const formData = await req.formData();
    const fromNumber = formData.get('From') as string;
    const body = formData.get('Body') as string;

    console.log(`Webhook received from: ${fromNumber}, body: ${body}`);

    // Validierung
    if (!fromNumber || !body) {
      console.error('Missing required parameters in webhook data');
      return new Response('Missing required parameters', { 
        status: 400, 
        headers: corsHeaders 
      });
    }

    // In Datenbank speichern
    const { data, error } = await supabase
      .from('whatsapp_inbound_webhooks')
      .insert({ 
        from_number: fromNumber, 
        body: body 
      });

    if (error) {
      console.error('Error inserting webhook data:', error);
      throw error;
    }

    console.log('Message successfully saved to whatsapp_inbound_webhooks');

    // Optional: Direkt den process-whatsapp-messages Endpunkt aufrufen
    try {
      const { error: processingError } = await supabase.functions.invoke('process-whatsapp-messages');
      if (processingError) {
        console.warn('Warning: Auto-processing failed:', processingError);
      } else {
        console.log('Auto-processing of message triggered successfully');
      }
    } catch (processErr) {
      console.warn('Warning: Could not auto-process message:', processErr);
    }

    // Erfolgreiche Antwort an Twilio
    return new Response('Message received', { 
      status: 200, 
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/plain'
      } 
    });

  } catch (err) {
    console.error('Webhook Error:', err);
    return new Response(JSON.stringify({ error: err.message }), { 
      status: 500, 
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      } 
    });
  }
});
