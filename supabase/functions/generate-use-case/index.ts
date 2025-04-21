
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  try {
    const { prompt, metadata, userInput, type } = await req.json();

    // Build responses API payload
    const payload = {
      model: "gpt-4.1",
      instructions: prompt,
      input: userInput,
      // Add relevant metadata/context as needed to the 'additional_instructions'
      additional_instructions: [
        `Kundendaten: ${JSON.stringify(metadata)}`,
        `Use Case Typ: ${type}`,
      ],
      response_format: "json_object",
    };

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openAIApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    // The responses API will always output .choices[0].content as JSON string
    let jsonResponse: any = {};
    try {
      jsonResponse = JSON.parse(data.choices?.[0]?.content || "{}");
    } catch (err) {
      jsonResponse = { error: "OpenAI Response war kein valides JSON." };
    }

    return new Response(JSON.stringify(jsonResponse), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
