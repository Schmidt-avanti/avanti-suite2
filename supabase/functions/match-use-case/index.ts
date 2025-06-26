
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  console.log('[match-use-case] Function invoked. Method:', req.method);
  if (req.method === 'OPTIONS') {
    console.log('[match-use-case] Handling OPTIONS request.');
    return new Response(null, { headers: corsHeaders });
  }
  console.log('[match-use-case] Processing non-OPTIONS request (expecting POST).');

  try {
    console.log('[match-use-case] Attempting to parse request JSON...');
    const body = await req.json();
    console.log('[match-use-case] Request body parsed:', body);
    const { task_description: description, customer_id: customerId } = body;

    console.log(`[match-use-case] Received description: ${description ? description.substring(0,50)+'...' : 'null'}`);
    console.log(`[match-use-case] Received customerId: ${customerId || 'null'}`);

    if (!description) {
      throw new Error('Description is required');
    }

    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    console.log(`[match-use-case] OPENAI_API_KEY loaded: ${!!openAIApiKey}`);
    console.log(`[match-use-case] SUPABASE_URL loaded: ${!!supabaseUrl}`);
    console.log(`[match-use-case] SUPABASE_SERVICE_ROLE_KEY loaded: ${!!supabaseServiceKey}`);

    if (!openAIApiKey || !supabaseUrl || !supabaseServiceKey) {
      console.error('[match-use-case] CRITICAL: Missing one or more environment variables.');
      throw new Error('Server configuration error: Missing environment variables.');
    }
    
    // console.log('Generating embedding for description:', description.substring(0, 100) + '...'); // Already logged above
    // console.log('Customer ID:', customerId || 'Not provided'); // Already logged above

    let enhancedDescription = description;
    const newsletterKeywords = ['news letter', 'newsletter', 'news-letter', 'newsleter', 'newsltr', 'newslett'];
    const hasNewsletterKeyword = newsletterKeywords.some(keyword => 
      description.toLowerCase().includes(keyword)
    );
    
    if (hasNewsletterKeyword) {
      enhancedDescription = `${description} newsletter anmeldung newsletter registration`;
      console.log('Enhanced description for newsletter-related query');
    }

    const embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: enhancedDescription,
        model: 'text-embedding-3-small',
      }),
    });

    console.log('[match-use-case] OpenAI Embedding API response status:', embeddingResponse.status);
    const embeddingData = await embeddingResponse.json();
    console.log('[match-use-case] OpenAI Embedding API response data:', JSON.stringify(embeddingData, null, 2));

    if (!embeddingResponse.ok || !embeddingData.data || !embeddingData.data[0] || !embeddingData.data[0].embedding) {
      console.error('Failed to get embedding from OpenAI:', embeddingData);
      throw new Error('Failed to generate embedding for the description.');
    }
    const embedding = embeddingData.data[0].embedding;

    // Define a type for the use case objects returned by the RPC and used in subsequent logic
    interface UseCaseSuggestion {
      id: string;
      title: string;
      type: string; // Or a more specific enum/type if available
      information_needed: string | null;
      // Add other fields if they are consistently present and used, e.g., description, steps
      similarity?: number; // Optional, as it comes from RPC but might not be in all contexts
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const { data: similarUseCases, error: searchError } = await supabase
      .rpc('match_similar_use_cases', {
        query_embedding: embedding,
        match_threshold: 0.4, 
        match_count: 3,
        customer_id_param: customerId || null
      });

    console.log('[match-use-case] Supabase RPC match_similar_use_cases response. Data length:', similarUseCases?.length, 'Error:', searchError);
    if (searchError) {
      console.error('[match-use-case] Error from RPC match_similar_use_cases:', JSON.stringify(searchError, null, 2));
      throw searchError;
    }

    console.log('Found similar use cases initially:', similarUseCases?.length || 0);
    
    if (hasNewsletterKeyword && (!similarUseCases || similarUseCases.length === 0)) {
      const { data: newsletterUseCases, error: newsletterError } = await supabase
        .from('use_cases')
        .select('id, title, type, information_needed') 
        .ilike('title', '%newsletter%')
        .eq('is_active', true)
        .limit(1);
      console.log('[match-use-case] Newsletter direct search result. Data:', newsletterUseCases, 'Error:', newsletterError);
        
      if (!newsletterError && newsletterUseCases && newsletterUseCases.length > 0) {
        console.log('Found newsletter use case by direct title search');
        const directMatch = newsletterUseCases[0];
        return new Response(JSON.stringify({
          recommended_use_case: {
            id: directMatch.id,
            title: directMatch.title,
            type: directMatch.type,
            information_needed: directMatch.information_needed,
            confidence: 75, 
            reasoning: "Newsletter-bezogene Aufgabe durch direkte Titelübereinstimmung zugeordnet"
          },
          alternative_use_cases: []
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    if (!similarUseCases || similarUseCases.length === 0) {
      console.log('No similar use cases found after initial search and newsletter check.');
      return new Response(JSON.stringify({
        recommended_use_case: null,
        alternative_use_cases: []
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Prepare data for GPT analysis, ensuring all required fields are present
    const gptInputUseCases = similarUseCases.map((uc: UseCaseSuggestion) => ({
      id: uc.id,
      title: uc.title,
      type: uc.type,
      information_needed: uc.information_needed,
    }));

    console.log('[match-use-case] Preparing for GPT analysis. Number of use cases for GPT:', gptInputUseCases.length);
    const gptRequestBody = {
      model: "gpt-4.1", // This model name seems unusual, ensure it's correct for your OpenAI setup
      instructions: `Als Experte für Use Case Matching bei avanti, analysiere bitte diese Aufgabenbeschreibung und die möglichen passenden Use Cases.
      Wähle den am besten passenden Use Case aus und gib eine Begründung.
      Die Use Case Typen sind:
      - information_request: Eine reine Informationsanfrage
      - forwarding_use_case: Ein Anliegen, das weitergeleitet werden muss
      - direct_use_case: Ein Anliegen, das direkt bearbeitet werden kann
      Berücksichtige dabei Inhalt, Prozessähnlichkeit und benötigte Informationen.
      Behandle Variationen von Begriffen wie "Newsletter" als gleichwertig.
      Antworte im folgenden JSON-Format:
      {
        "matched_use_case_id": "ID des best passenden Use Cases",
        "confidence": 0-100,
        "reasoning": "Deine Begründung für die Auswahl"
      }`,
      input: `Aufgabenbeschreibung: "${description}"
      
      Mögliche Use Cases:
      ${JSON.stringify(gptInputUseCases, null, 2)}`,
    };

    console.log('[match-use-case] GPT Request Body (first 500 chars):', JSON.stringify(gptRequestBody).substring(0,500));

    try {
      const analysisResponse = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAIApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(gptRequestBody),
      });

      console.log('[match-use-case] GPT analysis API response status:', analysisResponse.status);
      const analysisData = await analysisResponse.json();
      console.log('[match-use-case] GPT analysis API response data:', JSON.stringify(analysisData, null, 2));

      if (!analysisResponse.ok || !analysisData || analysisData.error) { 
        console.error('[match-use-case] Invalid GPT analysis response. Status:', analysisResponse.status, 'Data:', JSON.stringify(analysisData, null, 2));
        throw new Error('GPT analysis failed or returned an error.');
      }
      
      let responseText = '';
      // Assuming 'item' here is of a structure like { type: string, text?: string }
      if (analysisData.output && Array.isArray(analysisData.output) && analysisData.output.length > 0 && analysisData.output[0].content && Array.isArray(analysisData.output[0].content)) {
        responseText = analysisData.output[0].content.filter((item: { type: string; }) => item.type === 'output_text').map((item: { text?: string; }) => item.text).join('');
      } else if (analysisData.response) {
        responseText = analysisData.response;
      }
      
      if (!responseText) {
        console.error('Could not extract response text from GPT output:', analysisData);
        throw new Error('Could not extract response text from GPT output');
      }
      
      const analysis = JSON.parse(responseText);
      console.log('[match-use-case] Parsed GPT analysis:', analysis);

      const recommendedData = similarUseCases.find((uc: UseCaseSuggestion) => uc.id === analysis.matched_use_case_id);
      let finalRecommendedUseCase = null;

      if (recommendedData) {
        finalRecommendedUseCase = {
          id: recommendedData.id,
          title: recommendedData.title,
          type: recommendedData.type,
          information_needed: recommendedData.information_needed,
          confidence: analysis.confidence,
          reasoning: analysis.reasoning,
        };
      }

      const finalAlternativeUseCases = similarUseCases
        .filter((uc: UseCaseSuggestion) => uc.id !== analysis.matched_use_case_id)
        .map((uc: UseCaseSuggestion) => ({
          id: uc.id,
          title: uc.title,
          type: uc.type,
          information_needed: uc.information_needed,
        }));

      return new Response(JSON.stringify({
        recommended_use_case: finalRecommendedUseCase,
        alternative_use_cases: finalAlternativeUseCases
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } catch (gptOrParseError: any) {
      console.error('Error during GPT analysis or parsing:', gptOrParseError);
      // Fallback: return all similarUseCases as alternatives if GPT processing fails
      const alternatives = similarUseCases.map((uc: UseCaseSuggestion) => ({
        id: uc.id,
        title: uc.title,
        type: uc.type,
        information_needed: uc.information_needed,
      }));
      return new Response(JSON.stringify({
        recommended_use_case: null,
        alternative_use_cases: alternatives
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

  } catch (e: any) {
    console.error('[match-use-case] MAIN CATCH BLOCK ERROR:', e);
    console.error('[match-use-case] Error name:', e.name);
    console.error('[match-use-case] Error message:', e.message);
    console.error('[match-use-case] Error stack:', e.stack);
    console.error('[match-use-case] Error object stringified:', JSON.stringify(e, null, 2));
    return new Response(JSON.stringify({ 
      error: e.message,
      details: e.stack // Optional: include stack for more debug info on server
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
