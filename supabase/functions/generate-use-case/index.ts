// supabase/functions/generate-use-case/index.ts
// Neue, saubere Implementation der Use Case Generierung mit OpenAI

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// #########################################
// CORS HEADERS
// #########################################

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// #########################################
// TYPES
// #########################################

interface CustomerMetadata {
  industry?: string;
  // Nur noch industry wird benötigt, alle anderen Felder wurden entfernt
}

interface OpenAIPayload {
  model: string;
  instructions: string;
  input: string;
  metadata: CustomerMetadata;
  previous_response_id?: string;
}

// Raw response from OpenAI
interface OpenAIResponse {
  id: string;
  output: Array<{
    content: Array<{
      text: string;
    }>;
  }>;
  response_id?: string;
}

// Processed response structure
interface ProcessedResponse {
  type: string;
  chat_response: {
    info_block?: string;
    follow_up_questions?: string[];
    ai_message?: string; // Wir werden sicherstellen, dass dieses Feld immer existiert
  };
  process_map?: any;
  simple_fields?: Record<string, string>;
  response_id: string;
  [key: string]: any;
}

// #########################################
// HELPER FUNCTIONS
// #########################################

/**
 * Extrahiert den Text aus der OpenAI-Antwort
 */
function extractTextFromResponse(response: OpenAIResponse): string {
  try {
    if (!response.output || !response.output[0] || !response.output[0].content || !response.output[0].content[0]) {
      console.error("Unerwartetes OpenAI Response Format:", JSON.stringify(response));
      throw new Error("Unerwartetes OpenAI Response Format");
    }
    return response.output[0].content[0].text;
  } catch (error) {
    console.error("Fehler beim Extrahieren des Texts aus der OpenAI-Antwort:", error);
    throw new Error("Konnte Text nicht aus OpenAI-Antwort extrahieren");
  }
}

/**
 * Parst den JSON-String aus der OpenAI-Antwort
 */
function parseJsonFromText(text: string): any {
  try {
    // Suche nach JSON-Blöcken im Text
    const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) || 
                      text.match(/\{[\s\S]*\}/);
    
    const jsonString = jsonMatch ? jsonMatch[1] || jsonMatch[0] : text;
    
    // Versuche das JSON zu parsen
    return JSON.parse(jsonString.replace(/```json|```/g, '').trim());
  } catch (error) {
    console.error("Fehler beim Parsen des JSON aus dem Text:", error);
    console.log("Problematischer Text:", text);
    throw new Error("Konnte JSON nicht aus Text parsen");
  }
}

/**
 * Ruft die OpenAI API auf
 */
