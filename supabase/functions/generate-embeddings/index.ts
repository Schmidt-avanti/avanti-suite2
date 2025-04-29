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
    
    // Initialize Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Parse request to get use case IDs if provided
    let useCaseIds: string[] | undefined;
    let articleIds: string[] | undefined;
    let text: string | undefined;
    
    if (req.headers.get('content-type')?.includes('application/json')) {
      const requestData = await req.json();
      useCaseIds = requestData.useCaseIds;
      articleIds = requestData.articleIds;
      text = requestData.text;
    }
    
    // If text is provided, just return an embedding without storing it
    if (text) {
      console.log(`Generating embedding for text: ${text.substring(0, 100)}...`);
      
      const embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAIApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          input: text,
          model: 'text-embedding-3-small',
        }),
      });

      if (!embeddingResponse.ok) {
        const error = await embeddingResponse.text();
        console.error(`OpenAI API error:`, error);
        throw new Error(`OpenAI API error: ${error}`);
      }

      const { data: [{ embedding }] } = await embeddingResponse.json();
      
      return new Response(
        JSON.stringify({ embedding, message: 'Embedding successfully generated' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Process use cases if specified
    const processedUseCases = [];
    if (useCaseIds !== undefined || articleIds === undefined) {
      console.log(`Starting embedding generation for use cases${useCaseIds ? ' with specific IDs' : ''}`);
      
      // Build query for use cases
      let query = supabase
        .from('use_cases')
        .select('id, title, type, information_needed, steps')
        .neq('type', 'knowledge_article')
        .eq('is_active', true);
      
      // If specific IDs are provided, filter by those IDs
      if (useCaseIds && useCaseIds.length > 0) {
        query = query.in('id', useCaseIds);
      } else {
        // Otherwise, only get cases without embeddings
        query = query.is('embedding', null);
      }
      
      // Execute the query
      const { data: useCases, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      console.log(`Found ${useCases?.length || 0} use cases to process`);

      // Process each use case
      if (useCases && useCases.length > 0) {
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

          processedUseCases.push(useCase.id);
          console.log(`Successfully updated use case ${useCase.id} with embedding`);
        }
      }
    }
    
    // Process knowledge articles if specified
    const processedArticles = [];
    if (articleIds !== undefined) {
      console.log(`Starting embedding generation for knowledge articles${articleIds ? ' with specific IDs' : ''}`);
      
      // Build query for knowledge articles
      let articleQuery = supabase
        .from('knowledge_articles')
        .select('id, title, content')
        .eq('is_active', true);
      
      // If specific article IDs are provided, filter by those IDs
      if (articleIds && articleIds.length > 0) {
        articleQuery = articleQuery.in('id', articleIds);
      } else {
        // Otherwise, only get articles without embeddings
        articleQuery = articleQuery.is('embedding', null);
      }
      
      // Execute the query
      const { data: articles, error: fetchArticleError } = await articleQuery;

      if (fetchArticleError) throw fetchArticleError;

      console.log(`Found ${articles?.length || 0} knowledge articles to process`);

      // Process each knowledge article
      if (articles && articles.length > 0) {
        for (const article of articles) {
          // Combine relevant fields for embedding
          const textForEmbedding = [
            article.title,
            article.content
          ].filter(Boolean).join('\n');

          console.log(`Generating embedding for knowledge article ${article.id}`);

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
            console.error(`OpenAI API error for article ${article.id}:`, error);
            continue;
          }

          const { data: [{ embedding }] } = await embeddingResponse.json();

          // Update knowledge article with embedding
          const { error: updateError } = await supabase
            .from('knowledge_articles')
            .update({ embedding })
            .eq('id', article.id);

          if (updateError) {
            console.error(`Error updating knowledge article ${article.id}:`, updateError);
            continue;
          }

          processedArticles.push(article.id);
          console.log(`Successfully updated knowledge article ${article.id} with embedding`);
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        message: `Processing complete. Processed ${processedUseCases.length} use cases and ${processedArticles.length} knowledge articles.`,
        processedUseCases,
        processedArticles 
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
