import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.8'; // Use your project's version
import OpenAI from 'https://esm.sh/openai@4.20.1';
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
const OPENAI_MODEL = 'gpt-4.1-2025-04-14'; // Dein spezifisches Modell
const OPENAI_RESPONSES_ENDPOINT = 'https://api.openai.com/v1/responses';
const sanitizeForTemplateLiteral = (str: string | null | undefined): string =>{
  if (str === undefined || str === null) return '';
  return str.replace(/`/g, '\\`').replace(/\${/g, '\\${');
};
async function fetchOpenAIResponse(prompt: string): Promise<{ subject: string; body: string }> {
  const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
  const openAIModel = Deno.env.get('OPENAI_MODEL') || 'gpt-3.5-turbo'; // Default if not set
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
      throw new Error(`Failed to parse Schwungrad email content from OpenAI response. Expected JSON with subject and body. Error: ${errorMessage}. Raw: ${assistantResponseContent}`);
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
    const supabaseClient = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_ANON_KEY') ?? '', {
      global: {
        headers: {
          Authorization: req.headers.get('Authorization')
        }
      }
    });
    const { data: taskData, error: taskError } = await supabaseClient.from('tasks').select('id, readable_id, description, created_at, customer_id, endkunde_id').eq('id', taskId).single();
    if (taskError || !taskData) {
      console.error('Error fetching task:', taskError);
      return new Response(JSON.stringify({
        error: `Task with ID ${taskId} not found or error fetching: ${taskError?.message}`
      }), {
        status: 404,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    const { data: customerData, error: customerError } = await supabaseClient.from('customers').select('id, name, csm_email, schwungrad_mail, is_schwungrad_by_csm_active').eq('id', taskData.customer_id).single();
    if (customerError || !customerData) {
      console.error('Error fetching customer:', customerError);
      return new Response(JSON.stringify({
        error: `Customer with ID ${taskData.customer_id} not found or error fetching: ${customerError?.message}`
      }), {
        status: 404,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    let endkundeName = null;
    if (taskData.endkunde_id) {
      const { data: endkundeData, error: endkundeError } = await supabaseClient.from('endkunden') // Correct table
      .select('Vorname, Nachname') // Correct fields
      .eq('id', taskData.endkunde_id).maybeSingle();
      if (endkundeError) {
        // Log error but continue, as endkunde is optional
        console.warn(`Could not fetch endkunde for ID ${taskData.endkunde_id}: ${endkundeError.message}`);
      } else if (endkundeData) {
        const fullName = [
          endkundeData.Vorname,
          endkundeData.Nachname
        ].filter(Boolean).join(' ').trim();
        if (fullName) {
          endkundeName = fullName;
        }
      }
    }
    const recipientEmail = customerData.is_schwungrad_by_csm_active === false ? customerData.schwungrad_mail : customerData.csm_email;
    if (!recipientEmail) {
      const errorMessage = `Für den Kunden "${customerData.name}" ist keine Empfänger-E-Mail (weder für CSM noch für Schwungrad) konfiguriert.`;
      console.error(errorMessage);
      return new Response(JSON.stringify({
        error: errorMessage
      }), {
        status: 404,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    const descriptionForSanitize = taskData.description ? taskData.description.substring(0, 2000) : undefined;
    const agentDescriptionSanitized = sanitizeForTemplateLiteral(descriptionForSanitize);
    const customerNameSanitized = sanitizeForTemplateLiteral(customerData.name);
    const endkundeNameSanitized = sanitizeForTemplateLiteral(endkundeName);
    const taskCreatedAt = new Date(taskData.created_at).toLocaleDateString('de-DE');
    const taskReferenceId = taskData.readable_id || taskData.id;
    const promptContext = [
      `**Informationen für die E-Mail:**`,
      `- **Unser Kunde:** ${customerNameSanitized}`,
      endkundeNameSanitized ? `- **Endkunde:** ${endkundeNameSanitized}` : null,
      `- **Datum der Anfrage:** ${taskCreatedAt}`,
      `- **Vorgangsnr.:** ${taskReferenceId}`,
      `- **Anliegen (vom Agenten erfasst):**\n  ${agentDescriptionSanitized}`
    ].filter(Boolean).join('\n');
    const prompt = `
Du bist eine KI-Assistenz für ein Service-Unternehmen. Formuliere eine E-Mail an unseren Kunden, weil ein Endkunde (z.B. ein Mieter oder Nutzer) eine Anfrage gestellt hat, für die es keinen vordefinierten Bearbeitungsprozess (Use Case) gibt.

Die E-Mail soll den Kunden sachlich darüber informieren, dass der Endkunde am angegebenen Datum mit dem unten genannten Anliegen Kontakt aufgenommen hat. Bitte bitte den Kunden, uns mitzuteilen, wie mit dem Anliegen verfahren werden soll: Soll ein neuer Use Case angelegt werden, oder gibt es eine konkrete Anweisung?

**WICHTIG:**
- Die E-Mail MUSS IMMER mit der Anrede "Guten Tag," beginnen.
- Die E-Mail MUSS IMMER mit "Mit freundlichen Grüßen\nIhr avanti-Team" enden.
- Dazwischen: kurze Info, dass ein Endkunde eine Anfrage gestellt hat, was das Anliegen ist, und die Bitte um Rückmeldung (neuer Use Case oder konkrete Anweisung).
- Der Stil ist freundlich, klar, höfliche Sie-Form, nicht übertrieben formell.

Gib als Antwort ein valides JSON-Objekt mit den Feldern "subject" und "body" zurück.

${promptContext}
`;
    const openAIResponse = await fetchOpenAIResponse(prompt);
    if (!openAIResponse || !openAIResponse.subject || !openAIResponse.body) {
      console.error('Final check failed: OpenAI response is missing subject or body.', openAIResponse);
      throw new Error('Die von OpenAI generierte Antwort ist unvollständig.');
    }
    const { subject, body } = openAIResponse;
    // Basis-URL aus Umgebungsvariable oder Fallback
    const appUrl = Deno.env.get('APP_URL') || 'https://suite.avanti.cx';
    // Link bauen
    const taskLink = `${appUrl}/tasks/${taskId}`;
    // Hinweistext
    const linkText = `\n\nZum direkten Bearbeiten des Vorgangs klicken Sie bitte hier: ${taskLink}\n(Hinweis: Der Link funktioniert nur, wenn Sie eingeloggt sind.)`;
    // Create Use Case link and info
    const useCaseLink = `https://suite.avanti.cx/admin/use-cases/create`;
    const useCaseText = `\n\nFalls Sie für dieses oder zukünftige Anliegen einen passenden Prozess (Use Case) benötigen, können Sie diesen direkt in unserem Portal anlegen: ${useCaseLink}\n(Hinweis: Sie benötigen entsprechende Berechtigungen und müssen eingeloggt sein.)`;
    // Body erweitern
    const finalBody = `${body}${linkText}${useCaseText}`;
    return new Response(JSON.stringify({
      subject,
      body: finalBody,
      recipient: recipientEmail
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 200
    });
  } catch (error) {
    console.error('Error in generate-schwungrad-email function:', error);
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
