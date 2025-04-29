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
    
    // Parse request to get IDs if provided
    let useCaseIds: string[] | undefined;
    let knowledgeArticleIds: string[] | undefined;
    let entityType = 'all'; // Default to processing both types
    
    if (req.headers.get('content-type')?.includes('application/json')) {
      const requestData = await req.json();
      useCaseIds = requestData.useCaseIds;
      knowledgeArticleIds = requestData.knowledgeArticleIds;
      entityType = requestData.entityType || 'all';
    }
    
    const processed = [];
    let processedCount = 0;
    
    // Process Use Cases if requested
    if (entityType === 'all' || entityType === 'use_cases') {
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

          processed.push({ type: 'use_case', id: useCase.id });
          processedCount++;
          console.log(`Successfully updated use case ${useCase.id} with embedding`);
        }
      }
    }
    
    // Process Knowledge Articles if requested
    if (entityType === 'all' || entityType === 'knowledge_articles') {
      console.log(`Starting embedding generation for knowledge articles${knowledgeArticleIds ? ' with specific IDs' : ''}`);
      
      // Build query for knowledge articles
      let kaQuery = supabase
        .from('knowledge_articles')
        .select('id, title, content, customer_id')
        .eq('is_active', true);
      
      // If specific IDs are provided, filter by those IDs
      if (knowledgeArticleIds && knowledgeArticleIds.length > 0) {
        kaQuery = kaQuery.in('id', knowledgeArticleIds);
      } else {
        // Otherwise, only get articles without embeddings
        kaQuery = kaQuery.is('embedding', null);
      }
      
      // Execute the query
      const { data: knowledgeArticles, error: kaFetchError } = await kaQuery;

      if (kaFetchError) throw kaFetchError;

      console.log(`Found ${knowledgeArticles?.length || 0} knowledge articles to process`);

      // Process each knowledge article
      if (knowledgeArticles && knowledgeArticles.length > 0) {
        for (const article of knowledgeArticles) {
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
            console.error(`OpenAI API error for knowledge article ${article.id}:`, error);
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

          processed.push({ type: 'knowledge_article', id: article.id });
          processedCount++;
          console.log(`Successfully updated knowledge article ${article.id} with embedding`);
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        message: `Successfully processed ${processedCount} items (${processed.filter(p => p.type === 'use_case').length} use cases, ${processed.filter(p => p.type === 'knowledge_article').length} knowledge articles)`,
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
