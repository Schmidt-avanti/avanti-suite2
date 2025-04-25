
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

    // Initialize APIs and clients
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY')!;
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Fetch the task and use case details
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .select('*, messages:task_messages(*)')
      .eq('id', taskId)
      .maybeSingle();

    if (taskError) throw taskError;
    if (!task) throw new Error('Task not found');

    // Fetch the use case if id is provided
    let useCase = null;
    if (useCaseId) {
      const { data: fetchedUseCase, error: useCaseError } = await supabase
        .from('use_cases')
        .select('*')
        .eq('id', useCaseId)
        .maybeSingle();
        
      if (useCaseError) throw useCaseError;
      useCase = fetchedUseCase;
    } else if (task.matched_use_case_id) {
      // Use the matched use case from the task
      const { data: matchedUseCase, error: matchedUseCaseError } = await supabase
        .from('use_cases')
        .select('*')
        .eq('id', task.matched_use_case_id)
        .maybeSingle();
        
      if (matchedUseCaseError) throw matchedUseCaseError;
      useCase = matchedUseCase;
    }

    // Fetch previous messages from the task
    const { data: messages, error: messagesError } = await supabase
      .from('task_messages')
      .select('*')
      .eq('task_id', taskId)
      .order('created_at', { ascending: true });

    if (messagesError) throw messagesError;

    // Build the conversation for the OpenAI API
    let conversationMessages = [];
    
    // Add system message with instructions
    const processMapInstructions = useCase?.process_map ? 
      `\nFolge diesen Prozessschritten:\n${JSON.stringify(useCase.process_map, null, 2)}` : 
      '';

    conversationMessages.push({
      role: "system",
      content: `Du bist Ava, ein hilfreicher Assistent bei avanti-suite, der Nutzern bei ihren Aufgaben hilft.
      
Du bekommst einen Use Case mit allen relevanten Informationen zu einem Prozess oder einer Aufgabe.
Deine Aufgabe ist es, den Nutzer durch diesen Prozess zu führen und ihm zu helfen, die Aufgabe erfolgreich abzuschließen.

Gehe dabei folgendermaßen vor:
1. Begrüße den Nutzer und erkläre kurz die Aufgabe, die bearbeitet werden soll
2. Führe den Nutzer Schritt für Schritt durch den Prozess gemäß den Informationen im Use Case und der process_map
3. Wenn die process_map Entscheidungspunkte enthält oder der Use Case Entscheidungspunkte enthält, stelle Fragen mit Auswahlmöglichkeiten im JSON-Format:
   {
     "text": "Deine Frage an den Nutzer",
     "options": ["Option 1", "Option 2"]
   }
4. Bei jedem Schritt, erkläre was zu tun ist und warum
5. Am Ende des Prozesses, fasse zusammen was erledigt wurde und gib Hinweise auf mögliche nächste Schritte

Halte deine Antworten freundlich, präzise und auf den Punkt. Verwende einfache Sprache und vermeide Fachjargon.

WICHTIG: Formatiere deine Antworten als REINES JSON ohne Markdown-Code-Blöcke, wenn du Optionen anbietest.
Verwende NICHT \`\`\`json oder \`\`\` Markdown-Tags um deine JSON-Antworten. Das führt zu Fehlern bei der Anzeige.

Use Case Details:
${useCase ? `
Titel: ${useCase.title}
Typ: ${useCase.type}
Benötigte Informationen: ${useCase.information_needed || 'Keine spezifischen Informationen benötigt'}
Schritte: ${useCase.steps || 'Keine spezifischen Schritte definiert'}
Erwartetes Ergebnis: ${useCase.expected_result || 'Kein spezifisches Ergebnis definiert'}
Typische Aktivitäten: ${useCase.typical_activities || 'Keine typischen Aktivitäten definiert'}
${processMapInstructions}
` : 'Kein passender Use Case gefunden. Bitte helfe dem Nutzer bestmöglich mit der vorliegenden Aufgabe.'}

Wenn der Nutzer über Buttons antwortet, bekommst du seine Wahl als "buttonChoice" Parameter. Reagiere entsprechend darauf.`
    });

    // Add previous messages to the conversation
    for (const msg of messages) {
      conversationMessages.push({
        role: msg.role,
        content: msg.content
      });
    }

    // If there's a new button choice, add it to the conversation
    if (buttonChoice) {
      conversationMessages.push({
        role: "user", 
        content: `Ich wähle: ${buttonChoice}`
      });
      
      // Save the button choice as a user message
      await supabase.from('task_messages').insert({
        task_id: taskId,
        role: 'user',
        content: `Ich wähle: ${buttonChoice}`
      });
    } 
    // If there's a new text message, add it to the conversation
    else if (message) {
      conversationMessages.push({
        role: "user", 
        content: message
      });
      
      // Save the new message
      await supabase.from('task_messages').insert({
        task_id: taskId,
        role: 'user',
        content: message
      });
    }

    // Call OpenAI API
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

    // Save the assistant's response
    const assistantResponse = responseData.choices[0].message.content;
    
    // Try to clean the response if it contains markdown code blocks
    const cleanedResponse = assistantResponse.replace(/```json\n?|\n?```/g, '').trim();
    
    await supabase.from('task_messages').insert({
      task_id: taskId,
      role: 'assistant',
      content: cleanedResponse
    });

    // Try to parse any potential button options from the response
    let buttonOptions = [];
    try {
      // Look for JSON in the response that might contain button options
      let jsonContent;
      try {
        jsonContent = JSON.parse(cleanedResponse);
        if (jsonContent.options && Array.isArray(jsonContent.options)) {
          buttonOptions = jsonContent.options;
        }
      } catch (e) {
        const jsonMatch = cleanedResponse.match(/\{[\s\S]*?"options"[\s\S]*?\}/);
        if (jsonMatch) {
          const jsonData = JSON.parse(jsonMatch[0]);
          if (jsonData.options && Array.isArray(jsonData.options)) {
            buttonOptions = jsonData.options;
          }
        }
      }
    } catch (e) {
      console.log('No valid button options found in response');
    }

    return new Response(
      JSON.stringify({
        response: cleanedResponse,
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
