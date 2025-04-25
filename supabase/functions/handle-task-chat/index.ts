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
    const { 
      taskId, 
      useCaseId, 
      message, 
      previousResponseId,
      buttonChoice 
    } = await req.json();

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
    
    conversationMessages.push({
      role: "system",
      content: `Du bist Ava, ein hilfreicher Assistent bei avanti-suite, der Nutzern bei ihren Aufgaben hilft.
      
${useCase ? `
Du bekommst einen Use Case mit allen relevanten Informationen zu einem Prozess oder einer Aufgabe.
Deine Aufgabe ist es, den Nutzer durch diesen Prozess zu führen und ihm zu helfen, die Aufgabe erfolgreich abzuschließen.

Use Case Details:
Titel: ${useCase.title}
Typ: ${useCase.type}
Benötigte Informationen: ${useCase.information_needed || 'Keine spezifischen Informationen benötigt'}
Schritte: ${useCase.steps || 'Keine spezifischen Schritte definiert'}
Erwartetes Ergebnis: ${useCase.expected_result || 'Kein spezifisches Ergebnis definiert'}
${useCase.process_map ? `\nFolge diesen Prozessschritten:\n${JSON.stringify(useCase.process_map, null, 2)}` : ''}
` : `
Da kein passender Use Case gefunden wurde, ist deine Aufgabe:
1. Stelle relevante Fragen, um das Problem besser zu verstehen
2. Sammle wichtige Informationen
3. Sobald du genug Informationen hast oder keine passende Lösung findest, informiere den Nutzer, dass sein Anliegen an einen Teamleiter weitergeleitet wird.
4. Gib KEINE konkreten Handlungsempfehlungen oder Lösungsvorschläge.
`}

Halte deine Antworten freundlich, präzise und auf den Punkt. Verwende einfache Sprache und vermeide Fachjargon.

WICHTIG: 
- Formatiere deine Antworten als REINES JSON ohne Markdown.
- Wenn du Optionen anbietest, verwende dieses Format:
{
  "text": "Deine Frage an den Nutzer",
  "options": ["Option 1", "Option 2"]
}

Wenn der Nutzer über Buttons antwortet, bekommst du seine Wahl als "buttonChoice" Parameter.`
    });

    for (const msg of messages) {
      conversationMessages.push({
        role: msg.role,
        content: msg.content
      });
    }

    if (!useCase && messages.length >= 6) {
      // After 3 exchanges (6 messages including both user and assistant),
      // forward to team leader if no use case matches
      await supabase
        .from('tasks')
        .update({ forwarded_to: 'team_leader' })
        .eq('id', taskId);

      return new Response(
        JSON.stringify({
          response: JSON.stringify({
            text: "Ich habe jetzt genug Informationen gesammelt. Da ich keine direkte Lösung für dein spezifisches Problem habe, leite ich dein Anliegen an einen Teamleiter weiter. Der Teamleiter wird sich zeitnah mit einer passenden Lösung bei dir melden. Vielen Dank für deine Geduld!",
            options: []
          })
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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
    
    // Properly format the response to ensure consistent JSON structure
    let cleanedResponse = assistantResponse.replace(/```json\n?|\n?```/g, '').trim();
    let formattedResponse = cleanedResponse;
    let buttonOptions = [];
    
    try {
      // First try: attempt to parse as JSON directly
      try {
        const jsonContent = JSON.parse(cleanedResponse);
        
        // If it parsed successfully but doesn't have the expected structure, add it
        if (!jsonContent.text && typeof cleanedResponse === 'string' && !cleanedResponse.includes('"options"')) {
          formattedResponse = JSON.stringify({ 
            "text": cleanedResponse,
            "options": [] 
          });
        }
        
        // Extract button options if they exist
        if (jsonContent.options && Array.isArray(jsonContent.options)) {
          buttonOptions = jsonContent.options;
        }
      } catch (e) {
        // Second try: If it's not JSON, assume it's plain text and format it
        if (!cleanedResponse.includes('"text"') && !cleanedResponse.includes('"options"')) {
          formattedResponse = JSON.stringify({ 
            "text": cleanedResponse,
            "options": [] 
          });
        } else {
          // Third try: It might be malformatted JSON with options
          const jsonMatch = cleanedResponse.match(/\{[\s\S]*?"options"[\s\S]*?\}/);
          if (jsonMatch) {
            try {
              const jsonData = JSON.parse(jsonMatch[0]);
              if (jsonData.options && Array.isArray(jsonData.options)) {
                buttonOptions = jsonData.options;
                formattedResponse = JSON.stringify(jsonData);
              }
            } catch (e) {
              console.log('Failed to extract button options:', e);
            }
          }
        }
      }
    } catch (e) {
      console.log('Error formatting response:', e);
    }
    
    // Save the assistant's response to the database
    await supabase.from('task_messages').insert({
      task_id: taskId,
      role: 'assistant',
      content: formattedResponse
    });

    return new Response(
      JSON.stringify({
        response: formattedResponse,
        button_options: buttonOptions
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
