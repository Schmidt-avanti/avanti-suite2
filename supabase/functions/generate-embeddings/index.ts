
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
    // Initialize OpenAI API
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY')!;
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    console.log('Starting embedding generation for use cases...');

    // Initialize Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Fetch all use cases without embeddings, excluding knowledge articles
    const { data: useCases, error: fetchError } = await supabase
      .from('use_cases')
      .select('id, title, type, information_needed, steps')
      .neq('type', 'knowledge_article')
      .is('embedding', null)
      .eq('is_active', true);

    if (fetchError) throw fetchError;

    console.log(`Found ${useCases?.length || 0} use cases without embeddings`);

    if (!useCases || useCases.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No use cases found needing embeddings' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Process each use case
    const processed = [];
    for (const useCase of useCases) {
      // Combine relevant fields for embedding
      const textForEmbedding = [
        useCase.title,
        useCase.information_needed,
        useCase.steps
      ].filter(Boolean).join('\n');

      console.log(`Generating embedding for use case ${useCase.id}`);

      // Generate embedding using OpenAI
      const embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAIApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          input: textForEmbedding,
          model: 'text-embedding-3-small',
        }),
      });

      if (!embeddingResponse.ok) {
        const error = await embeddingResponse.text();
        console.error(`OpenAI API error for use case ${useCase.id}:`, error);
        continue;
      }

      const { data: [{ embedding }] } = await embeddingResponse.json();

      // Update use case with embedding
      const { error: updateError } = await supabase
        .from('use_cases')
        .update({ embedding })
        .eq('id', useCase.id);

      if (updateError) {
        console.error(`Error updating use case ${useCase.id}:`, updateError);
        continue;
      }

      processed.push(useCase.id);
      console.log(`Successfully updated use case ${useCase.id} with embedding`);
    }

    return new Response(
      JSON.stringify({ 
        message: `Successfully processed ${processed.length} use cases`,
        processed 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-embeddings function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
