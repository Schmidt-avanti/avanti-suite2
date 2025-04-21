
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { validateResponse } from "./validator.ts";
import type { UseCaseResponse } from "./types.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper to construct metadata object for OpenAI
function prepareMetadata(raw: any) {
  if (!raw) return {};
  return {
    ...raw,
    industry: raw.industry ?? "",
    sw_tasks: raw.taskManagement ?? raw.task_management ?? raw.sw_tasks ?? "",
    sw_knowledge: raw.knowledgeBase ?? raw.knowledge_base ?? raw.sw_knowledge ?? "",
    sw_CRM: raw.crm ?? raw.CRM ?? raw.sw_CRM ?? "",
  };
}

function sanitizeToolReferences(content: string, metadata: any): string {
  return content.replace(/{{metadata\.([\w]+)}}/g, (match, key) => {
    return metadata[key] || match;
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    console.log("Function called, checking payload...");
    
    const { prompt, metadata, userInput, type, previous_response_id } = await req.json();
    
    console.log("Received request data:", { 
      promptLength: prompt?.length, 
      metadata: JSON.stringify(metadata), 
      userInput, 
      type 
    });

    if (!openAIApiKey) {
      console.error("OpenAI API Key is missing");
      return new Response(JSON.stringify({ 
        error: "OpenAI API Key not configured", 
        status: "configuration_error" 
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload = {
      model: "gpt-4.1",
      instructions: prompt,
      input: userInput,
      metadata: prepareMetadata({ ...(metadata ?? {}), type }),
    };

    if (previous_response_id) {
      payload.previous_response_id = previous_response_id;
    }

    console.log("Sending payload to OpenAI:", JSON.stringify(payload, null, 2));

    const response = await fetch("https://api.openai.com/v1/responses", {
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
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch (e) {
        errorData = { raw: errorText };
      }
      
      return new Response(JSON.stringify({ 
        error: `OpenAI API Error: ${response.status}`,
        details: errorData,
        status: "api_error" 
      }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const responseText = await response.text();
    console.log("Raw OpenAI response:", responseText);
    
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (err) {
      console.error("JSON parsing error for response:", err, responseText);
      return new Response(JSON.stringify({
        error: "Fehler beim Parsen der OpenAI-Antwort",
        raw_response: responseText,
        status: "parsing_error"
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!data.choices?.[0]?.content) {
      console.error("Unexpected OpenAI response format:", data);
      return new Response(JSON.stringify({
        error: "Unerwartetes Antwortformat von OpenAI",
        raw_response: data,
        status: "format_error"
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let parsedContent: UseCaseResponse;
    try {
      const contentString = data.choices[0].content;
      console.log("Content to parse:", contentString);
      parsedContent = JSON.parse(contentString);
    } catch (err) {
      console.error("JSON parsing error:", err);
      return new Response(JSON.stringify({ 
        error: "OpenAI Antwort war kein valides JSON",
        raw_content: data.choices[0].content,
        status: "parsing_error" 
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate the response structure
    const validationResult = validateResponse(parsedContent);
    if (!validationResult.isValid) {
      console.error("Validation errors:", validationResult.errors);
      return new Response(JSON.stringify({
        error: "Ungültige Antwortstruktur",
        details: validationResult.errors,
        raw_content: parsedContent,
        status: "validation_error"
      }), {
        status: 422,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Sanitize tool references in process_map
    if (parsedContent.process_map) {
      parsedContent.process_map = parsedContent.process_map.map(step => ({
        ...step,
        tool: sanitizeToolReferences(step.tool, metadata)
      }));
    }

    // Add response_id if available
    if (data.id) {
      parsedContent.response_id = data.id;
    }

    return new Response(JSON.stringify(parsedContent), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err: any) {
    console.error("Edge Function Error:", err);
    return new Response(JSON.stringify({ 
      error: err.message, 
      status: "runtime_error" 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
