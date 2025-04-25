
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, useGPTFallback } = await req.json();

    if (!query || typeof query !== 'string') {
      throw new Error('Query is required and must be a string');
    }

    // Get the API key from environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

    // Create a Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // First try to find knowledge articles that match the query
    let knowledgeResponse = null;
    const embedding = await generateEmbedding(query);

    if (embedding) {
      const { data: articles, error } = await supabase.rpc(
        'match_similar_use_cases',
        {
          query_embedding: embedding,
          match_threshold: 0.70,  // Adjust this threshold as needed
          match_count: 5
        }
      );

      if (error) {
        console.error('Error searching knowledge articles:', error);
      } else if (articles && articles.length > 0) {
        // Get the most relevant article
        const bestMatch = articles[0];
        knowledgeResponse = {
          source: 'knowledge',
          title: bestMatch.title,
          content: bestMatch.steps || bestMatch.information_needed,
          confidence: bestMatch.similarity
        };
      }
    }

    // If no knowledge articles found or confidence is low, and fallback is enabled, use OpenAI
    if (!knowledgeResponse && useGPTFallback) {
      const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
      if (!openAIApiKey) {
        throw new Error('OpenAI API key not configured');
      }

      const gptResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openAIApiKey}`
        },
        body: JSON.stringify({
          model: "gpt-4o",
          messages: [
            {
              role: "system",
              content: "Du bist ein sachlicher, fachlicher Support-Assistent für avanti-suite, ein Tool für Aufgabenverwaltung und Kundenkommunikation. Antworte prägnant und hilfreich, ohne Smalltalk oder Emojis. Fokussiere dich auf rein sachliche Informationen. Wenn du die Antwort nicht kennst, sage das direkt ohne Ausschmückung."
            },
            {
              role: "user",
              content: query
            }
          ],
        })
      });

      const gptData = await gptResponse.json();
      if (gptData.choices && gptData.choices.length > 0) {
        knowledgeResponse = {
          source: 'gpt',
          content: gptData.choices[0].message.content,
          confidence: 0.9  // Arbitrary confidence for GPT responses
        };
      }
    }

    return new Response(
      JSON.stringify({
        result: knowledgeResponse || { 
          source: 'none',
          content: "Es wurden keine passenden Informationen gefunden. Bitte formulieren Sie Ihre Frage anders oder kontaktieren Sie den Support.", 
          confidence: 0 
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in knowledge-chat function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Helper function to generate embedding for semantic search
async function generateEmbedding(text: string): Promise<number[] | null> {
  try {
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      console.error('OpenAI API key not configured');
      return null;
    }

    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openAIApiKey}`
      },
      body: JSON.stringify({
        model: 'text-embedding-ada-002',
        input: text
      })
    });

    const { data } = await response.json();
    if (data && data[0] && data[0].embedding) {
      return data[0].embedding;
    }
    return null;
  } catch (error) {
    console.error('Error generating embedding:', error);
    return null;
  }
}
