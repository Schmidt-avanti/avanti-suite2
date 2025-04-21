import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { validateResponse } from "./validator.ts";
import type { UseCaseResponse } from "./types.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function prepareMetadata(raw: any) {
  if (!raw) return {};
  
  const metadata = {
    industry: raw.industry ?? "",
    sw_tasks: raw.tools?.task_management ?? "",
    sw_knowledge: raw.tools?.knowledge_base ?? "",
    sw_CRM: raw.tools?.crm ?? "",
  };
  
  console.log("Prepared metadata:", metadata);
  return metadata;
}

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

    const payload = {
      model: "gpt-4.1-2025-04-14",
      instructions: prompt,
      input: userInput,
      metadata: preparedMetadata,
    };

    console.log("Sending request to OpenAI Responses API with model:", payload.model);

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
    console.log("OpenAI response structure:", Object.keys(responseData));

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

    let content = responseData.output[0].content[0].text;
    console.log("Raw content received:", content);

    if (content.startsWith('```json\n') && content.endsWith('\n```')) {
      content = content.slice(8, -4); // Remove ```json\n and \n```
    }
    
    let parsedContent: UseCaseResponse;
    try {
      parsedContent = JSON.parse(content);
      console.log("Successfully parsed content");
    } catch (err) {
      console.error("JSON parsing error:", err);
      console.error("Content that failed to parse:", content);
      
      return new Response(JSON.stringify({ 
        error: "Failed to parse OpenAI response as JSON",
        raw_content: content,
        status: "parsing_error" 
      }), {
        status: 422,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Validating parsed content...");
    const validationResult = validateResponse(parsedContent);
    
    if (!validationResult.isValid) {
      console.error("Validation errors:", validationResult.errors);
      
      return new Response(JSON.stringify({
        error: "Invalid response structure",
        details: validationResult.errors,
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
