
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0';
import { encode } from 'https://deno.land/std@0.218.0/encoding/base64.ts';
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY')!;
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { description } = await req.json();

    // 1. Generate embedding for the task description
    const embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: description,
        model: 'text-embedding-3-small',
      }),
    });

    const embeddingData = await embeddingResponse.json();
    const embedding = embeddingData.data[0].embedding;

    // 2. Find similar use cases using vector similarity
    const { data: similarUseCases, error: searchError } = await supabase
      .rpc('match_similar_use_cases', {
        query_embedding: embedding,
        match_threshold: 0.5,
        match_count: 3
      });

    if (searchError) throw searchError;

    // 3. Use GPT to analyze matches using the correct Responses API format
    const analysisResponse = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        instructions: `Du bist ein Experte für Use Case Matching bei avanti. 
        Analysiere die Aufgabenbeschreibung und die möglichen passenden Use Cases.
        Wähle den am besten passenden Use Case aus und gib eine Begründung.
        Berücksichtige dabei:
        - Inhaltliche Übereinstimmung
        - Prozessähnlichkeit
        - Benötigte Informationen
        
        Antworte im folgenden JSON-Format:
        {
          "matched_use_case_id": "ID des best passenden Use Cases",
          "confidence": 0-100,
          "reasoning": "Deine Begründung für die Auswahl"
        }`,
        input: `Aufgabenbeschreibung: "${description}"
        
        Mögliche Use Cases:
        ${JSON.stringify(similarUseCases, null, 2)}`,
        previous_response_id: null // For initial call, would be populated in a dialog context
      })
    });

    const analysisData = await analysisResponse.json();
    const analysis = JSON.parse(analysisData.response);

    return new Response(JSON.stringify(analysis), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
