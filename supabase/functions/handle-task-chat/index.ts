
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper function to implement exponential backoff
async function fetchWithRetry(url: string, options: RequestInit, maxRetries = 3) {
  let retries = 0;
  let lastError;

  while (retries < maxRetries) {
    try {
      const response = await fetch(url, options);
      const data = await response.json();
      
      // If we hit rate limits, wait and retry
      if (response.status === 429) {
        const retryAfterStr = data?.error?.message?.match(/try again in (\d+\.\d+)s/i)?.[1];
        const retryAfter = retryAfterStr ? parseFloat(retryAfterStr) * 1000 : (2 ** retries) * 1000;
        console.log(`Rate limited. Retrying after ${retryAfter}ms`);
        await new Promise(resolve => setTimeout(resolve, retryAfter));
        retries++;
        continue;
      }
      
      if (!response.ok) {
        throw new Error(`API error: ${data.error?.message || JSON.stringify(data)}`);
      }
      
      return data;
    } catch (error) {
      lastError = error;
      // Only retry on rate limit errors
      if (error.message?.includes('rate limit')) {
        const retryAfterStr = error.message.match(/try again in (\d+\.\d+)s/i)?.[1];
        const retryAfter = retryAfterStr ? parseFloat(retryAfterStr) * 1000 : (2 ** retries) * 1000;
        console.log(`Rate limited. Retrying after ${retryAfter}ms`);
        await new Promise(resolve => setTimeout(resolve, retryAfter));
        retries++;
      } else {
        throw error; // Don't retry other errors
      }
    }
  }

  throw lastError || new Error('Max retries exceeded');
}

