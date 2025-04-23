
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

  try {
    console.log("Trigger-Webhook: Starte manuellen Aufruf der Nachrichtenverarbeitung");
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
    
    // Prüfen ob unverarbeitete Nachrichten vorliegen
    const { count, error: countError } = await supabase
      .from("whatsapp_inbound_webhooks")
      .select("*", { count: 'exact', head: true });
    
    if (countError) {
      console.error("Fehler beim Zählen der Nachrichten:", countError);
    } else {
      console.log(`${count || 0} unverarbeitete Nachrichten gefunden`);
    }
    
    // Rufe den process-whatsapp-messages Endpunkt auf
    const { data, error } = await supabase.functions.invoke('process-whatsapp-messages');
    
    if (error) {
      console.error("Fehler beim Aufrufen des process-whatsapp-messages Endpunkts:", error);
      throw error;
    }
    
    console.log("Nachrichtenverarbeitung erfolgreich ausgelöst");
    
    return new Response(JSON.stringify(data), { 
      status: 200, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  } catch (err) {
    console.error('Fehler beim Triggern der Nachrichtenverarbeitung:', err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }
});
