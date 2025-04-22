
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { description } = await req.json();

    if (!description) {
      throw new Error('Description is required');
    }

    // Initialize OpenAI API
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY')!;
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    console.log('Generating embedding for description:', description.substring(0, 100) + '...');

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

    // 2. Find similar use cases using our new database function
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const { data: similarUseCases, error: searchError } = await supabase
      .rpc('match_similar_use_cases', {
        query_embedding: embedding,
        match_threshold: 0.5,
        match_count: 3
      });

    if (searchError) throw searchError;

    console.log('Found similar use cases:', similarUseCases?.length || 0);

    // If no use cases found, return a default response
    if (!similarUseCases || similarUseCases.length === 0) {
      return new Response(JSON.stringify({
        matched_use_case_id: null,
        confidence: 0,
        reasoning: "Keine passenden Use Cases gefunden"
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 3. Use GPT to analyze matches
    const analysisResponse = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        instructions: `Als Experte für Use Case Matching bei avanti, analysiere bitte diese Aufgabenbeschreibung und die möglichen passenden Use Cases.
        Wähle den am besten passenden Use Case aus und gib eine Begründung.
        
        Die Use Case Typen sind:
        - information_request: Eine reine Informationsanfrage
        - forwarding_use_case: Ein Anliegen, das weitergeleitet werden muss
        - direct_use_case: Ein Anliegen, das direkt bearbeitet werden kann

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
        previous_response_id: null
      })
    });

    const analysisData = await analysisResponse.json();
    
    // Check if we have a valid response
    if (!analysisData || !analysisData.response) {
      console.error('Invalid analysis response:', analysisData);
      return new Response(JSON.stringify({
        error: 'Invalid AI response',
        details: analysisData
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    try {
      const analysis = JSON.parse(analysisData.response);
      
      console.log('Analysis completed:', {
        matched_id: analysis.matched_use_case_id,
        confidence: analysis.confidence
      });

      return new Response(JSON.stringify(analysis), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } catch (parseError) {
      console.error('Error parsing analysis result:', parseError);
      console.error('Raw response:', analysisData.response);
      
      // Return a fallback response
      return new Response(JSON.stringify({
        matched_use_case_id: similarUseCases[0].id,
        confidence: 50,
        reasoning: "Automatisch zugewiesen aufgrund eines Parsing-Fehlers"
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
