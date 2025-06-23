import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

// CORS HEADERS
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Simplified Use Case Schema for validation
const useCaseSchema = z.object({
  title: z.string().optional(),
  expected_result: z.string().optional(),
  information_needed: z.union([z.string(), z.array(z.string())]).optional(),
  process_map: z.any().optional(),
});

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";

async function callOpenAI(prompt: string) {
  if (!OPENAI_API_KEY) {
    throw new Error("OpenAI API key not set");
  }

  const response = await fetch(OPENAI_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4-turbo',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error(`OpenAI API error (${response.status}): ${errorBody}`);
    throw new Error(`OpenAI API request failed: ${response.statusText}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

const validationPromptTemplate = `
Du bist ein erfahrener Prozessanalyst und Qualitätsmanager. Deine Aufgabe ist es, einen von einem Kollegen entworfenen Anwendungsfall (Use Case) auf Vollständigkeit und Verständlichkeit für einen Servicemitarbeiter zu prüfen.

**Anweisungen:**
1.  **Prüfe die folgenden Felder auf Vollständigkeit:**
    *   'title': Ist der Titel klar und prägnant?
    *   'expected_result': Ist das erwartete Ergebnis eindeutig beschrieben?
    *   'information_needed': Sind die benötigten Informationen vollständig aufgelistet, damit der Mitarbeiter den Fall bearbeiten kann?
2.  **Prüfe die Prozesskarte ('process_map'):**
    *   Ist der Prozess logisch aufgebaut?
    *   Sind die Schritte für einen Mitarbeiter ohne Vorkenntnisse verständlich?
    *   Gibt es offensichtliche Lücken oder unklare Anweisungen?
3.  **Erstelle eine JSON-Antwort mit folgendem Format:**
    *   'is_complete': (boolean) 'true', wenn der Use Case vollständig und verständlich ist, sonst 'false'.
    *   'feedback': (string) Gib konstruktives Feedback. Liste konkret auf, was fehlt oder unklar ist. Wenn alles in Ordnung ist, schreibe "Der Anwendungsfall ist vollständig und gut verständlich.".
    *   'missing_fields': (array of strings) Liste die Namen der Felder auf, die unvollständig sind (z.B. ["information_needed", "process_map"]). Wenn nichts fehlt, gib ein leeres Array zurück.

**Hier ist der Anwendungsfall zur Prüfung (im JSON-Format):**
\`\`\`json
{{USE_CASE_JSON}}
\`\`\`

Bitte gib NUR das JSON-Objekt als Antwort zurück.
`;

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const useCase = await req.json();

    // Basic validation
    const parseResult = useCaseSchema.safeParse(useCase);
    if (!parseResult.success) {
      return new Response(JSON.stringify({ error: 'Invalid use case structure', details: parseResult.error.flatten() }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const prompt = validationPromptTemplate.replace('{{USE_CASE_JSON}}', JSON.stringify(useCase, null, 2));

    const validationResultString = await callOpenAI(prompt);
    
    let validationResult;
    try {
        // First, try to parse the whole string as JSON
        validationResult = JSON.parse(validationResultString);
    } catch (e) {
        // If that fails, try to extract it from a markdown code block
        console.error("Failed to parse OpenAI response directly, attempting to extract from markdown block.");
        const match = validationResultString.match(/```json\n([\s\S]*?)\n```/);
        if (match && match[1]) {
            try {
                validationResult = JSON.parse(match[1]);
            } catch (jsonErr) {
                console.error("Failed to parse extracted JSON:", match[1]);
                const finalError = jsonErr instanceof Error ? jsonErr.message : String(jsonErr);
                throw new Error(`Could not parse extracted JSON from OpenAI response: ${finalError}`);
            }
        } else {
            throw new Error("Could not extract any valid JSON from OpenAI response.");
        }
    }

    return new Response(JSON.stringify(validationResult), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Error in validate-use-case-completeness:', errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});