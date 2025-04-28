
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
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase configuration is missing');
    }

    // Create a Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("Searching for query:", query);

    // First try direct keyword search with lower threshold for better matches
    let knowledgeResponse = null;
    const embedding = await generateEmbedding(query);

    if (embedding) {
      const { data: articles, error } = await supabase.rpc(
        'match_similar_use_cases',
        {
          query_embedding: embedding,
          match_threshold: 0.65,  // Lowered threshold for better matching
          match_count: 5
        }
      );

      if (error) {
        console.error('Error searching knowledge articles:', error);
        throw new Error(`Supabase RPC error: ${error.message || 'Unknown error'}`);
      } else if (articles && articles.length > 0) {
        // Log the found articles for debugging
        console.log("Found articles:", articles.map(a => ({title: a.title, similarity: a.similarity})));
        
        // Get the most relevant article
        const bestMatch = articles[0];
        knowledgeResponse = {
          source: 'knowledge',
          title: bestMatch.title,
          content: bestMatch.steps || bestMatch.information_needed,
          confidence: bestMatch.similarity
        };
      } else {
        console.log("No articles found with semantic search");
      }
    }

    // If no knowledge articles found with semantic search, try a keyword-based search
    if (!knowledgeResponse) {
      console.log("Attempting keyword search");
      // Extract keywords from the query and search for them
      const keywords = extractKeywords(query);
      console.log("Extracted keywords:", keywords);
      
      if (keywords.length > 0) {
        const { data: keywordResults, error } = await supabase
          .from('use_cases')
          .select('id, title, type, information_needed, steps')
          .or(keywords.map(keyword => `title.ilike.%${keyword}%`).join(','))
          .eq('is_active', true)
          .order('created_at', { ascending: false })
          .limit(5);
        
        if (error) {
          console.error('Error in keyword search:', error);
        } else if (keywordResults && keywordResults.length > 0) {
          console.log("Found articles by keywords:", keywordResults.map(a => a.title));
          const bestKeywordMatch = keywordResults[0];
          knowledgeResponse = {
            source: 'knowledge',
            title: bestKeywordMatch.title,
            content: bestKeywordMatch.steps || bestKeywordMatch.information_needed,
            confidence: 0.75 // Arbitrary confidence for keyword matches
          };
        }
      }
    }

    // If no knowledge articles found or confidence is low, and fallback is enabled, use OpenAI
    if (!knowledgeResponse && useGPTFallback) {
      const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
      if (!openAIApiKey) {
        throw new Error('OpenAI API key not configured');
      }

      // Korrigierte Implementierung für die Responses API
      const gptResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openAIApiKey}`
        },
        body: JSON.stringify({
          model: "gpt-4.1",
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
          temperature: 0.7
        })
      });

      if (!gptResponse.ok) {
        const errorData = await gptResponse.json().catch(() => ({}));
        console.error('OpenAI API error:', errorData);
        throw new Error(`OpenAI API error: ${errorData.error?.message || `Status ${gptResponse.status}`}`);
      }

      const gptData = await gptResponse.json();
      if (gptData.choices && gptData.choices[0] && gptData.choices[0].message) {
        knowledgeResponse = {
          source: 'gpt',
          content: gptData.choices[0].message.content,
          confidence: 0.9  // Arbitrary confidence for GPT responses
        };
      } else {
        throw new Error('Invalid response format from OpenAI');
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
      JSON.stringify({ 
        error: error.message,
        errorCode: error.code || 'UNKNOWN_ERROR'
      }),
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

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('OpenAI embeddings API error:', errorData);
      throw new Error(`OpenAI embeddings API error: ${errorData.error?.message || `Status ${response.status}`}`);
    }

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

// Helper function to extract relevant keywords from a query
function extractKeywords(query: string): string[] {
  // Normalize the query
  const normalizedQuery = query.toLowerCase().trim();
  
  // Define common German stopwords to filter out
  const stopwords = ['der', 'die', 'das', 'ein', 'eine', 'zu', 'und', 'in', 'mit', 'für', 'von', 'bei', 'im', 'auf', 'ist', 'sind', 'haben', 'hat', 'war'];
  
  // Important keywords to specifically look for
  const importantTopics = ['schlüssel', 'verloren', 'verlust', 'wohnungsschlüssel', 'schließanlage', 'mieter', 'beleuchtung', 'defekt', 'bestellung', 'retoure', 'lieferadresse', 'kunde'];
  
  // Extract all words from the query
  let words = normalizedQuery
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, " ") // Remove punctuation
    .split(/\s+/)
    .filter(word => word.length > 2 && !stopwords.includes(word));
  
  // Check for important keywords first
  const foundImportant = importantTopics.filter(topic => 
    normalizedQuery.includes(topic) || 
    words.some(word => word.startsWith(topic) || word.endsWith(topic))
  );
  
  // If no important keywords found, use the longest words (likely most significant)
  if (foundImportant.length === 0) {
    words.sort((a, b) => b.length - a.length);
    return words.slice(0, 3); // Return top 3 longest words
  }
  
  return foundImportant;
}
