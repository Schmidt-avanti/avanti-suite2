import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { Configuration, OpenAIApi } from "https://esm.sh/openai@4.0.0";

// OpenAI Konfiguration
const configuration = new Configuration({
  apiKey: Deno.env.get("OPENAI_API_KEY"),
});
const openai = new OpenAIApi(configuration);

interface RefinementRequest {
  article: string;
  instruction: string;
  metadata?: {
    industry?: string;
    customer?: string;
    [key: string]: any;
  };
}

serve(async (req) => {
  try {
    // CORS Headers
    const headers = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      "Content-Type": "application/json",
    };

    // OPTIONS Request für CORS
    if (req.method === "OPTIONS") {
      return new Response(null, { headers, status: 204 });
    }

    // Request Body parsen
    const body = await req.json() as RefinementRequest;
    const { article, instruction, metadata } = body;

    if (!article || !instruction) {
      return new Response(
        JSON.stringify({ error: "Artikel und Anweisungen werden benötigt" }),
        { headers, status: 400 }
      );
    }

    // GPT-4-Prompt für die Anpassung des Artikels
    const prompt = `
# Anpassung eines Use Cases (Informationsanfrage)

## Kontext
Du erhältst einen bestehenden Artikel für einen Use Case vom Typ "Informationsanfrage" und eine Anweisung zur Überarbeitung.

## Deine Aufgabe
1. Lies den bestehenden Artikelinhalt sorgfältig.
2. Verstehe die Anweisung zur Überarbeitung.
3. Passe den Artikelinhalt gemäß der Anweisung an.
4. Achte darauf, den fachlichen Inhalt korrekt beizubehalten oder zu verbessern.
5. Behalte die vorhandene Formatierung und Struktur weitgehend bei, es sei denn, die Anweisung fordert etwas anderes.
6. Antworte AUSSCHLIESSLICH mit dem überarbeiteten HTML-Artikelinhalt, keine Kommentare oder Erklärungen.

## Branche
${metadata?.industry || ''}

## Bestehender Artikelinhalt
${article}

## Anweisung zur Überarbeitung
${instruction}
`;

    // GPT-4-Anfrage
    const response = await openai.createChatCompletion({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "Du bist ein KI-Assistent, der Experte für die Erstellung präziser, sachlicher Use Cases ist.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.5,
    });

    // Extrahiere den generierten Inhalt
    const content = response.data.choices[0]?.message?.content || "";

    return new Response(
      JSON.stringify({
        content,
        response_id: response.data.id,
      }),
      { headers, status: 200 }
    );

  } catch (error) {
    console.error("Error:", error);
    
    return new Response(
      JSON.stringify({ error: error.message || "Ein Fehler ist aufgetreten" }),
      { status: 500 }
    );
  }
});