// Format the assistant's response to ensure it's always valid JSON with text and options
function formatAssistantResponse(content: string): string {
  try {
    // First, check if it's already valid JSON with text and options
    const parsed = JSON.parse(content);
    if (typeof parsed === 'object' && 'text' in parsed) {
      return content; // Already formatted correctly
    }
  } catch (e) {
    // Not valid JSON, continue to formatting
  }

  // Check for option patterns in the text
  const optionsPattern = /\[(.*?)\]/g;
  const matches = content.match(optionsPattern);
  
  if (matches && matches.length > 0) {
    try {
      // Extract options from the text
      const optionsText = matches[0];
      const optionsList = optionsText
        .replace(/[\[\]"]/g, '')
        .split(',')
        .map(option => option.trim());
      
      // Format as JSON
      return JSON.stringify({
        text: content,
        options: optionsList
      });
    } catch (e) {
      console.error("Error formatting options:", e);
    }
  }
  
  // For the specific "Schlüssel verloren" case, add default options
  if (content.toLowerCase().includes('schlüssel') && 
      (content.toLowerCase().includes('verloren') || content.toLowerCase().includes('art von schlüssel'))) {
    return JSON.stringify({
      text: content,
      options: ["Hausschlüssel", "Wohnungsschlüssel", "Briefkastenschlüssel"]
    });
  }
  
  // If no options found or processing failed, return simple JSON format
  return JSON.stringify({
    text: content,
    options: []
  });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      taskId, 
      useCaseId, 
      message, 
      buttonChoice, 
      previousResponseId, 
      selectedOptions = [],
      isAutoInitialization = false 
    } = await req.json();

    console.log("Request received:", { 
      taskId, 
      useCaseId, 
      message: message ? "provided" : "empty", 
      buttonChoice,
      isAutoInitialization 
    });

    // Prüfen, ob eine Task-ID vorhanden ist
    if (!taskId) {
      throw new Error('Task ID is required');
    }

    const openAIApiKey = Deno.env.get('OPENAI_API_KEY')!;
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Prüfen, ob es bereits Nachrichten gibt
    const { data: existingMessages, error: messagesError } = await supabase
      .from('task_messages')
      .select('*')
      .eq('task_id', taskId)
      .order('created_at', { ascending: true });
    
    if (messagesError) throw messagesError;

    // Task-Daten abrufen
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .select('*, messages:task_messages(*), customer:customers(*)')
      .eq('id', taskId)
      .maybeSingle();

    if (taskError) throw taskError;
    if (!task) throw new Error('Task not found');

    // Wenn es bereits Nachrichten gibt und es sich um eine automatische Initiierung handelt, dann nichts tun
    const hasAssistantMessages = existingMessages && existingMessages.some(msg => msg.role === 'assistant');
    
    if (hasAssistantMessages && isAutoInitialization) {
      console.log("Task already has assistant messages, skipping auto-initialization");
      return new Response(
        JSON.stringify({
          message: "Task already has messages, no auto-initialization needed"
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use Case abrufen, wenn vorhanden
    let useCase = null;
    if (useCaseId) {
      const { data: fetchedUseCase, error: useCaseError } = await supabase
        .from('use_cases')
        .select('*')
        .eq('id', useCaseId)
        .maybeSingle();
        
      if (useCaseError) throw useCaseError;
      useCase = fetchedUseCase;
    }

    // Endkunde-Daten abrufen, wenn vorhanden
    let endkundeData = null;
    if (task.endkunde_id) {
      const { data: fetchedEndkunde, error: endkundeError } = await supabase
        .from('endkunden')
        .select('*')
        .eq('id', task.endkunde_id)
        .maybeSingle();
        
      if (endkundeError) throw endkundeError;
      endkundeData = fetchedEndkunde;
    }

    // Nachrichten abrufen
    const { data: messages, error: messagesError2 } = await supabase
      .from('task_messages')
      .select('*')
      .eq('task_id', taskId)
      .order('created_at', { ascending: true });

    if (messagesError2) throw messagesError2;

    let conversationMessages = [];
    
    // Create a system message with information about already selected options
    let systemPrompt = `Du bist die digitale Assistentin bei avanti-suite und hilfst bei Kundenanfragen.
WICHTIG: Stell dich niemals persönlich mit Namen vor. Formuliere keine Sätze wie "Mein Name ist..." oder "Ich bin Ava...". 
Beginne stattdessen sofort mit der Hauptinformation oder Frage, ohne Begrüßung wie "Guten Tag" oder "Hallo".

WICHTIG: Sprich den Kunden immer direkt an. Verwende "Sie" und "Ihre" für den Kunden, nicht "der Kunde" oder den Namen des Kunden in der dritten Person.
Beispiel: Sage "Wie Ihre Bestellung versendet wird" und NICHT "wie die Bestellung von Herr/Frau X versendet wird".
Nutze nur die direkte Anrede.`;
    
    // Add endkunde information to the system prompt if available
    if (endkundeData) {
      systemPrompt += `\n\nEin Endkunde ist bereits ausgewählt. Hier sind die Daten:
      Vorname: ${endkundeData.Vorname || 'Nicht angegeben'}
      Nachname: ${endkundeData.Nachname}
      Adresse: ${endkundeData.Adresse}
      PLZ: ${endkundeData.Postleitzahl}
      Ort: ${endkundeData.Ort}
      ${endkundeData.Gebäude ? `Gebäude: ${endkundeData.Gebäude}` : ''}
      ${endkundeData.Wohnung ? `Wohnung: ${endkundeData.Wohnung}` : ''}
      ${endkundeData.Lage ? `Lage: ${endkundeData.Lage}` : ''}
      
WICHTIG: Frage NICHT erneut nach dem Namen oder der Adresse des Endkunden, da diese Informationen bereits bekannt sind. 
Gehe direkt zum Kern des Problems über. Solltest du dennoch spezifischere Informationen zur Wohnung oder zum Gebäude benötigen, 
die nicht in den angegebenen Daten enthalten sind, kannst du gezielt danach fragen.`;
    }
    
    if (useCase) {
      systemPrompt += `\n\nFolge diesem Use Case für die Aufgabe:
      Titel: ${useCase.title}
      Typ: ${useCase.type}
      Benötigte Informationen: ${useCase.information_needed || 'Keine spezifischen Informationen benötigt'}
      Schritte: ${useCase.steps || 'Keine spezifischen Schritte definiert'}
      ${useCase.process_map ? `\nFolge diesen Prozessschritten:\n${JSON.stringify(useCase.process_map, null, 2)}` : ''}`;
      
      // Bei automatischer Initiierung oder wenn noch keine Optionen ausgewählt wurden
      if (isAutoInitialization || selectedOptions.length === 0) {
        systemPrompt += `\n\nKomm direkt zum Punkt, OHNE BEGRÜSSUNG wie "Guten Tag" oder "Hallo". Beginne mit einer kurzen Frage zum Use Case.
        
        Bei "Schlüssel verloren" biete folgende Optionen an:
        ["Hausschlüssel", "Wohnungsschlüssel", "Briefkastenschlüssel"]
        
        Bei "Bestellung stornieren" frage zuerst nach der Bestellnummer oder einem anderen eindeutigen Identifikator.`;
      }
      
      if (selectedOptions.includes("Hausschlüssel")) {
        systemPrompt += `\n\nDer Kunde hat "Hausschlüssel" gewählt. Frage nach der Anzahl der Schlüssel.`;
      } else if (selectedOptions.includes("Wohnungsschlüssel")) {
        systemPrompt += `\n\nDer Kunde hat "Wohnungsschlüssel" gewählt. Frage nach der Wohnungsnummer.`;
      } else if (selectedOptions.includes("Briefkastenschlüssel")) {
        systemPrompt += `\n\nDer Kunde hat "Briefkastenschlüssel" gewählt. Frage nach der Briefkastennummer.`;
      }
      
      systemPrompt += `\n\nFormatiere deine Antworten als JSON mit text und options Eigenschaften.`;
    } else {
      systemPrompt += '\n\nKeine Use Case Information verfügbar.';
    }
    
    conversationMessages.push({
      role: "system",
      content: systemPrompt
    });

    // Füge vorhandene Nachrichten hinzu
    for (const msg of messages) {
      conversationMessages.push({
        role: msg.role,
        content: msg.content
      });
    }

    // Bei automatischer Initiierung eine Anweisung für GPT erstellen
    if (isAutoInitialization || (!message && !buttonChoice && messages.length === 0)) {
      const customerName = task.customer?.name || "der Kunde";
      
      let autoInitPrompt = `Der Chat wurde automatisch initiiert. Starte direkt mit der konkreten Frage oder Information ohne Begrüßung wie "Guten Tag" oder "Hallo". 
      Fokussiere auf den Use Case "${useCase?.title || 'Unbekannt'}". Die Aufgabe betrifft: "${task.description || 'Keine Beschreibung'}". 
      Spreche den Kunden direkt an mit "Sie" und "Ihre", nicht als "${customerName}" in der dritten Person.`;
      
      // Zusätzliche Anweisungen für Endkunde
      if (endkundeData) {
        autoInitPrompt += `\nDer Endkunde ${endkundeData.Vorname} ${endkundeData.Nachname} wurde bereits identifiziert. 
        Frage NICHT erneut nach Namen oder Adresse. Gehe direkt zum nächsten relevanten Schritt im Prozess über.`;
      }
      
      conversationMessages.push({
        role: "system",
        content: autoInitPrompt
      });
    }
    
    // Füge die Button-Auswahl oder die Nachricht hinzu, wenn vorhanden
    if (buttonChoice) {
      conversationMessages.push({
        role: "user",
        content: buttonChoice
      });
    } else if (message) {
      conversationMessages.push({
        role: "user",
        content: message
      });
    }

    // Call OpenAI using the responses API with retry mechanism
    console.log("Calling OpenAI with message count:", conversationMessages.length);
    
    const responseData = await fetchWithRetry('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: "gpt-4.1",
        messages: conversationMessages,
        temperature: 0.7,
        max_tokens: 1500
      })
    });
    
    const assistantResponse = responseData.choices[0].message.content;
    
    // Format the assistant's response to ensure it contains options if available
    const formattedResponse = formatAssistantResponse(assistantResponse);
    
    console.log("Assistant response generated successfully");
    
    // Insert the assistant's response
    const { data: insertedMessage, error: insertError } = await supabase
      .from('task_messages')
      .insert({
        task_id: taskId,
        role: 'assistant',
        content: formattedResponse
      })
      .select('id')
      .single();
      
    if (insertError) throw insertError;

    return new Response(
      JSON.stringify({
        response: formattedResponse,
        response_id: insertedMessage?.id
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in handle-task-chat function:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        is_rate_limit: error.message?.includes('rate limit')
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
