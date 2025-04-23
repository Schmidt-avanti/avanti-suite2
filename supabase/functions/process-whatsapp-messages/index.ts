
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
    // Supabase Client erstellen
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
    
    // Holen der unverarbeiteten WhatsApp-Nachrichten
    const { data: inboundMessages, error: fetchError } = await supabase
      .from('whatsapp_inbound_webhooks')
      .select('*')
      .order('timestamp', { ascending: true });
      
    if (fetchError) throw fetchError;
    
    if (!inboundMessages || inboundMessages.length === 0) {
      return new Response(JSON.stringify({ message: 'Keine neuen Nachrichten zu verarbeiten' }), { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }
    
    console.log(`${inboundMessages.length} neue WhatsApp Nachrichten gefunden`);
    
    const results = [];
    
    // Jede Nachricht verarbeiten
    for (const msg of inboundMessages) {
      try {
        // 1. Prüfen ob die Telefonnummer bereits einem Chat zugeordnet ist
        const { data: existingChats, error: chatError } = await supabase
          .from('whatsapp_chats')
          .select('*')
          .eq('contact_number', msg.from_number);
          
        if (chatError) throw chatError;
        
        let chatId;
        
        // 2. Wenn Chat existiert, diesen verwenden, sonst neuen Chat erstellen
        if (!existingChats || existingChats.length === 0) {
          console.log(`Erstelle neuen Chat für Nummer ${msg.from_number}`);
          
          // Alle WhatsApp-Konten abrufen
          const { data: accounts, error: accountError } = await supabase
            .from('whatsapp_accounts')
            .select('id')
            .eq('status', 'active')  // Nur aktive Accounts verwenden
            .limit(1);  // Einfachste Lösung: Nimm das erste aktive Konto
            
          if (accountError) throw accountError;
          
          if (!accounts || accounts.length === 0) {
            console.error('Kein aktives WhatsApp-Konto gefunden, um Chat zuzuordnen');
            
            // Fallback: Wenn kein aktives Konto vorhanden ist, nimm einfach irgendein Konto
            const { data: anyAccounts, error: anyAccountError } = await supabase
              .from('whatsapp_accounts')
              .select('id')
              .limit(1);
              
            if (anyAccountError || !anyAccounts || anyAccounts.length === 0) {
              results.push({ 
                from: msg.from_number, 
                status: 'error', 
                message: 'Kein WhatsApp-Konto verfügbar' 
              });
              continue;
            }
            
            // Verwende das erste verfügbare Konto (auch wenn nicht aktiv)
            accounts = anyAccounts;
          }
          
          // Formatiere den Kontaktnamen basierend auf der Nummer
          const contactName = formatContactName(msg.from_number);
          
          // Neuen Chat erstellen
          const { data: newChat, error: createChatError } = await supabase
            .from('whatsapp_chats')
            .insert({
              account_id: accounts[0].id,
              contact_number: msg.from_number,
              contact_name: contactName,
              unread_count: 1,
              last_message: msg.body,
              last_message_time: msg.timestamp
            })
            .select('id')
            .single();
            
          if (createChatError) throw createChatError;
          chatId = newChat.id;
          
          console.log(`Neuer Chat mit ID ${chatId} erstellt für Nummer ${msg.from_number}`);
        } else {
          chatId = existingChats[0].id;
          console.log(`Bestehender Chat ${chatId} gefunden für Nummer ${msg.from_number}`);
          
          // Unread count und letzten Nachrichten aktualisieren
          await supabase
            .from('whatsapp_chats')
            .update({
              last_message: msg.body,
              last_message_time: msg.timestamp,
              unread_count: existingChats[0].unread_count + 1
            })
            .eq('id', chatId);
        }
        
        // 3. Die Nachricht in der whatsapp_messages Tabelle speichern
        const { error: insertError } = await supabase
          .from('whatsapp_messages')
          .insert({
            chat_id: chatId,
            content: msg.body,
            is_from_me: false,
            sent_at: msg.timestamp
          });
          
        if (insertError) throw insertError;
        
        console.log(`Nachricht von ${msg.from_number} erfolgreich in Chat ${chatId} gespeichert`);
        
        // Optionale Bereinigung: Verarbeitete Nachricht aus der Inbound-Tabelle löschen
        // await supabase.from('whatsapp_inbound_webhooks').delete().eq('id', msg.id);
        
        results.push({ from: msg.from_number, status: 'success', chat_id: chatId });
        
      } catch (err) {
        console.error(`Fehler bei der Verarbeitung von Nachricht von ${msg.from_number}:`, err);
        results.push({ from: msg.from_number, status: 'error', message: err instanceof Error ? err.message : String(err) });
      }
    }
    
    return new Response(JSON.stringify({
      processed: results.length,
      successful: results.filter(r => r.status === 'success').length,
      failed: results.filter(r => r.status === 'error').length,
      results
    }), { 
      status: 200, 
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'application/json' 
      } 
    });

  } catch (err) {
    console.error('Allgemeiner Fehler bei der Nachrichtenverarbeitung:', err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }
});

// Hilfsfunktion zur Formatierung des Kontaktnamens
function formatContactName(phoneNumber: string): string {
  // Entferne WhatsApp-Präfix, falls vorhanden
  let formattedNumber = phoneNumber.replace('whatsapp:', '');
  
  // Füge "WhatsApp Kontakt" als Präfix hinzu
  return `WhatsApp Kontakt ${formattedNumber}`;
}
