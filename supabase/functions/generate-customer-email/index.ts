import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.8';
import OpenAI from 'https://esm.sh/openai@4.20.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

const sanitizeForTemplateLiteral = (str: string | null | undefined): string => {
  if (str === undefined || str === null) return '';
  return str.replace(/`/g, '\\`').replace(/\${/g, '\\${');
};

async function fetchOpenAIResponse(prompt: string): Promise<{ subject: string; body: string }> {
  const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
  const openAIModel = Deno.env.get('OPENAI_MODEL') || 'gpt-3.5-turbo';
  
  if (!openAIApiKey) {
    throw new Error('OPENAI_API_KEY is not set in environment variables.');
  }

  const openai = new OpenAI({
    apiKey: openAIApiKey
  });

  try {
    const completion = await openai.chat.completions.create({
      model: openAIModel,
      messages: [
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: {
        type: "json_object"
      },
      temperature: 0.7,
      max_tokens: 1000
    });

    const assistantResponseContent = completion.choices[0]?.message?.content;
    if (!assistantResponseContent) {
      console.error("OpenAI response content is missing after API call.");
      throw new Error("OpenAI response content is missing.");
    }

    try {
      const parsedContent = JSON.parse(assistantResponseContent);
      if (parsedContent && typeof parsedContent.subject === 'string' && typeof parsedContent.body === 'string') {
        return {
          subject: parsedContent.subject,
          body: parsedContent.body
        };
      }
      console.error('Parsed OpenAI content does not contain subject and body strings.', parsedContent);
      throw new Error('Parsed OpenAI content does not meet expected format {subject: string, body: string}. Raw content: ' + assistantResponseContent);
    } catch (e: any) {
      console.error('Failed to parse OpenAI response as JSON with subject/body:', e, 'Raw response:', assistantResponseContent);
      const errorMessage = e instanceof Error ? e.message : String(e);
      throw new Error(`Failed to parse customer email content from OpenAI response. Expected JSON with subject and body. Error: ${errorMessage}. Raw: ${assistantResponseContent}`);
    }
  } catch (error: any) {
    if (error instanceof OpenAI.APIError) {
      console.error('OpenAI API Error Details:', {
        status: error.status,
        name: error.name,
        headers: error.headers,
        message: error.message,
        body: error.body,
        error: error.error
      });
      const errorResponseMessage = error.message || (error.error ? JSON.stringify(error.error) : error.body ? JSON.stringify(error.body) : 'Unknown API error');
      throw new Error(`OpenAI API request failed with status ${error.status}: ${errorResponseMessage}`);
    }
    console.error('Error in fetchOpenAIResponse:', error);
    const genericErrorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Error in fetchOpenAIResponse: ${genericErrorMessage}`);
  }
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }

  try {
    const requestBody = await req.json();
    const { taskId } = requestBody;
    
    if (!taskId) {
      return new Response(JSON.stringify({
        error: 'taskId is required'
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch task details
    const { data: taskData, error: taskError } = await supabaseClient
      .from('tasks')
      .select('*')
      .eq('id', taskId)
      .single();

    if (taskError || !taskData) {
      console.error('Error fetching task:', taskError);
      return new Response(JSON.stringify({
        error: 'Task not found'
      }), {
        status: 404,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }

    // Fetch customer details
    const { data: customerData, error: customerError } = await supabaseClient
      .from('customers')
      .select('id, name, email')
      .eq('id', taskData.customer_id)
      .single();

    if (customerError || !customerData) {
      console.error('Error fetching customer:', customerError);
      return new Response(JSON.stringify({
        error: 'Customer not found'
      }), {
        status: 404,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }

    // Fetch endkunde details if available
    let endkundeName = '';
    if (taskData.endkunde_id) {
      const { data: endkundeData, error: endkundeError } = await supabaseClient
        .from('endkunden')
        .select('Vorname, Nachname')
        .eq('id', taskData.endkunde_id)
        .single();

      if (!endkundeError && endkundeData) {
        const firstName = endkundeData.Vorname || '';
        const lastName = endkundeData.Nachname || '';
        if (firstName || lastName) {
          endkundeName = `${firstName} ${lastName}`.trim();
        }
      }
    }

    // Prepare sanitized data for the prompt
    const descriptionForSanitize = taskData.description ? taskData.description.substring(0, 2000) : undefined;
    const agentDescriptionSanitized = sanitizeForTemplateLiteral(descriptionForSanitize);
    const customerNameSanitized = sanitizeForTemplateLiteral(customerData.name);
    const endkundeNameSanitized = sanitizeForTemplateLiteral(endkundeName);
    const taskCreatedAt = new Date(taskData.created_at).toLocaleDateString('de-DE');
    const taskReferenceId = taskData.readable_id || taskData.id;

    // Build context for the prompt
    const promptContext = [
      `**Informationen für die E-Mail:**`,
      `- **Unser Kunde:** ${customerNameSanitized}`,
      endkundeNameSanitized ? `- **Endkunde/Anrufer:** ${endkundeNameSanitized}` : null,
      `- **Datum der Anfrage:** ${taskCreatedAt}`,
      `- **Vorgangsnr.:** ${taskReferenceId}`,
      `- **Anliegen (vom Agenten erfasst):**\n  ${agentDescriptionSanitized}`
    ].filter(Boolean).join('\n');

    // Create the prompt for OpenAI
    const prompt = `
Du bist eine KI-Assistenz für ein Service-Unternehmen. Formuliere eine kurze, sachliche E-Mail an unseren Kunden, die NUR zusammenfasst, was tatsächlich passiert ist.

**KRITISCH WICHTIG:**
- ERFINDE KEINE DETAILS! Verwende nur die Informationen aus dem Anliegen.
- KEINE generischen Phrasen wie "Techniker arbeiten mit Hochdruck" oder "weitere Informationen benötigt".
- NUR eine sachliche Zusammenfassung des tatsächlichen Anliegens.
- Kurz und präzise - maximal 2-3 Sätze zum eigentlichen Inhalt.

**Format:**
- Die E-Mail MUSS IMMER mit der Anrede "Guten Tag," beginnen.
- Die E-Mail MUSS IMMER mit "Mit freundlichen Grüßen\nIhr avanti-Team" enden.
- Dazwischen: NUR eine sachliche Zusammenfassung des Anliegens, keine erfundenen Prozessschritte.
- Erwähne die Vorgangsnummer zur Nachverfolgung.
- Der Stil ist höflich, sachlich, keine übertriebenen Versprechungen.

**Beispiel für richtige Herangehensweise:**
Wenn das Anliegen "Miter hat Wasserrohrbruch" ist, dann schreibe nur über den Wasserrohrbruch von Miter, nichts über Techniker oder zusätzliche Informationen.

Gib als Antwort ein valides JSON-Objekt mit den Feldern "subject" und "body" zurück.

${promptContext}
`;

    // Get OpenAI response
    const openAIResponse = await fetchOpenAIResponse(prompt);
    if (!openAIResponse || !openAIResponse.subject || !openAIResponse.body) {
      console.error('Final check failed: OpenAI response is missing subject or body.', openAIResponse);
      throw new Error('Die von OpenAI generierte Antwort ist unvollständig.');
    }

    const { subject, body } = openAIResponse;

    // Add task link for reference
    const appUrl = Deno.env.get('APP_URL') || 'https://suite.avanti.cx';
    const taskLink = `${appUrl}/tasks/${taskId}`;
    const linkText = `\n\nZum direkten Bearbeiten des Vorgangs: ${taskLink}\n(Hinweis: Der Link funktioniert nur, wenn Sie eingeloggt sind.)`;

    // Ensure proper email format with greeting and closing
    let finalBody = body;
    
    // Add greeting if not present
    if (!finalBody.trim().startsWith('Guten Tag,')) {
      finalBody = `Guten Tag,\n\n${finalBody}`;
    }
    
    // Add closing if not present
    if (!finalBody.includes('Mit freundlichen Grüßen\nIhr avanti-Team')) {
      finalBody = `${finalBody}\n\nMit freundlichen Grüßen\nIhr avanti-Team`;
    }
    
    // Add task link
    finalBody = `${finalBody}${linkText}`;

    return new Response(JSON.stringify({
      subject,
      body: finalBody,
      recipient: customerData.email
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 200
    });

  } catch (error) {
    console.error('Error in generate-customer-email function:', error);
    let errorMessage = 'An unknown error occurred';
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === 'string') {
      errorMessage = error;
    }
    
    return new Response(JSON.stringify({
      error: errorMessage
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 500
    });
  }
});