async function callOpenAI(apiKey: string, payload: OpenAIPayload): Promise<OpenAIResponse> {
  const OPENAI_API_URL = "https://api.openai.com/v1/responses";
  
  try {
    console.log("OpenAI API Aufruf mit:", {
      model: payload.model,
      input: payload.input.substring(0, 50) + "...",
      previous_response_id: payload.previous_response_id || "<nicht vorhanden>"
    });
    
    const response = await fetch(OPENAI_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`OpenAI API Fehler (${response.status}):`, errorText);
      throw new Error(`OpenAI API Fehler: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    console.log("OpenAI Response ID:", data.id || data.response_id);
    return data;
  } catch (error) {
    console.error("Fehler beim Aufruf der OpenAI API:", error);
    throw error;
  }
}

/**
 * Stellt sicher, dass die Antwort das richtige Format hat
 * Fügt fehlende Felder hinzu oder korrigiert sie
 */
function normalizeResponse(data: any): any {
  // Stelle sicher, dass chat_response existiert
  if (!data.chat_response) {
    data.chat_response = {};
  }
  
  // Stelle sicher, dass ai_message existiert
  if (!data.chat_response.ai_message) {
    // Wenn kein ai_message vorhanden ist, versuche andere Felder zu verwenden
    if (data.chat_response.info_block) {
      data.chat_response.ai_message = data.chat_response.info_block;
      console.log("ai_message aus info_block erstellt");
    } else if (typeof data.expected_result === 'string') {
      data.chat_response.ai_message = data.expected_result;
      console.log("ai_message aus expected_result erstellt");
    } else if (typeof data.title === 'string') {
      data.chat_response.ai_message = data.title;
      console.log("ai_message aus title erstellt");
    } else {
      // Fallback
      data.chat_response.ai_message = "Ich habe Ihre Anfrage verstanden. Können Sie mir mehr Details geben?";
      console.log("Standard ai_message erstellt");
    }
  }
  
  return data;
}

/**
 * Einfache Validierung der Antwort
 * Prüft nur die wichtigsten Felder, ohne komplexe Zod-Schemas
 */
function validateResponse(data: any): { isValid: boolean; errors?: string[] } {
  const errors: string[] = [];
  
  // Prüfe, ob type vorhanden und gültig ist
  const validTypes = ["direct_use_case", "forwarding_use_case", "knowledge_request"];
  if (!data.type) {
    errors.push("Feld 'type' fehlt");
  } else if (!validTypes.includes(data.type)) {
    errors.push(`Ungültiger Typ: ${data.type}. Erlaubt sind: ${validTypes.join(', ')}`);
  }
  
  // Bei direct_use_case und forwarding_use_case sollte process_map vorhanden sein
  if ((data.type === "direct_use_case" || data.type === "forwarding_use_case") && !data.process_map) {
    // Kein Fehler, aber ein Hinweis in den Logs
    console.log("Hinweis: 'process_map' fehlt bei einem Use Case vom Typ", data.type);
  }
  
  return {
    isValid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined
  };
}

// #########################################
// HAUPTFUNKTION
// #########################################

serve(async (req: Request): Promise<Response> => {
  // CORS-Handling
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // 1. Request-Daten extrahieren
    const { prompt, userInput, previous_response_id, customerMetadata, use_case_type } = await req.json();
    
    // Validierung der Eingabeparameter
    if (!prompt) {
      return new Response(JSON.stringify({ error: "Prompt fehlt" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
    
    if (!userInput) {
      return new Response(JSON.stringify({ error: "User Input fehlt" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
    
    // OpenAI API Key holen
    const openAIApiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openAIApiKey) {
      return new Response(JSON.stringify({ error: "OpenAI API Key nicht konfiguriert" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
    
    // Metadata vorbereiten
    const preparedMetadata: CustomerMetadata = customerMetadata || {};
    
    // 2. OpenAI aufrufen
    console.log("Rufe OpenAI API auf mit previous_response_id:", previous_response_id || "<keine>");
    
    const responseData = await callOpenAI(openAIApiKey, {
      model: "gpt-4.1-2025-04-14",
      instructions: prompt,
      input: userInput,
      metadata: preparedMetadata,
      ...(previous_response_id ? { previous_response_id } : {})
    });
    
    // 3. Antwort verarbeiten
    console.log("OpenAI Response erhalten mit ID:", responseData.id || responseData.response_id);
    
    // Text aus der Antwort extrahieren
    const content = extractTextFromResponse(responseData);
    console.log("Extrahierter Text (gekürzt):", content.substring(0, 100) + "...");
    
    // JSON aus dem Text parsen
    let processedData = parseJsonFromText(content);
    
    // Response ID hinzufügen
    processedData.response_id = responseData.id || responseData.response_id;
    
    // Use Case Typ überschreiben, falls angegeben
    if (use_case_type && processedData.type !== use_case_type) {
      console.log(`Überschreibe Typ von ${processedData.type} zu ${use_case_type}`);
      processedData.type = use_case_type;
    }
    
    // Antwort normalisieren und fehlende Felder ergänzen
    console.log("Normalisiere Antwort...");
    processedData = normalizeResponse(processedData);
    console.log("Normalisierte Antwort:", JSON.stringify(processedData.chat_response));
    
    // 4. Einfache Validierung
    const validation = validateResponse(processedData);
    
    if (!validation.isValid) {
      console.error("Validierungsfehler:", validation.errors);
      return new Response(JSON.stringify({
        error: "Validierungsfehler",
        details: validation.errors,
        data: processedData // Trotzdem die Daten zurückgeben, damit Frontend entscheiden kann
      }), {
        status: 200, // Kein 400, damit Frontend die Daten trotzdem verarbeiten kann
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
    
    // 5. Erfolgreiche Antwort zurückgeben
    return new Response(JSON.stringify(processedData), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
    
  } catch (error) {
    // Allgemeine Fehlerbehandlung
    console.error("Unbehandelter Fehler:", error);
    
    return new Response(JSON.stringify({
      error: "Interner Serverfehler",
      message: error instanceof Error ? error.message : String(error)
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
