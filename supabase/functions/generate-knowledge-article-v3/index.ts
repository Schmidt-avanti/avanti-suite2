import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

// Umgebungsvariablen
const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

// CORS-Header für alle Antworten
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Typen für die Anfrage
interface RequestPayload {
  use_case_id?: string;
  userInput?: string;
  previous_response_id?: string;
  save_mode?: boolean;
  manual_content?: string;
}

// Typen für die Antwort
interface ResponsePayload {
  content: string;
  response_id?: string;
  status: 'success' | 'error';
  error?: string;
}

serve(async (req) => {
  // CORS-Präflug-Anfragen beantworten
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  
  try {
    console.log("Function called, parsing request payload...");
    
    const payload = await req.json() as RequestPayload;
    const { use_case_id, userInput, previous_response_id, save_mode, manual_content } = payload;
    
    console.log("Request data:", { 
      use_case_id,
      userInput: userInput?.substring(0, 50) + (userInput && userInput.length > 50 ? "..." : ""),
      previous_response_id,
      save_mode,
      has_manual_content: !!manual_content
    });

    console.log("=== DEBUGGING START ===");
    console.log("Received use_case_id:", use_case_id);
    console.log("Received userInput:", userInput);
    console.log("Received previous_response_id:", previous_response_id);

    // Prüfen, ob die OpenAI API konfiguriert ist
    if (!openAIApiKey) {
      console.error("OpenAI API Key not configured");
      return new Response(JSON.stringify({ 
        status: 'error',
        error: "OpenAI API Key not configured"
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Supabase-Client initialisieren
    const supabase = createClient(supabaseUrl!, supabaseServiceKey!);

    // Wenn wir im Speichermodus sind, speichern wir den manuell bearbeiteten Inhalt
    if (save_mode && manual_content) {
      console.log("Save mode activated, storing manual content...");
      
      // Hier könnten wir den manuellen Inhalt in der Datenbank speichern
      // Dies würde in einer realen Implementierung erfolgen
      
      return new Response(JSON.stringify({
        content: manual_content,
        status: 'success'
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use Case-Daten abrufen, wenn eine ID angegeben ist
    let useCaseData = null;
    if (use_case_id) {
      console.log("Fetching use case data for ID:", use_case_id);
      const { data, error } = await supabase
        .from('use_cases')
        .select('title, expected_result, steps, typical_activities, chat_response, process_map, information_needed')
        .eq('id', use_case_id)
        .single();

      if (error) {
        console.error("❌ Error fetching use case:", error);
      } else {
        useCaseData = data;
        console.log("✅ Use case data retrieved successfully!");
        console.log("Use case data:", JSON.stringify(useCaseData, null, 2));
      }
    } else {
      console.log("❌ No use_case_id provided!");
    }

    // Extrahiere den info_block aus chat_response, falls vorhanden
    let infoBlock = "";
    if (useCaseData?.chat_response?.info_block) {
      infoBlock = useCaseData.chat_response.info_block;
      console.log("Info block extracted from chat_response");
    }

    // System-Prompt erstellen
    const systemPrompt = `Du bist Ava, die digitale Assistenz bei avanti.

Du wandelst strukturierte Use Cases in klar verständliche, nutzerfreundliche und professionelle Wissensartikel um. Diese Artikel dienen Service-Mitarbeitenden zur schnellen Orientierung bei internen Fragen und Informationsbedarfen.

Zielgruppe: Service-Mitarbeitende, die wissen möchten, wie ein bestimmter Ablauf funktioniert oder was in einem konkreten Fall zu tun ist.
Stil: sachlich, verständlich, professionell – im Stil einer internen Wissensdatenbank.
Format: MARKDOWN mit klaren Überschriften, Aufzählungen und Formatierung.

WICHTIG: Verwende ausschließlich MARKDOWN-Syntax für die Formatierung!

Strukturiere den Artikel nach folgendem MARKDOWN-Muster:

# [Titel aus Use Case]

## Einleitung
Beschreibe kurz und verständlich, worum es in diesem Anwendungsfall geht (Ziel, Kontext, Relevanz).

## Benötigte Informationen
- Liste kompakt auf, welche Informationen im Vorfeld vorliegen müssen
- Verwende Aufzählungszeichen für bessere Lesbarkeit

## Vorgehen
1. Gib eine nummerierte schrittweise Anleitung basierend auf den Process Map Schritten
2. Oder verwende die verfügbaren Schrittdaten
3. Jeder Schritt soll konkret und umsetzbar sein

## Erwartetes Ergebnis
Beschreibe, was am Ende des Prozesses passiert bzw. wie ein erfolgreicher Abschluss aussieht.

## Hinweise oder Besonderheiten
- Nenne Herausforderungen, Sonderfälle oder wichtige Hinweise
- Verwende **Fettschrift** für wichtige Punkte

FORMATIERUNGS-REGELN:
- Verwende # für Hauptüberschriften
- Verwende ## für Unterüberschriften
- Verwende **Fettschrift** für wichtige Begriffe
- Verwende - oder * für Aufzählungen
- Verwende 1. 2. 3. für nummerierte Listen

WICHTIG: Verwende NUR die bereitgestellten Use Case Informationen. Frage NICHT nach zusätzlichen Informationen, sondern erstelle den Artikel basierend auf dem, was verfügbar ist.`;

    // Kontext aus dem Use Case erstellen
    let useCaseContext = "";
    if (useCaseData) {
      useCaseContext = `
Hier sind die Informationen aus dem Use Case:

Titel: ${useCaseData.title || "Nicht angegeben"}
${useCaseData.information_needed ? `Benötigte Informationen: ${useCaseData.information_needed}` : ""}
${useCaseData.expected_result ? `Erwartetes Ergebnis: ${useCaseData.expected_result}` : ""}
${useCaseData.steps ? `Schritte: ${useCaseData.steps}` : ""}
${useCaseData.typical_activities ? `Typische Aktivitäten: ${useCaseData.typical_activities}` : ""}
${useCaseData.process_map ? `Process Map: ${JSON.stringify(useCaseData.process_map, null, 2)}` : ""}
${infoBlock ? `Info-Block: ${infoBlock}` : ""}`;
    }

    // Benutzeranfrage vorbereiten - erste Anfrage ist automatisch
    const userMessage = userInput || "";

    console.log("User message:", userMessage);
    console.log("Sending request to OpenAI Responses API...");

    // Anfrage an die OpenAI Responses API senden
    const openAIPayload: any = {
      model: "gpt-4o",
      temperature: 0.4,
      instructions: systemPrompt + (useCaseContext ? "\n\n" + useCaseContext : ""),
      input: userMessage
    };

    // Wenn eine vorherige Antwort-ID vorhanden ist, fügen wir sie hinzu
    if (previous_response_id) {
      openAIPayload.previous_response_id = previous_response_id;
    }

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openAIApiKey}`,
        "Content-Type": "application/json",
        "OpenAI-Beta": "responses-2023-12-01"
      },
      body: JSON.stringify(openAIPayload),
    });

    console.log("OpenAI API response status:", response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenAI API error response:", errorText);
      
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch (e) {
        errorData = { raw: errorText };
      }
      
      return new Response(JSON.stringify({ 
        status: 'error',
        error: `OpenAI API Error (${response.status})`,
        details: errorData
      }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const responseData = await response.json();
    console.log("OpenAI response received:", {
      has_response_id: !!responseData.id,
      has_content: !!responseData.output?.[0]?.content?.[0]?.text
    });

    // Antwort extrahieren
    if (!responseData.output?.[0]?.content?.[0]?.text) {
      console.error("Unexpected OpenAI response format:", JSON.stringify(responseData, null, 2));
      return new Response(JSON.stringify({
        status: 'error',
        error: "Unexpected response format from OpenAI",
        raw_response: responseData
      }), {
        status: 422,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const content = responseData.output[0].content[0].text;
    console.log("Content received from OpenAI:", content?.substring(0, 100) + "...");

    // Erfolgreiche Antwort zurückgeben
    return new Response(JSON.stringify({
      content: content,
      response_id: responseData.id || '',
      status: 'success'
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err: any) {
    console.error("Edge Function Error:", err);
    return new Response(JSON.stringify({ 
      status: 'error',
      error: err.message, 
      stack: err.stack
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
