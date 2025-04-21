
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// Load OpenAI API key from environment variable
const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper to construct metadata object for OpenAI
function prepareMetadata(raw: any) {
  if (!raw) return {};
  // Map to unified metadata if desired (flexible for your variable substitution)
  return {
    ...raw,
    industry: raw.industry ?? "", // Branche
    sw_tasks: raw.taskManagement ?? raw.task_management ?? raw.sw_tasks ?? "",
    sw_knowledge: raw.knowledgeBase ?? raw.knowledge_base ?? raw.sw_knowledge ?? "",
    sw_CRM: raw.crm ?? raw.CRM ?? raw.sw_CRM ?? "",
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    console.log("Function called, checking payload...");
    
    // Required: prompt (instructions), metadata (customer object), userInput, type, [optional]: previous_response_id
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

    // Strictly use documented parameters ONLY!
    const payload: Record<string, any> = {
      model: "gpt-4.1",
      instructions: prompt,
      input: userInput,
      metadata: prepareMetadata({ ...(metadata ?? {}), type }),
    };

    if (previous_response_id) {
      payload.previous_response_id = previous_response_id;
    }

    console.log("Sending payload to OpenAI:", JSON.stringify(payload, null, 2));

    // Call OpenAI Responses API (official per docs)
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openAIApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("OpenAI API error:", {
        status: response.status,
        statusText: response.statusText,
        data: errorData
      });
      
      return new Response(JSON.stringify({ 
        error: `OpenAI API Error: ${response.status} ${response.statusText}`, 
        details: errorData,
        status: "api_error" 
      }), {
        status: 502, // Bad Gateway for API errors
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();

    console.log("OpenAI Response received, status:", response.status);
    console.log("OpenAI Response structure:", JSON.stringify(Object.keys(data), null, 2));
    
    if (!data.choices?.[0]?.content) {
      console.error("Unexpected OpenAI response format:", data);
      return new Response(JSON.stringify({
        error: "Unerwartetes Antwortformat von OpenAI",
        raw_response: data,
        status: "parsing_error"
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // OpenAI Responses API: primary result is in data.choices[0].content
    let jsonResponse: any = {};
    try {
      // Parse JSON directly from the content field
      jsonResponse = JSON.parse(data.choices[0].content);
      console.log("Successfully parsed JSON response");
    } catch (err) {
      console.error("JSON parsing error:", err);
      console.log("Raw content:", data.choices[0].content);
      jsonResponse = { 
        error: "OpenAI Antwort war kein valides JSON.", 
        raw_content: data.choices[0].content 
      };
    }
    
    // Pass OpenAI response + (optionally) response_id to the frontend for follow-ups
    if (data.id) {
      jsonResponse.response_id = data.id;
    }

    return new Response(JSON.stringify(jsonResponse), {
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
