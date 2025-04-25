
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { validateResponse } from "./validator.ts";
import { prepareMetadata } from "./metadata.ts";
import { callOpenAI } from "./openai.ts";
import { processResponse } from "./response-processor.ts";
import { corsHeaders } from "./cors.ts";
import { USE_CASE_TYPES } from "./types.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    console.log("Function called, parsing request payload...");
    
    const { prompt, metadata, userInput, type, debug = false } = await req.json();
    
    console.log("Request data:", { 
      promptLength: prompt?.length, 
      metadata: JSON.stringify(metadata), 
      userInput: userInput?.substring(0, 50) + "...", 
      type,
      debug
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

    const preparedMetadata = prepareMetadata(metadata);
    console.log("Prepared metadata for API call:", preparedMetadata);

    const baseInstructions = `${prompt}\n\nDEFINITIV KEINE RÜCKFRAGEN STELLEN! Antworte immer direkt im geforderten Format ohne Rückfragen.

KRITISCHE FORMATVORGABEN:

1. type MUSS einer dieser Werte sein: "${USE_CASE_TYPES.KNOWLEDGE_REQUEST}", "${USE_CASE_TYPES.FORWARDING}", "${USE_CASE_TYPES.DIRECT}"

2. chat_response.steps_block MUSS ein Array von Strings sein

3. Alle diese Felder sind PFLICHT:
  - type (einer der oben genannten Werte)
  - title (string)
  - information_needed (string) 
  - steps (string)
  - typical_activities (string)
  - expected_result (string)
  - chat_response.steps_block (string[])
  - next_question (string)

BEISPIEL FÜR GÜLTIGES FORMAT:
{
  "type": "${USE_CASE_TYPES.DIRECT}",
  "title": "Direktbearbeitung: Support Anfrage",
  "information_needed": "Kontaktdaten, Problembeschreibung",
  "steps": "1. Anfrage erfassen, 2. Lösung bereitstellen",
  "typical_activities": "Dokumentation, Beratung",
  "expected_result": "Gelöste Supportanfrage",
  "chat_response": {
    "steps_block": [
      "Können Sie mir bitte Ihr Anliegen schildern?",
      "Ich notiere die Details",
      "Lassen Sie mich eine Lösung vorbereiten",
      "Hier ist mein Vorschlag zur Lösung"
    ]
  },
  "next_question": "Benötigen Sie weitere Unterstützung?"
}`;

    const responseData = await callOpenAI(openAIApiKey, {
      model: "gpt-4.5-preview",
      instructions: baseInstructions,
      input: userInput,
      metadata: preparedMetadata,
    });

    if (!responseData.output?.[0]?.content?.[0]?.text) {
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

    const content = responseData.output[0].content[0].text;
    console.log("Raw content received:", content);

    const parsedContent = processResponse(content);
    console.log("Validating parsed content...");
    
    const validationResult = validateResponse(parsedContent);
    
    if (!validationResult.isValid) {
      console.error("Validation errors:", validationResult.errors);

      const errorFields = validationResult.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message,
        received: err.received
      }));

      return new Response(JSON.stringify({
        error: "Invalid response structure",
        message: "The response is missing required fields or has invalid values",
        errors: errorFields,
        example: {
          type: USE_CASE_TYPES.DIRECT,
          title: "Example Title",
          information_needed: "Required Information",
          steps: "Step-by-step process",
          typical_activities: "Common activities",
          expected_result: "Expected outcome",
          chat_response: {
            steps_block: ["Step 1", "Step 2", "Step 3"]
          },
          next_question: "Follow-up question"
        },
        raw_content: parsedContent,
        status: "validation_error"
      }), {
        status: 422,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Response validation successful");

    if (responseData.id) {
      parsedContent.response_id = responseData.id;
    }

    if (debug) {
      return new Response(JSON.stringify({
        ...parsedContent,
        _debug: {
          raw_response: responseData,
          validation: "passed"
        }
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify(parsedContent), {
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
