
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { prepareMetadata } from "./metadata.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    console.log("Function called, parsing request payload...");
    
    const { prompt, userInput, use_case_id, previous_response_id, metadata } = await req.json();
    
    console.log("Request data:", { 
      promptLength: prompt?.length, 
      userInput: userInput?.substring(0, 50) + "...", 
      use_case_id,
      previous_response_id,
      metadata
    });

    if (!openAIApiKey) {
      console.error("OpenAI API Key not configured");
      return new Response(JSON.stringify({ 
        error: "OpenAI API Key not configured", 
        status: "configuration_error" 
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Initialize Supabase client to fetch use case data if needed
    const supabase = createClient(supabaseUrl!, supabaseServiceKey!);

    // If we have a use case ID, fetch its data
    let useCaseContext = "";
    if (use_case_id) {
      const { data: useCase, error } = await supabase
        .from('use_cases')
        .select('title, typical_activities, expected_result')
        .eq('id', use_case_id)
        .single();

      if (error) {
        console.error("Error fetching use case:", error);
      } else if (useCase) {
        useCaseContext = `
Zusätzlicher Kontext aus dem Use Case:
Titel: ${useCase.title}
${useCase.typical_activities ? `Typische Aktivitäten: ${useCase.typical_activities}` : ''}
${useCase.expected_result ? `Erwartetes Ergebnis: ${useCase.expected_result}` : ''}`;
      }
    }

    // Prepare metadata context for prompt injection
    const meta = prepareMetadata(metadata);
    let metaContext = '';
    if (meta.industry) metaContext += `Branche: ${meta.industry}\n`;
    if (meta.contract_type) metaContext += `Vertragstyp: ${meta.contract_type}\n`;
    if (metaContext) metaContext = 'Kontext für die Wissensartikel-Generierung:\n' + metaContext + '\n';

    // Determine if this is a knowledge_request (Informationsanfrage)
    const isKnowledgeRequest = metadata?.type === 'knowledge_request';
    let fullPrompt: string;
    if (isKnowledgeRequest) {
      // Dedicated Wissensartikel-Prompt
      fullPrompt = `${metaContext}Du bist ein Fachexperte für die Branche ${meta.industry || ''}.
Erstelle einen ausführlichen, redaktionellen Wissensartikel zu folgendem Thema für die interne Wissensdatenbank. 
Der Artikel soll keine Handlungsanweisung und keine Schritt-für-Schritt-Anleitung enthalten, sondern den Sachverhalt verständlich und fachlich korrekt erklären. 
${meta.contract_type ? `Berücksichtige auch den Vertragstyp: ${meta.contract_type}.\n` : ''}

Struktur:
- Überschrift (klar und präzise)
- Einleitung (Worum geht es? Warum ist das Thema relevant?)
- Hauptteil (Fachliche Hintergründe, gesetzliche Grundlagen, Besonderheiten, typische Herausforderungen, Beispiele)
- Optional: weiterführende Hinweise oder Quellen

**WICHTIG:** Keine Checklisten, keine Prozessschritte, keine typischen Aktivitäten! Nur Fließtext.

Das Thema lautet: ${userInput}`;
    } else {
      // Original Prompt (z.B. für Use Cases)
      fullPrompt = metaContext + prompt + (useCaseContext ? "\n\n" + useCaseContext : "");
    }

    console.log("Sending request to OpenAI Responses API...");

    const payload = {
      model: "gpt-4-turbo",
      messages: [
        {
          role: "system",
          content: fullPrompt
        },
        {
          role: "user",
          content: userInput
        }
      ],
      temperature: 0.4
    };

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openAIApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
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
        error: `OpenAI API Error (${response.status})`,
        details: errorData,
        status: "api_error" 
      }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const responseData = await response.json();
    console.log("OpenAI response structure:", JSON.stringify(responseData, null, 2));

    // Die Chat Completions API gibt die Antwort im responseData.choices[0].message.content zurück
    if (!responseData.choices?.[0]?.message?.content) {
      console.error("Unexpected OpenAI response format:", JSON.stringify(responseData, null, 2));
      return new Response(JSON.stringify({
        error: "Unexpected response format from OpenAI",
        raw_response: responseData,
        status: "format_error"
      }), {
        status: 422,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Extract the content from the response
    const content = responseData.choices[0].message.content;
    console.log("Content received from OpenAI:", content?.substring(0, 100) + "...");

    return new Response(JSON.stringify({
      content,
      response_id: responseData.id || ''
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err: any) {
    console.error("Edge Function Error:", err);
    return new Response(JSON.stringify({ 
      error: err.message, 
      stack: err.stack,
      status: "runtime_error" 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
