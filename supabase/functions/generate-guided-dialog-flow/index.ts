// supabase/functions/generate-guided-dialog-flow/index.ts
// Edge Function zur Generierung eines Entscheidungsbaum-Flows (guided dialog) mit OpenAI GPT-4.1

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GuidedDialogInput {
  title: string;
  description: string;
  industry: string;
  type?: string;
  expected_result?: string;
  additionalParams?: Record<string, string>;
}

interface OpenAIPayload {
  model: string;
  input: string;
  instructions?: string;
}

interface OpenAIResponse {
  id: string;
  output: Array<{
    content: Array<{
      text: string;
    }>;
  }>;
  response_id?: string;
}

function extractTextFromResponse(response: OpenAIResponse): string {
  try {
    if (!response.output || !response.output[0] || !response.output[0].content || !response.output[0].content[0]) {
      throw new Error("Unerwartetes OpenAI Response Format");
    }
    return response.output[0].content[0].text;
  } catch (error) {
    throw new Error("Konnte Text nicht aus OpenAI-Antwort extrahieren");
  }
}

function parseJsonFromText(text: string): any {
  try {
    // Entferne alle Markdown-Codeblöcke und trimme
    let clean = text.replace(/```json[\s\S]*?```/gi, (match) => match.replace(/```json|```/gi, ''));
    clean = clean.replace(/```[\s\S]*?```/gi, (match) => match.replace(/```/gi, ''));
    clean = clean.trim();
    // Suche das erste JSON-Objekt
    const jsonMatch = clean.match(/\{[\s\S]*\}/);
    const jsonString = jsonMatch ? jsonMatch[0] : clean;
    return JSON.parse(jsonString);
  } catch (error) {
    console.error('Fehler beim JSON-Parsing, Rohtext:', text);
    throw new Error("Konnte JSON nicht aus Text parsen");
  }
}

async function callOpenAI(apiKey: string, payload: OpenAIPayload): Promise<OpenAIResponse> {
  const OPENAI_API_URL = "https://api.openai.com/v1/responses";
  const response = await fetch(OPENAI_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI API Fehler: ${response.status} ${errorText}`);
  }
  return await response.json();
}

// Hilfsfunktion: KI-Nodes ins React-Flow-Format bringen
function mapNodesForReactFlow(nodes: any[]): any[] {
  return nodes.map((n: any, idx: number) => ({
    id: n.id,
    type: 'custom',
    position: n.position || { x: 100 + idx * 220, y: 100 },
    data: {
      ...n,
      type: n.type, // eigentlicher Typ (start, question_group, ...)
      label: n.label,
      // weitere Felder wie description, fields, options etc.
    },
    sourcePosition: n.sourcePosition,
    targetPosition: n.targetPosition,
  }));
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { title, description, industry, type, expected_result, additionalParams } = await req.json() as GuidedDialogInput;
    // Logging der empfangenen Werte
    console.log('Empfangen in generate-guided-dialog-flow:', {
      title,
      description,
      industry,
      type,
      expected_result,
      additionalParams
    });
    if (!title || !description || !industry) {
      return new Response(JSON.stringify({ error: "title, description und industry sind Pflichtfelder" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const openAIApiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openAIApiKey) {
      return new Response(JSON.stringify({ error: "OpenAI API Key nicht konfiguriert" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Prompt für guided dialog
    const prompt = `Du bist ein Experte für Kundenservice-Prozesse. Generiere einen Entscheidungsbaum (Flow) für einen geführten Dialog ("guided dialog") im Kundenservice.\n\n---\n\n**Kontext zu Use Case Typen:**\n- "weiterleitung": Das Anliegen kann nicht direkt gelöst werden und muss an eine andere Stelle weitergeleitet werden. Ziel ist es, das Anliegen durch gezielte Fragen und Entscheidungen zu qualifizieren, damit die Weiterleitung effizient erfolgen kann. Nach der Qualifizierung folgt ein Hinweis auf die Weiterleitung (z. B. Info-Node) und dann der Abschluss (End-Node, z. B. "Wir melden uns schnellstmöglich bei dir."). Wichtige Regel: Der Flow endet immer mit einem End-Node nach dem Weiterleitungs-Hinweis.\n- "direkte_bearbeitung": Das Anliegen wird vollständig im Flow bearbeitet. Der Flow enthält alle nötigen Schritte, Entscheidungen und Aktionen, um das Anliegen zu lösen. Unterstütze die Bearbeitung durch Info-Nodes und Hilfetexte, wo immer sinnvoll. Am Ende steht immer ein Abschluss-Node, der die erfolgreiche Bearbeitung bestätigt. Wichtige Regel: Es gibt KEINE Weiterleitung am Ende.\n- "informationsanfrage": Der Kunde möchte nur eine Information erhalten. Der Flow besteht aus gezielten Fragen zur Präzisierung und gibt dann direkt die Information aus. Es gibt keine Aktionen, keine Weiterleitung, keine Bearbeitung – nur die Information und den Abschluss. Wichtige Regel: Abschluss ist ein Info- oder End-Node mit der Antwort.\n\n---\n\n**Erlaubte Node-Typen und Struktur:**\nDie folgenden JSON-Beispiele zeigen nur das Format und die erlaubten Felder für jeden Node-Typ.\nFülle alle Inhalte (z. B. label, text, fields, options) IMMER individuell und passend zum jeweiligen Use Case und Anliegen aus! Verwende KEINE Platzhaltertexte oder Beispieltexte aus den Beispielen, sondern generiere für jeden Flow und jeden Node sinnvolle, kontextbezogene Inhalte.\n\n- start: Einstiegspunkt des Prozesses (immer nur einer pro Flow)\n  Beispiel: { "id": "start", "type": "start", "label": "Start" }\n- info: Wissensblock, zeigt einen Informationstext für den/die Mitarbeitende(n) an\n  Beispiel: { "id": "info1", "type": "info", "label": "Hinweis", "data": { "text": "Hier steht ein individueller Hinweistext." } }\n- question_group: Ein Schritt mit mehreren Fragen/Feldern, die beantwortet werden müssen\n  Beispiel: { "id": "fragen1", "type": "question_group", "label": "Kundendaten erfassen", "data": { "fields": [ { "type": "text", "label": "Name" }, { "type": "email", "label": "E-Mail" }, { "type": "date", "label": "Geburtsdatum" }, { "type": "select", "label": "Anliegen", "options": ["Rechnung", "Vertrag", "Sonstiges"] } ] } }\n- decision: Verzweigung im Ablauf, z. B. Ja/Nein-Frage\n  Beispiel: { "id": "entscheidung1", "type": "decision", "label": "Kunde hat Rechnung erhalten?", "data": { "options": ["Ja", "Nein"] } }\n- action: Systemaktion, z. B. E-Mail senden\n  Beispiel: { "id": "aktion1", "type": "action", "label": "E-Mail senden", "data": { "to": "kunde@example.com", "message": "Ihre Anfrage wurde bearbeitet." } }\n- end: Abschluss des Prozesses\n  Beispiel: { "id": "abschluss", "type": "end", "label": "Vorgang abgeschlossen", "data": { "text": "Wir melden uns schnellstmöglich bei dir." } }\n\n**Erlaubte Feldtypen für question_group:**\n- "text": Einfaches Textfeld\n- "number": Zahlenfeld\n- "date": Datumsauswahl\n- "select": Auswahlfeld (mit "options"-Array)\n- "checkbox": Checkbox\n- "textarea": Mehrzeiliger Text\n- "email": E-Mail-Feld\nBeispiel für ein Feld mit Auswahl: { "type": "select", "label": "Anliegen", "options": ["Rechnung", "Vertrag", "Sonstiges"] }\n\n**Edges (Verbindungen):**\nJede Verbindung ist ein Objekt mit:\n- source: ID des Quell-Nodes\n- target: ID des Ziel-Nodes\n- Optional: label (z. B. für Entscheidungs-Optionen)\nRegeln für decision:\n- Jede Option in data.options erzeugt eine ausgehende Verbindung (Edge) mit label gleich dem Optionswert.\n- Jede Edge muss zu einer existierenden Node führen.\nBeispiel: [ { "source": "entscheidung1", "target": "info1", "label": "Ja" }, { "source": "entscheidung1", "target": "fragen2", "label": "Nein" } ]\n\n**Format der Antwort:**\nGib das Ergebnis ausschließlich als kompaktes JSON-Objekt mit den Feldern nodes (Array) und edges (Array) zurück. KEIN Markdown, keine Erklärungen, nur das JSON!\n\n**Beispiel für einen vollständigen Flow (Use Case Typ: weiterleitung):**\n{ "nodes": [ { "id": "start", "type": "start", "label": "Start" }, { "id": "frage1", "type": "question_group", "label": "Dein Anliegen", "data": { "fields": [ { "type": "text", "label": "Was ist dein Anliegen?" } ] } }, { "id": "weiterleitung", "type": "info", "label": "Weiterleitung", "data": { "text": "Dein Anliegen wird an die zuständige Stelle weitergeleitet." } }, { "id": "abschluss", "type": "end", "label": "Vorgang abgeschlossen", "data": { "text": "Wir melden uns schnellstmöglich bei dir." } } ], "edges": [ { "source": "start", "target": "frage1" }, { "source": "frage1", "target": "weiterleitung" }, { "source": "weiterleitung", "target": "abschluss" } ] }\n\n---\n\n**Use Case Daten:**\n- Titel: ${title}\n- Beschreibung: ${description}\n- Branche: ${industry}\n- Typ: ${type || ''}\n- Erwartetes Ergebnis: ${expected_result || ''}${additionalParams ? `\n- Weitere Parameter: ${JSON.stringify(additionalParams)}` : ''}`;

    // Korrektes Payload für die Responses API
    const payload = {
      model: "gpt-4.1",
      input: prompt,
      // tools, previous_response_id etc. können optional ergänzt werden
    };
    console.log('OpenAI-Call Payload:', payload);

    const openaiRes = await callOpenAI(openAIApiKey, payload);
    console.log('OpenAI Antwort:', openaiRes);

    // OpenAI-Antwort holen
    const openAiText = openaiRes.output[0].content[0].text;
    let flowJson;
    try {
      flowJson = JSON.parse(openAiText);
    } catch (e) {
      console.error('Fehler beim Parsen der KI-Antwort:', e, openAiText);
      return new Response(JSON.stringify({ error: 'KI-Antwort konnte nicht geparst werden.', details: String(e) }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
    // Debug-Log
    console.log('FLOW JSON nach Parsing:', JSON.stringify(flowJson));
    if (!flowJson.nodes || !flowJson.edges) {
      return new Response(JSON.stringify({ error: 'KI-Antwort enthielt keine nodes/edges.' }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
    const nodes = mapNodesForReactFlow(flowJson.nodes);
    const edges = flowJson.edges;
    return new Response(JSON.stringify({ nodes, edges }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  } catch (error) {
    return new Response(JSON.stringify({
      error: "Interner Serverfehler",
      message: error instanceof Error ? error.message : String(error)
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
