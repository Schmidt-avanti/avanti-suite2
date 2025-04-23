
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.0";

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const twilioAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID')!;
const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN')!;
const twilioFromNumber = "+14155238886"; // Die Twilio-Sandbox-Nummer

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

serve(async (req) => {
  // CORS Preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { 
      status: 405, 
      headers: corsHeaders 
    });
  }

  try {
    const { to_number, message_body, chat_id } = await req.json();
    
    if (!to_number || !message_body || !chat_id) {
      return new Response(JSON.stringify({ error: 'Fehlende Parameter' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`Sende Nachricht an ${to_number}: ${message_body}`);

    // Format der Telefonnummer prüfen und formatieren
    let formattedNumber = to_number;
    if (!formattedNumber.startsWith('whatsapp:')) {
      formattedNumber = `whatsapp:${formattedNumber}`;
    }

    // Twilio API-Anfrage zum Senden der Nachricht
    const twilioEndpoint = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`;
    const twilioAuth = btoa(`${twilioAccountSid}:${twilioAuthToken}`);

    const formData = new URLSearchParams();
    formData.append('To', formattedNumber);
    formData.append('From', `whatsapp:${twilioFromNumber}`);
    formData.append('Body', message_body);

    const twilioResponse = await fetch(twilioEndpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${twilioAuth}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: formData
    });

    const twilioData = await twilioResponse.json();
    
    if (!twilioResponse.ok) {
      console.error('Twilio API Fehler:', twilioData);
      return new Response(JSON.stringify({ 
        error: 'Twilio Fehler', 
        details: twilioData
      }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    // Nachricht erfolgreich gesendet, jetzt in der Datenbank speichern
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
    
    const { error: dbError } = await supabase
      .from('whatsapp_messages')
      .insert({
        chat_id: chat_id,
        content: message_body,
        is_from_me: true,
        sent_at: new Date().toISOString()
      });

    if (dbError) {
      console.error('Fehler beim Speichern der Nachricht in der DB:', dbError);
      // Trotzdem als erfolgreich melden, da die Nachricht gesendet wurde
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message_sid: twilioData.sid,
      twilioResponse: twilioData
    }), { 
      status: 200, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
    
  } catch (err) {
    console.error('Unerwarteter Fehler:', err);
    return new Response(JSON.stringify({ 
      error: 'Unerwarteter Fehler', 
      message: err instanceof Error ? err.message : String(err) 
    }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }
});
