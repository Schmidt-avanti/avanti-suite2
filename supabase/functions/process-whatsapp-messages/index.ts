
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
    let accounts = null;
    
    // Alle WhatsApp-Konten abrufen - wir holen das einmal für alle Nachrichten
    const { data: accountsData, error: accountsError } = await supabase
      .from('whatsapp_accounts')
      .select('id, status, customer_id');
      
    if (accountsError) {
      console.error('Fehler beim Abrufen der WhatsApp-Konten:', accountsError);
    } else if (accountsData) {
      accounts = accountsData;
    } else {
      console.warn('Keine WhatsApp-Konten gefunden!');
    }
    
    // Jede Nachricht verarbeiten
    for (const msg of inboundMessages) {
      try {
        // Telefonnummer im WhatsApp-Format sicherstellen
        const formattedNumber = ensureWhatsappFormat(msg.from_number);
        
        // 1. Prüfen ob die Telefonnummer bereits einem Chat zugeordnet ist
        const { data: existingChats, error: chatError } = await supabase
          .from('whatsapp_chats')
          .select('*')
          .eq('contact_number', formattedNumber);
          
        if (chatError) throw chatError;
        
        let chatId;
        
        // 2. Wenn Chat existiert, diesen verwenden, sonst neuen Chat erstellen
        if (!existingChats || existingChats.length === 0) {
          console.log(`Erstelle neuen Chat für Nummer ${formattedNumber}`);
          
          // Nach aktivem Konto suchen
          let selectedAccount = null;
          
          if (accounts && accounts.length > 0) {
            // Zuerst aktive Konten bevorzugen
            const activeAccounts = accounts.filter(acc => acc.status === 'active');
            
            if (activeAccounts.length > 0) {
              selectedAccount = activeAccounts[0]; // Nimm erstes aktives Konto
              console.log(`Verwende aktives WhatsApp-Konto ${selectedAccount.id}`);
            } else {
              // Wenn kein aktives Konto vorhanden ist, nimm einfach das erste
              selectedAccount = accounts[0];
              console.log(`Kein aktives Konto gefunden, verwende Konto ${selectedAccount.id}`);
            }
          } else {
            console.error('Konnte kein WhatsApp-Konto zum Zuweisen finden');
            
            // Notfallplan: Suche direkt in der Datenbank nach irgendeinem Konto
            const { data: fallbackAccounts, error: fallbackError } = await supabase
              .from('whatsapp_accounts')
              .select('id')
              .limit(1);
              
            if (fallbackError || !fallbackAccounts || fallbackAccounts.length === 0) {
              results.push({ 
                from: formattedNumber, 
                status: 'error', 
                message: 'Kein WhatsApp-Konto verfügbar' 
              });
              continue; // Überspringe diese Nachricht
            }
            
            selectedAccount = fallbackAccounts[0];
            console.log(`Fallback: Verwende Konto ${selectedAccount.id}`);
          }
          
          // Formatiere den Kontaktnamen basierend auf der Nummer
          const contactName = formatContactName(formattedNumber);
          
          // Neuen Chat erstellen
          const { data: newChat, error: createChatError } = await supabase
            .from('whatsapp_chats')
            .insert({
              account_id: selectedAccount.id,
              contact_number: formattedNumber,
              contact_name: contactName,
              unread_count: 1,
              last_message: msg.body,
              last_message_time: msg.timestamp
            })
            .select('id')
            .single();
            
          if (createChatError) throw createChatError;
          chatId = newChat.id;
          
          console.log(`Neuer Chat mit ID ${chatId} erstellt für Nummer ${formattedNumber}`);
        } else {
          chatId = existingChats[0].id;
          console.log(`Bestehender Chat ${chatId} gefunden für Nummer ${formattedNumber}`);
          
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
        
        console.log(`Nachricht von ${formattedNumber} erfolgreich in Chat ${chatId} gespeichert`);
        
        // Optionale Bereinigung: Verarbeitete Nachricht aus der Inbound-Tabelle löschen
        await supabase.from('whatsapp_inbound_webhooks').delete().eq('id', msg.id);
        
        results.push({ from: formattedNumber, status: 'success', chat_id: chatId });
        
      } catch (err) {
        console.error(`Fehler bei der Verarbeitung von Nachricht von ${msg.from_number}:`, err);
        results.push({ 
          from: msg.from_number, 
          status: 'error', 
          message: err instanceof Error ? err.message : String(err) 
        });
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

// Hilfsfunktion um sicherzustellen, dass die Nummer das WhatsApp-Präfix hat
function ensureWhatsappFormat(phoneNumber: string): string {
  if (!phoneNumber.startsWith('whatsapp:')) {
    return `whatsapp:${phoneNumber}`;
  }
  return phoneNumber;
}
