
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TaskMessage {
  id: string;
  task_id: string;
  role: 'assistant' | 'user';
  content: string;
  created_at: string;
  metadata?: {
    step?: number;
    selection?: string;
    use_case_progress?: {
      current_step: number;
      total_steps: number;
      completed_steps: string[];
    };
  };
}

interface UseCase {
  id: string;
  title: string;
  type: string;
  steps: string[];
  information_needed?: string;
  expected_result?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Handling task chat request");
    const { 
      taskId, 
      useCaseId, 
      message, 
      buttonChoice 
    } = await req.json();

    console.log("Request payload:", { taskId, useCaseId, message, buttonChoice });

    if (!taskId) {
      throw new Error('Task ID is required');
    }

    const openAIApiKey = Deno.env.get('OPENAI_API_KEY')!;
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    if (!openAIApiKey || !supabaseUrl || !supabaseServiceKey) {
      console.error("Missing environment variables:", {
        hasOpenAI: !!openAIApiKey,
        hasSupabaseUrl: !!supabaseUrl,
        hasServiceKey: !!supabaseServiceKey
      });
      throw new Error('Missing required environment variables');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get task and previous messages
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .select('*, messages:task_messages(*)')
      .eq('id', taskId)
      .maybeSingle();

    if (taskError) {
      console.error("Task fetch error:", taskError);
      throw taskError;
    }
    
    if (!task) {
      console.error("Task not found:", taskId);
      throw new Error('Task not found');
    }

    console.log("Task fetched successfully:", task.id);

    // Get use case if it exists
    let useCase: UseCase | null = null;
    if (useCaseId) {
      console.log("Fetching use case:", useCaseId);
      const { data: fetchedUseCase, error: useCaseError } = await supabase
        .from('use_cases')
        .select('*')
        .eq('id', useCaseId)
        .maybeSingle();
        
      if (useCaseError) {
        console.error("Use case fetch error:", useCaseError);
        throw useCaseError;
      }
      
      useCase = fetchedUseCase;
      console.log("Use case fetched:", useCase ? useCase.title : "Not found");
    }

    // Get previous messages and their metadata
    const { data: messages, error: messagesError } = await supabase
      .from('task_messages')
      .select('*')
      .eq('task_id', taskId)
      .order('created_at', { ascending: true });

    if (messagesError) {
      console.error("Messages fetch error:", messagesError);
      throw messagesError;
    }

    console.log(`Fetched ${messages.length} previous messages`);

    // Track use case progress through message metadata
    let currentStep = 0;
    let completedSteps: string[] = [];

    if (useCase && messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.metadata?.use_case_progress) {
        currentStep = lastMessage.metadata.use_case_progress.current_step;
        completedSteps = lastMessage.metadata.use_case_progress.completed_steps;
      }

      // If a button was clicked, update progress
      if (buttonChoice) {
        console.log("Button choice selected:", buttonChoice);
        completedSteps.push(buttonChoice);
        currentStep++;
      }
    }

    let systemPrompt = `Du bist Ava, ein hilfreicher Assistent bei avanti-suite, der Nutzern bei ihren Aufgaben hilft.`;
    
    if (useCase) {
      systemPrompt += `\n\nDu bekommst einen Use Case mit allen relevanten Informationen zu einem Prozess oder einer Aufgabe.
      Deine Aufgabe ist es, den Nutzer durch diesen Prozess zu führen und ihm zu helfen, die Aufgabe erfolgreich abzuschließen.
      
      Use Case Details:
      Titel: ${useCase.title}
      Typ: ${useCase.type}
      Benötigte Informationen: ${useCase.information_needed || 'Keine spezifischen Informationen benötigt'}
      Schritte: ${useCase.steps ? JSON.stringify(useCase.steps) : 'Keine spezifischen Schritte definiert'}
      
      Aktueller Fortschritt:
      - Schritt: ${currentStep + 1} von ${useCase.steps?.length || 0}
      - Abgeschlossene Schritte: ${completedSteps.join(', ')}
      
      Gib dem Nutzer immer mehrere konkrete Optionen zur Auswahl, damit er weiß wie er fortfahren kann.`;
    }

    let conversationMessages = [{
      role: "system",
      content: systemPrompt
    }];

    // Add previous messages to conversation context
    for (const msg of messages) {
      conversationMessages.push({
        role: msg.role,
        content: msg.content
      });
    }

    // Add the current message or button choice
    if (buttonChoice) {
      conversationMessages.push({
        role: "user",
        content: `Ich habe folgende Option gewählt: ${buttonChoice}`
      });
    } else if (message) {
      conversationMessages.push({
        role: "user",
        content: message
      });
    } else if (messages.length === 0) {
      // When starting a new conversation with no existing messages and no user input
      conversationMessages.push({
        role: "user",
        content: "Hallo, ich brauche Hilfe bei dieser Aufgabe."
      });
    }

    console.log("Preparing to send request to OpenAI");
    console.log("Conversation messages count:", conversationMessages.length);

    // Get AI response
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

    if (!openAIResponse.ok) {
      const errorText = await openAIResponse.text();
      console.error("OpenAI API error:", openAIResponse.status, errorText);
      throw new Error(`OpenAI API error: ${openAIResponse.status} - ${errorText}`);
    }

    const responseData = await openAIResponse.json();
    
    if (!responseData || responseData.error) {
      console.error('Invalid analysis response:', responseData);
      throw new Error('Invalid AI response');
    }
    
    // Extract the response text
    const assistantResponse = responseData.choices[0].message.content;
    console.log("Received assistant response:", assistantResponse.substring(0, 100) + "...");
    
    // Save the assistant's response with metadata
    const metadata = useCase ? {
      use_case_progress: {
        current_step: currentStep,
        total_steps: useCase.steps?.length || 0,
        completed_steps: completedSteps
      }
    } : undefined;

    const { error: insertError } = await supabase.from('task_messages').insert({
      task_id: taskId,
      role: 'assistant',
      content: assistantResponse,
      metadata
    });

    if (insertError) {
      console.error("Error inserting assistant message:", insertError);
      throw insertError;
    }

    console.log("Assistant response saved successfully");

    return new Response(
      JSON.stringify({
        response: assistantResponse,
        metadata
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
