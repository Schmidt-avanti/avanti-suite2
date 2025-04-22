
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

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
    
    const { prompt, userInput, use_case_id, previous_response_id } = await req.json();
    
    console.log("Request data:", { 
      promptLength: prompt?.length, 
      userInput: userInput?.substring(0, 50) + "...", 
      use_case_id,
      previous_response_id
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

    // Prepare the final prompt
    const fullPrompt = prompt + (useCaseContext ? "\n\n" + useCaseContext : "");

    console.log("Sending request to OpenAI Responses API...");

    const payload = {
      model: "gpt-4.1-2025-04-14",
      instructions: fullPrompt,
      input: userInput,
      temperature: 0.4,
      ...(previous_response_id && { previous_response_id })
    };

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

    // Extract the content from the response
    const content = responseData.output[0].content[0].text;
    console.log("Content received from OpenAI");

    return new Response(JSON.stringify({
      content,
      response_id: responseData.id
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
