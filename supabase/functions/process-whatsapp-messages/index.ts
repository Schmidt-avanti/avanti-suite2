
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
    console.log("Starte Verarbeitung von WhatsApp-Nachrichten");
    
    // Supabase Client erstellen
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
    
    // Holen der unverarbeiteten WhatsApp-Nachrichten
    const { data: inboundMessages, error: fetchError } = await supabase
      .from('whatsapp_inbound_webhooks')
      .select('*')
      .order('timestamp', { ascending: true });
      
    if (fetchError) {
      console.error("Fehler beim Abrufen der eingehenden Nachrichten:", fetchError);
      throw fetchError;
    }
    
    if (!inboundMessages || inboundMessages.length === 0) {
      console.log("Keine neuen Nachrichten zu verarbeiten");
      return new Response(JSON.stringify({ message: 'Keine neuen Nachrichten zu verarbeiten' }), { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }
    
    console.log(`${inboundMessages.length} neue WhatsApp Nachricht(en) gefunden`);
    
    const results = [];
    let accounts = null;
    
    // Alle WhatsApp-Konten abrufen - wir holen das einmal für alle Nachrichten
    const { data: accountsData, error: accountsError } = await supabase
      .from('whatsapp_accounts')
      .select('id, status, customer_id')
      .eq('status', 'active');
      
    if (accountsError) {
      console.error('Fehler beim Abrufen der WhatsApp-Konten:', accountsError);
    } else if (accountsData && accountsData.length > 0) {
      accounts = accountsData;
      console.log(`${accountsData.length} aktive WhatsApp-Konten gefunden`);
    } else {
      console.warn('Keine aktiven WhatsApp-Konten gefunden!');
      
      // Noch einmal versuchen, aber ohne den Status-Filter
      const { data: fallbackAccountData, error: fallbackAccountError } = await supabase
        .from('whatsapp_accounts')
        .select('id, status, customer_id');
        
      if (fallbackAccountError) {
        console.error('Fehler beim Abrufen aller WhatsApp-Konten:', fallbackAccountError);
      } else if (fallbackAccountData && fallbackAccountData.length > 0) {
        accounts = fallbackAccountData;
        console.log(`${fallbackAccountData.length} WhatsApp-Konten (inklusive inaktive) gefunden`);
      } else {
        console.error('Überhaupt keine WhatsApp-Konten in der Datenbank gefunden!');
      }
    }
    
    // Wenn wir immer noch keine Konten haben, erstellen wir ein Standardkonto
    if (!accounts || accounts.length === 0) {
      console.log('Kein WhatsApp-Konto gefunden. Erstelle ein Standard-Konto für eingehende Nachrichten.');
      
      try {
        const { data: newAccount, error: createError } = await supabase
          .from('whatsapp_accounts')
          .insert({
            name: 'Default WhatsApp Account',
            status: 'active'
          })
          .select('id, status, customer_id')
          .single();
          
        if (createError) {
          console.error('Fehler beim Erstellen des Standard-Kontos:', createError);
        } else if (newAccount) {
          accounts = [newAccount];
          console.log(`Standard-Konto mit ID ${newAccount.id} erstellt`);
        }
      } catch (err) {
        console.error('Unerwarteter Fehler beim Erstellen des Standard-Kontos:', err);
      }
    }
    
    // Jede Nachricht verarbeiten
    for (const msg of inboundMessages) {
      try {
        console.log(`Verarbeite Nachricht von ${msg.from_number}`);
        
        // Telefonnummer im WhatsApp-Format sicherstellen
        const formattedNumber = ensureWhatsappFormat(msg.from_number);
        
        // 1. Prüfen ob die Telefonnummer bereits einem Chat zugeordnet ist
        const { data: existingChats, error: chatError } = await supabase
          .from('whatsapp_chats')
          .select('*')
          .eq('contact_number', formattedNumber);
          
        if (chatError) {
          console.error(`Fehler beim Suchen existierender Chats für ${formattedNumber}:`, chatError);
          throw chatError;
        }
        
        let chatId;
        
        // 2. Wenn Chat existiert, diesen verwenden, sonst neuen Chat erstellen
        if (!existingChats || existingChats.length === 0) {
          console.log(`Kein bestehender Chat für Nummer ${formattedNumber} gefunden, erstelle einen neuen`);
          
          // Default account fallback
          let selectedAccount = null;
          
          if (accounts && accounts.length > 0) {
            selectedAccount = accounts[0]; // Nimm das erste verfügbare Konto
            console.log(`Verwende WhatsApp-Konto ${selectedAccount.id}`);
          } else {
            console.error('KRITISCH: Konnte kein WhatsApp-Konto zum Zuweisen finden, obwohl wir eins erstellt haben sollten');
            throw new Error('Kein WhatsApp-Konto verfügbar');
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
            
          if (createChatError) {
            console.error(`Fehler beim Erstellen eines neuen Chats für ${formattedNumber}:`, createChatError);
            throw createChatError;
          }
          
          chatId = newChat.id;
          console.log(`Neuer Chat mit ID ${chatId} erstellt für Nummer ${formattedNumber}`);
        } else {
          chatId = existingChats[0].id;
          console.log(`Bestehender Chat ${chatId} gefunden für Nummer ${formattedNumber}`);
          
          // Unread count und letzten Nachrichten aktualisieren
          const { error: updateError } = await supabase
            .from('whatsapp_chats')
            .update({
              last_message: msg.body,
              last_message_time: msg.timestamp,
              unread_count: existingChats[0].unread_count + 1
            })
            .eq('id', chatId);
            
          if (updateError) {
            console.error(`Fehler beim Aktualisieren des Chats ${chatId}:`, updateError);
            throw updateError;
          }
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
          
        if (insertError) {
          console.error(`Fehler beim Einfügen der Nachricht in Chat ${chatId}:`, insertError);
          throw insertError;
        }
        
        console.log(`Nachricht von ${formattedNumber} erfolgreich in Chat ${chatId} gespeichert`);
        
        // Optionale Bereinigung: Verarbeitete Nachricht aus der Inbound-Tabelle löschen
        const { error: deleteError } = await supabase
          .from('whatsapp_inbound_webhooks')
          .delete()
          .eq('id', msg.id);
          
        if (deleteError) {
          console.warn(`Konnte verarbeitete Nachricht ${msg.id} nicht löschen:`, deleteError);
        }
        
        results.push({ 
          from: formattedNumber, 
          status: 'success', 
          chat_id: chatId 
        });
        
      } catch (err) {
        console.error(`Fehler bei der Verarbeitung von Nachricht von ${msg.from_number}:`, err);
        results.push({ 
          from: msg.from_number, 
          status: 'error', 
          message: err instanceof Error ? err.message : String(err) 
        });
      }
    }
    
    console.log(`Verarbeitung abgeschlossen: ${results.length} Nachrichten verarbeitet`);
    
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
