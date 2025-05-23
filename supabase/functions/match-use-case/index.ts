
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
    const { description, customerId } = await req.json();

    if (!description) {
      throw new Error('Description is required');
    }

    // Initialize OpenAI API
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY')!;
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    console.log('Generating embedding for description:', description.substring(0, 100) + '...');
    console.log('Customer ID:', customerId || 'Not provided');

    // Pre-process input with simple fuzzy matching for common cases
    // This helps with minor misspellings and variations
    let enhancedDescription = description;
    
    // For newsletter-related queries, enhance the description to improve matching
    const newsletterKeywords = ['news letter', 'newsletter', 'news-letter', 'newsleter', 'newsltr', 'newslett'];
    const hasNewsletterKeyword = newsletterKeywords.some(keyword => 
      description.toLowerCase().includes(keyword)
    );
    
    if (hasNewsletterKeyword) {
      // Expand the description with common variations for better semantic matching
      enhancedDescription = `${description} newsletter anmeldung newsletter registration`;
      console.log('Enhanced description for newsletter-related query');
    }

    // 1. Generate embedding for the enhanced task description
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

    const embeddingData = await embeddingResponse.json();
    const embedding = embeddingData.data[0].embedding;

    // 2. Find similar use cases using our new database function
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const { data: similarUseCases, error: searchError } = await supabase
      .rpc('match_similar_use_cases', {
        query_embedding: embedding,
        match_threshold: 0.4, // Lowered threshold to catch more potential matches
        match_count: 3,
        customer_id_param: customerId || null // Pass the customer ID parameter
      });

    if (searchError) throw searchError;

    console.log('Found similar use cases:', similarUseCases?.length || 0);
    
    // If we have newsletter keywords but no matches, let's try to find newsletter-specific use cases
    if (hasNewsletterKeyword && (!similarUseCases || similarUseCases.length === 0)) {
      const { data: newsletterUseCases, error: newsletterError } = await supabase
        .from('use_cases')
        .select('id, title, type, information_needed, steps')
        .ilike('title', '%newsletter%')
        .eq('is_active', true)
        .limit(1);
        
      if (!newsletterError && newsletterUseCases && newsletterUseCases.length > 0) {
        console.log('Found newsletter use case by direct title search');
        return new Response(JSON.stringify({
          matched_use_case_id: newsletterUseCases[0].id,
          confidence: 75,
          reasoning: "Newsletter-bezogene Aufgabe durch direkte Titelübereinstimmung zugeordnet"
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

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
        model: "gpt-4.1", // Erforderlicher 'model' Parameter
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
        
        Behandle Variationen von Begriffen wie "Newsletter", "news letter" oder "newslett" als gleichwertig.
        Sei besonders aufmerksam bei Newsletter-bezogenen Anfragen, da diese häufig vorkommen.
        
        Antworte im folgenden JSON-Format:
        {
          "matched_use_case_id": "ID des best passenden Use Cases",
          "confidence": 0-100,
          "reasoning": "Deine Begründung für die Auswahl"
        }`,
        input: `Aufgabenbeschreibung: "${description}"
        
        Mögliche Use Cases:
        ${JSON.stringify(similarUseCases, null, 2)}`
      })
    });

    const analysisData = await analysisResponse.json();
    
    // Check if we have a valid response and log the structure for debugging
    console.log('Response structure:', Object.keys(analysisData));
    
    if (!analysisData || analysisData.error) {
      console.error('Invalid analysis response:', analysisData);
      return new Response(JSON.stringify({
        error: 'Invalid AI response',
        details: analysisData
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // Handle the new response format from OpenAI's v1/responses endpoint
    try {
      // Extract the actual content from the new response format
      let responseText = '';
      
      if (analysisData.output && 
          Array.isArray(analysisData.output) && 
          analysisData.output.length > 0 && 
          analysisData.output[0].content && 
          Array.isArray(analysisData.output[0].content)) {
        
        // Extract text from the first content item
        responseText = analysisData.output[0].content
          .filter(item => item.type === 'output_text')
          .map(item => item.text)
          .join('');
      } else if (analysisData.response) {
        // Fallback for old API format
        responseText = analysisData.response;
      }
      
      if (!responseText) {
        throw new Error('Could not extract response text from AI output');
      }
      
      const analysis = JSON.parse(responseText);
      
      console.log('Analysis completed:', {
        matched_id: analysis.matched_use_case_id,
        confidence: analysis.confidence
      });

      return new Response(JSON.stringify(analysis), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } catch (parseError) {
      console.error('Error parsing analysis result:', parseError);
      console.error('Raw response:', analysisData);
      
      // If we have newsletter keywords, default to the first use case for newsletter
      if (hasNewsletterKeyword && similarUseCases.length > 0) {
        console.log('Defaulting to first use case due to newsletter keywords');
        return new Response(JSON.stringify({
          matched_use_case_id: similarUseCases[0].id,
          confidence: 65,
          reasoning: "Automatisch zugewiesen basierend auf Newsletter-bezogenen Schlüsselwörtern"
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
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
