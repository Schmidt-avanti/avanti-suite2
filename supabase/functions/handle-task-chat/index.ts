
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper function to implement exponential backoff
async function fetchWithRetry(url: string, options: RequestInit, maxRetries = 3) {
  let retries = 0;
  let lastError;

  while (retries < maxRetries) {
    try {
      const response = await fetch(url, options);
      const data = await response.json();
      
      // If we hit rate limits, wait and retry
      if (response.status === 429) {
        const retryAfterStr = data?.error?.message?.match(/try again in (\d+\.\d+)s/i)?.[1];
        const retryAfter = retryAfterStr ? parseFloat(retryAfterStr) * 1000 : (2 ** retries) * 1000;
        console.log(`Rate limited. Retrying after ${retryAfter}ms`);
        await new Promise(resolve => setTimeout(resolve, retryAfter));
        retries++;
        continue;
      }
      
      if (!response.ok) {
        throw new Error(`API error: ${data.error?.message || JSON.stringify(data)}`);
      }
      
      return data;
    } catch (error) {
      lastError = error;
      // Only retry on rate limit errors
      if (error.message?.includes('rate limit')) {
        const retryAfterStr = error.message.match(/try again in (\d+\.\d+)s/i)?.[1];
        const retryAfter = retryAfterStr ? parseFloat(retryAfterStr) * 1000 : (2 ** retries) * 1000;
        console.log(`Rate limited. Retrying after ${retryAfter}ms`);
        await new Promise(resolve => setTimeout(resolve, retryAfter));
        retries++;
      } else {
        throw error; // Don't retry other errors
      }
    }
  }

  throw lastError || new Error('Max retries exceeded');
}

// Helper function to format the assistant response
function formatAssistantResponse(response: string, useCase: any, selectedOptions: string[]): string {
  // Try to parse the response as JSON first (in case it's already in the correct format)
  try {
    const parsedResponse = JSON.parse(response);
    if (parsedResponse.text && parsedResponse.options) {
      return response; // Already in the correct format
    }
  } catch (e) {
    // Not JSON, continue with formatting
  }
  
  // Default options for the schlüssel verloren use case
  let options: string[] = [];
  
  // Check if we're in the initial state of the Schlüssel verloren use case
  if (useCase && useCase.title?.toLowerCase().includes('schlüssel') && selectedOptions.length === 0) {
    options = ["Hausschlüssel", "Wohnungsschlüssel", "Briefkastenschlüssel"];
  } else if (selectedOptions.includes("Hausschlüssel")) {
    options = ["1 Schlüssel", "2 Schlüssel", "3 oder mehr Schlüssel"];
  } else if (selectedOptions.includes("Wohnungsschlüssel")) {
    options = ["Mietwohnung", "Eigentumswohnung"];
  } else if (selectedOptions.includes("Briefkastenschlüssel")) {
    options = ["Ich kenne die Briefkastennummer", "Ich weiß nicht welche Nummer mein Briefkasten hat"];
  }

  // Create a formatted response
  const formattedResponse = {
    text: response,
    options: options
  };

  return JSON.stringify(formattedResponse);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { taskId, useCaseId, message, buttonChoice, previousResponseId, selectedOptions = [] } = await req.json();

    if (!taskId) {
      throw new Error('Task ID is required');
    }

    const openAIApiKey = Deno.env.get('OPENAI_API_KEY')!;
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Check if we already have messages for this task
    const { data: existingMessages, error: messagesError } = await supabase
      .from('task_messages')
      .select('*')
      .eq('task_id', taskId)
      .order('created_at', { ascending: true });
    
    // If there are already messages from both user and assistant, don't auto-send
    if (existingMessages && existingMessages.length > 2) {
      const hasUserMessage = existingMessages.some(msg => msg.role === 'user');
      const hasAssistantMessage = existingMessages.some(msg => msg.role === 'assistant');
      
      // If this is an empty message (auto-start) and we already have a conversation going
      if (!message && !buttonChoice && hasUserMessage && hasAssistantMessage) {
        return new Response(
          JSON.stringify({
            message: "Chat already initialized, not sending automatic message"
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

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

    const { data: messages, error: messagesError2 } = await supabase
      .from('task_messages')
      .select('*')
      .eq('task_id', taskId)
      .order('created_at', { ascending: true });

    if (messagesError2) throw messagesError2;

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

    // Call OpenAI using the responses API with retry mechanism
    const responseData = await fetchWithRetry('https://api.openai.com/v1/chat/completions', {
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
    
    let assistantResponse = responseData.choices[0].message.content;
    
    // Format the response to include options if necessary
    assistantResponse = formatAssistantResponse(assistantResponse, useCase, selectedOptions);
    
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
      JSON.stringify({ 
        error: error.message,
        is_rate_limit: error.message?.includes('rate limit')
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
