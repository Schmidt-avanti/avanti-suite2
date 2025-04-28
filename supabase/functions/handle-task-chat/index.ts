
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
    const { taskId, useCaseId, message, buttonChoice, selectedOptions = [] } = await req.json();

    if (!taskId) {
      throw new Error('Task ID is required');
    }

    const openAIApiKey = Deno.env.get('OPENAI_API_KEY')!;
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .select('*, messages:task_messages(*)')
      .eq('id', taskId)
      .maybeSingle();

    if (taskError) throw taskError;
    if (!task) throw new Error('Task not found');

    let useCase = null;
    if (useCaseId) {
      const { data: fetchedUseCase, error: useCaseError } = await supabase
        .from('use_cases')
        .select('*')
        .eq('id', useCaseId)
        .maybeSingle();
        
      if (useCaseError) throw useCaseError;
      useCase = fetchedUseCase;
    }

    const { data: messages, error: messagesError } = await supabase
      .from('task_messages')
      .select('*')
      .eq('task_id', taskId)
      .order('created_at', { ascending: true });

    if (messagesError) throw messagesError;

    let conversationMessages = [];
    
    // Create a system message with information about already selected options
    let systemPrompt = `Du bist Ava, ein hilfreicher Assistent bei avanti-suite.`;
    
    if (useCase) {
      systemPrompt += `\n\nFolge diesem Use Case für die Aufgabe:
      Titel: ${useCase.title}
      Typ: ${useCase.type}
      Benötigte Informationen: ${useCase.information_needed || 'Keine spezifischen Informationen benötigt'}
      Schritte: ${useCase.steps || 'Keine spezifischen Schritte definiert'}
      ${useCase.process_map ? `\nFolge diesen Prozessschritten:\n${JSON.stringify(useCase.process_map, null, 2)}` : ''}`;
      
      // Only show the option buttons if none have been selected yet
      if (selectedOptions.length === 0) {
        systemPrompt += `\n\nBei der ersten Frage des Nutzers biete folgende Optionen an:
        ["Hausschlüssel", "Wohnungsschlüssel", "Briefkastenschlüssel"]`;
      }
      
      if (selectedOptions.includes("Hausschlüssel")) {
        systemPrompt += `\n\nDer Nutzer hat "Hausschlüssel" gewählt. Frage nach der Anzahl der Schlüssel.`;
      } else if (selectedOptions.includes("Wohnungsschlüssel")) {
        systemPrompt += `\n\nDer Nutzer hat "Wohnungsschlüssel" gewählt. Frage nach der Wohnungsnummer.`;
      } else if (selectedOptions.includes("Briefkastenschlüssel")) {
        systemPrompt += `\n\nDer Nutzer hat "Briefkastenschlüssel" gewählt. Frage nach der Briefkastennummer.`;
      }
      
      systemPrompt += `\n\nFormatiere deine Antworten als JSON mit text und options Eigenschaften.`;
    } else {
      systemPrompt += '\n\nKeine Use Case Information verfügbar.';
    }
    
    conversationMessages.push({
      role: "system",
      content: systemPrompt
    });

    for (const msg of messages) {
      conversationMessages.push({
        role: msg.role,
        content: msg.content
      });
    }

    if (buttonChoice) {
      conversationMessages.push({
        role: "user",
        content: buttonChoice
      });
    }

    if (message) {
      conversationMessages.push({
        role: "user",
        content: message
      });
    }

    // Call OpenAI using the responses API
    const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: "gpt-4.1",
        messages: conversationMessages,
        temperature: 0.7,
        max_tokens: 1500
      })
    });

    const responseData = await openAIResponse.json();
    
    if (openAIResponse.status !== 200) {
      console.error('OpenAI API error:', responseData);
      throw new Error(`OpenAI API error: ${responseData.error?.message || 'Unknown error'}`);
    }

    const assistantResponse = responseData.choices[0].message.content;
    
    // Insert the assistant's response
    const { data: insertedMessage, error: insertError } = await supabase
      .from('task_messages')
      .insert({
        task_id: taskId,
        role: 'assistant',
        content: assistantResponse
      })
      .select('id')
      .single();
      
    if (insertError) throw insertError;

    return new Response(
      JSON.stringify({
        response: assistantResponse,
        response_id: insertedMessage?.id
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in handle-task-chat function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
