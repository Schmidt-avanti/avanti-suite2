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
    // Init OpenAI & Supabase
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json();
    let ids: string[] = [];
    if (body.id) {
      ids = [body.id];
    } else if (Array.isArray(body.ids)) {
      ids = body.ids;
    }

    if (!ids.length) {
      return new Response(JSON.stringify({ error: 'No use case id(s) provided.' }), { status: 400, headers: corsHeaders });
    }

    // Hole alle gewünschten Use Cases
    const { data: useCases, error } = await supabase
      .from('new_use_cases')
      .select('id, title, description, goal, steps')
      .in('id', ids);

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
    }

    const processed: string[] = [];
    for (const uc of useCases) {
      // Embedding-Text zusammenbauen
      const text = [uc.title, uc.description, uc.goal, JSON.stringify(uc.steps || {})].filter(Boolean).join('\n');
      // OpenAI Embedding holen
      const embeddingRes = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openAIApiKey}`,
        },
        body: JSON.stringify({
          input: text,
          model: 'text-embedding-ada-002',
        }),
      });
      if (!embeddingRes.ok) continue;
      const embeddingJson = await embeddingRes.json();
      const embedding = embeddingJson.data?.[0]?.embedding;
      if (!embedding) continue;
      // Embedding in DB speichern (immer überschreiben)
      await supabase
        .from('new_use_cases')
        .update({ embedding })
        .eq('id', uc.id);
      processed.push(uc.id);
    }

    return new Response(JSON.stringify({ message: `Successfully processed ${processed.length} use case(s)`, processed }), { status: 200, headers: corsHeaders });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: corsHeaders });
  }
}); 