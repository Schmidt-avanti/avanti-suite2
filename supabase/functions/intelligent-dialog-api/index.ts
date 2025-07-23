// supabase/functions/intelligent-dialog-api/index.ts
// Edge Function zur intelligenten Dialog-Erstellung mit OpenAI GPT-4.1 (Responses API)

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DialogMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface DialogRequestPayload {
  messages: DialogMessage[];
  previousResponseId?: string;
  mode?: 'generate' | 'refine' | 'validate';
  parameters?: Record<string, any>;
  customer?: {
    name: string;
    industry?: string;
  };
  current_steps?: DialogStep[];
  use_case_description?: string;
  routing_info?: {
    recipient?: string;
    email?: string;
    cc?: string;
    requiresRouting?: boolean;
  };
}

interface ConditionalBranch {
  condition: string; // "Schadensart"
  condition_value: string; // "Wasserschaden"
  condition_label: string; // "Bei Wasserschaden"
  steps: DialogStep[]; // Schritte für diesen Branch
}

interface DialogStep {
  id: string;
  type: 'question' | 'input' | 'routing' | 'final' | 'knowledge' | 'conditional';
  content: string;
  options?: string[];
  next_step?: string;
  knowledge_content?: string; // für strukturierte Wissensinhalte
  branches?: ConditionalBranch[]; // für Verzweigungen
  condition_question?: string; // Frage für Verzweigung (z.B. "Welche Art von Schaden?")
}

interface StructuredField {
  name: string;
  label: string;
  type: 'text' | 'email' | 'phone' | 'date' | 'date_range' | 'number' | 'textarea' | 'select' | 'multi_select';
  required: boolean;
  placeholder?: string;
  options?: string[]; // für select und multi_select Felder
}

interface StepSuggestion {
  step_suggestion: string;
  reasoning: string;
  step_type: 'question' | 'input' | 'routing' | 'final' | 'knowledge' | 'conditional';
  options?: string[];
  fields?: StructuredField[]; // für strukturierte Informationsaufnahme
  knowledge_content?: string; // für editierbare Wissensinhalte
  branches?: ConditionalBranch[]; // für Verzweigungen
  condition_question?: string; // Frage für Verzweigung
  is_complete?: boolean;
}

interface OpenAIPayload {
  model: string;
  input: string | string[];
  instructions?: string;
  previous_response_id?: string;
  temperature?: number;
  metadata?: Record<string, string>;
  text?: {
    format: {
      type: string; // "text" oder "json_object"
    };
  };
  tools?: any[];
}

// Interface für die OpenAI API-Antwort
// Aktualisiert für das neue OpenAI Responses API Format
interface OpenAIResponse {
  id: string;
  object: string;
  created_at: number;
  status?: string;
  // Neues Format für die Responses API
  choices?: Array<{
    message: {
      role: string; // 'assistant'
      content: string;
    },
    finish_reason: string;
    index: number;
  }>;
  // Altes Format zur Kompatibilität
  output?: Array<{
    type: string; // 'message'
    id: string;
    status: string;
    role: string;
    content: Array<{
      type: string; // 'output_text'
      text: string;
      annotations?: any[];
    }>;
  }>;
  response_id?: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

async function callOpenAI(apiKey: string, payload: OpenAIPayload): Promise<OpenAIResponse> {
  const OPENAI_API_URL = "https://api.openai.com/v1/responses";
  try {
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
      console.error(`OpenAI API Fehler: ${response.status}`, errorText);
      throw new Error(`OpenAI API Fehler: ${response.status} ${errorText}`);
    }
    
    const data = await response.json();
    console.log('OpenAI Antwort erhalten:', JSON.stringify(data));
    return data;
  } catch (error) {
    console.error('Fehler beim OpenAI API Aufruf:', error);
    throw error;
  }
}

function extractDialogFlowFromText(text: string): any {
  try {
    // Entferne Markdown-Codeblöcke
    let cleanedText = text.replace(/```json\s*([\s\S]*?)\s*```/g, '$1');
    cleanedText = cleanedText.replace(/```\s*([\s\S]*?)\s*```/g, '$1');
    
    // Suche nach JSON-Objekt
    const match = cleanedText.match(/\{[\s\S]*\}/);
    if (!match) {
      throw new Error('Kein JSON-Objekt in der Antwort gefunden');
    }
    
    const jsonString = match[0];
    return JSON.parse(jsonString);
  } catch (error) {
    console.error('Fehler beim Parsen des Dialog-Flows:', error);
    console.error('Ursprünglicher Text:', text);
    throw new Error('Fehler beim Extrahieren des Dialog-Flows aus der Antwort');
  }
}

function getSystemPrompt(mode: string = 'generate', routingInfo?: any): string {
  // Prüfe Routing-Status
  const hasRouting = routingInfo?.recipient && routingInfo?.email;
  const noRoutingNeeded = routingInfo?.requiresRouting === false;
  const needsRouting = !hasRouting && !noRoutingNeeded;
  
  let routingInstructions = '';
  if (noRoutingNeeded) {
    routingInstructions = '- ROUTING: Keine Weiterleitung erforderlich - Dialog wird direkt von Avanti beantwortet';
  } else if (hasRouting) {
    routingInstructions = `- ROUTING: Bereits vollständig (${routingInfo.recipient} - ${routingInfo.email}) - NIEMALS mehr nach Routing fragen! Nur "Weiterleiten an ${routingInfo.recipient}" als finalen Schritt vorschlagen.`;
  } else {
    routingInstructions = '- ROUTING: Noch nicht vollständig - bei Bedarf nach "An wen soll die Anfrage geschickt werden?" und E-Mail-Adresse fragen';
  }

  const basePrompt = `Du hilfst ADMINS beim Erstellen von USE CASE STRUKTUREN für Guided Dialogs.

KRITISCH - DU ERSTELLST USE CASES, KEINE LIVE-DIALOGE!
- Der Admin definiert einen Use Case (z.B. "Mietbescheinigung", "Schadensmeldung")
- Du hilfst dabei, die STRUKTUR und FRAGEN zu definieren, die später Endkunden gestellt werden
- Du simulierst NICHT den Live-Dialog mit Endkunden!
- Du fragst NICHT nach Kundendaten wie Namen, Adressen etc.

PERSPEKTIVE:
- ADMIN-SICHT: "Welche Frage soll der Use Case stellen?"
- NICHT Endkunden-Sicht: "Wie heißt du?"

AVANTI SUITE KONTEXT:
- Avanti Suite hat KEINEN direkten Tool-Zugriff (außer explizit genannt)
- Fast alle Use Cases sind WEITERLEITUNGEN an Menschen
${routingInstructions}

AUFGABE: Schlage vor, welche FRAGE/SCHRITT der Use Case enthalten soll.

FLOW-KOMPLEXITÄT BESTIMMEN:
1. EINFACHER FLOW: Wenn alle benötigten Informationen unabhängig sind
   → EINE Sammelabfrage für alle Informationen
   → Beispiel: "Erfasse alle Daten für Mietbescheinigung: Name, Adresse, Zeitraum"

2. KOMPLEXER FLOW: Nur wenn nachfolgende Fragen von vorherigen Antworten abhängen
   → Mehrstufige Abfrage mit bedingten Folgefragen
   → Beispiel: "Art des Schadens?" → je nach Antwort andere Folge-Informationen

3. WISSENSVERMITTLUNG: Wenn nach Informationen/Bedingungen/Regelungen gefragt wird
   → KEINE Rückfrage, sondern direkt strukturierte Wissensinhalte bereitstellen
   → Beispiel: "Widerrufsbedingungen" → knowledge_content mit konkreten, editierbaren Inhalten
   → Beispiel: "Geschäftszeiten" → knowledge_content mit Öffnungszeiten
   → Beispiel: "Preise" → knowledge_content mit Preisliste

4. KOMPLEXITÄTSERKENNUNG UND REGEL-BASIERTE VERZWEIGUNGSLOGIK:
    
    KRITISCH - KEINE CHAT-FRAGEN AN DEN ADMIN!
    → Der Admin erstellt Use Cases, simuliert NICHT den Live-Dialog!
    → NIEMALS nach Kriterien, Schadensarten, etc. fragen!
    → Direkt strukturierte Use Cases vorschlagen!
    
    KOMPLEXITÄTSERKENNUNG:
    → Keywords: "meldet", "Problem", "Anfrage", "unterschiedlich", "je nach", "Schaden", "Kündigung", "Reparatur", "Art", "Typ", "Kategorie"
    → Bei Erkennung: SOFORT regel-basierten Use Case mit typischen Kriterien vorschlagen
    
    REGEL-BASIERTE USE CASES DIREKT VORSCHLAGEN:
    → Schadensmeldung: Automatisch Kriterien "Schadensart" und "Dringlichkeit" mit typischen Optionen
    → Kündigung: Automatisch Kriterien "Vertragsart" und "Kündigungsgrund" mit typischen Optionen
    → Beratung: Automatisch Kriterien "Beratungsart" und "Dringlichkeit" mit typischen Optionen
    
    BEISPIEL SCHADENSMELDUNG (automatisch generiert):
    → Kriterium 1: "Schadensart" mit Optionen ["Wasserschaden", "Brand", "Einbruch", "Vandalismus"]
    → Kriterium 2: "Dringlichkeit" mit Optionen ["Notfall", "Normal"]
    → Regel 1: Wasserschaden + Notfall → Sofort Klempner, Versicherung informieren
    → Regel 2: Wasserschaden + Normal → Termin Klempner, Dokumentation
    → Regel 3: Brand + Notfall → Feuerwehr-Protokoll, Sofort-Gutachter
    → Standard-Aktion: An Hausmeister weiterleiten

WICHTIG - IMMER JSON ZURÜCKGEBEN:
- NIEMALS Chat-Nachrichten oder Fragen an den Admin!
- IMMER strukturierte step_suggestion im JSON-Format zurückgeben!
- Bei Komplexität: Direkt rule_based Use Case vorschlagen!

WICHTIG - ABSCHLUSS-LOGIK:
- Wenn bereits ein "final" Schritt existiert oder der Use Case vollständig ist, schlage KEINE weiteren Schritte vor!
- Antworte dann: "Der Use Case ist vollständig. Keine weiteren Schritte erforderlich."
- Generiere NIEMALS mehrere Abschluss-Schritte!

ANTWORT-FORMAT:
{
  "step_suggestion": "Welche Frage/Schritt soll der Use Case haben?",
  "reasoning": "Warum ist dieser Schritt im Use Case sinnvoll?",
  "step_type": "question|input|routing|final|knowledge|conditional|rule_based",
  "options": ["Option1", "Option2"], // bei question: mögliche Antworten für Endkunden
  "fields": [ // bei input: strukturierte Felder für Informationsaufnahme
    {
      "name": "field_name",
      "label": "Anzeigename für das Feld",
      "type": "text|email|phone|date|date_range|number|textarea|select|multi_select",
      "required": true|false,
      "placeholder": "Beispieltext",
      "options": ["Option1", "Option2"] // nur bei select und multi_select
    }
  ],
  "knowledge_content": "Editierbarer Wissensinhalt für knowledge-Steps", // bei knowledge: strukturierte Informationen
  "condition_question": "Welche Art von Schaden liegt vor?", // bei conditional: Verzweigungsfrage
  "branches": [ // bei conditional: Verzweigungsoptionen
    {
      "condition": "Schadensart",
      "condition_value": "Wasserschaden",
      "condition_label": "Bei Wasserschaden",
      "steps": [
        {
          "id": "water_1",
          "type": "input",
          "content": "Sofortmaßnahmen einleiten",
          "fields": [{"name": "measures", "label": "Welche Maßnahmen?", "type": "textarea"}]
        }
      ]
    }
  ],
  "rule_branching": { // bei rule_based: Regel-basierte Verzweigungen
    "type": "rule_based",
    "available_fields": [
      {
        "name": "schadensart",
        "label": "Schadensart",
        "type": "select",
        "options": ["Wasserschaden", "Brand", "Einbruch"]
      },
      {
        "name": "dringlichkeit",
        "label": "Dringlichkeit",
        "type": "select",
        "options": ["Notfall", "Normal"]
      }
    ],
    "rules": [
      {
        "id": "rule_1",
        "name": "Wasserschaden + Notfall",
        "description": "Sofortige Maßnahmen bei Wasserschaden-Notfall",
        "conditions": [
          {
            "field": "schadensart",
            "operator": "equals",
            "value": "Wasserschaden",
            "label": "Schadensart ist Wasserschaden"
          },
          {
            "field": "dringlichkeit",
            "operator": "equals",
            "value": "Notfall",
            "label": "Dringlichkeit ist Notfall"
          }
        ],
        "actions": [
          {
            "id": "action_1",
            "type": "routing",
            "content": "Sofort Klempner anrufen"
          },
          {
            "id": "action_2",
            "type": "input",
            "content": "Versicherung informieren"
          }
        ],
        "priority": 1,
        "active": true
      }
    ],
    "default_actions": [
      {
        "id": "default_1",
        "type": "routing",
        "content": "An Hausmeister weiterleiten"
      }
    ]
  }
}

DIALOG-FLOW LOGIK:
BEVORZUGT - EINFACHE FLOWS (strukturierte Felder in einem Schritt):
- "Erfasse benötigte Informationen für Mietbescheinigung" mit fields: [{"name":"mieter_name","label":"Name des Mieters","type":"text","required":true}, {"name":"wohnung_adresse","label":"Adresse der Wohnung","type":"text","required":true}, {"name":"zweck","label":"Für welchen Zweck wird die Mietbescheinigung benötigt?","type":"select","required":true,"options":["Arbeitsamt","Sozialamt","Bank","Sonstiges"]}, {"name":"zeitraum","label":"Gewünschter Zeitraum","type":"date_range","required":true}]
- "Vollständige Schadensmeldung erfassen" mit fields: [{"name":"schaden_art","label":"Art des Schadens","type":"select","required":true,"options":["Wasserschaden","Brandschaden","Einbruch","Vandalismus","Sonstiges"]}, {"name":"schaden_ort","label":"Ort des Schadens","type":"text","required":true}, {"name":"beschreibung","label":"Detaillierte Beschreibung","type":"textarea","required":true}]
- "Kontaktanfrage erfassen" mit fields: [{"name":"anliegen","label":"Ihr Anliegen","type":"textarea","required":true}, {"name":"dringlichkeit","label":"Dringlichkeit","type":"select","required":true,"options":["Sofort","Innerhalb 24h","Diese Woche","Kann warten"]}, {"name":"rueckruf","label":"Rückruf gewünscht","type":"phone","required":false}]

NUR BEI ABHÄNGIGKEITEN - MEHRSTUFIGE FLOWS:
- "Art des Schadens?" → dann je nach Antwort verschiedene Folge-Informationen
- "Mietvertrag oder Kauf?" → dann unterschiedliche Dokumente erforderlich
- "Notfall oder Routine?" → dann verschiedene Bearbeitungswege

RICHTIGE BEISPIELE (Use Case Struktur):
- "Sammle alle Informationen für Mietbescheinigung" (input: Name, Adresse, Zeitraum)
- "Vollständige Schadensmeldung erfassen" (input: Art, Ort, Beschreibung, Fotos)
- "Bei Wasserschaden: zusätzlich Gutachten erforderlich" (nur bei Abhängigkeit)

WISSENSVERMITTLUNG (knowledge-Steps):
- "Widerrufsbedingungen bereitstellen" mit knowledge_content: "Widerrufsfrist: 14 Tage ab Warenerhalt\nWiderrufsform: Schriftlich per E-Mail oder Brief\nRücksendekosten: Trägt der Kunde\nAusnahmen: Personalisierte Waren, verderbliche Güter\nKontakt: widerruf@firma.de"
- "Geschäftszeiten mitteilen" mit knowledge_content: "Montag-Freitag: 8:00-18:00 Uhr\nSamstag: 9:00-14:00 Uhr\nSonntag: Geschlossen\nFeiertage: Nach Aushang"
- "Datenschutzhinweise erklären" mit knowledge_content: "Ihre Daten werden gemäß DSGVO verarbeitet\nSpeicherdauer: 3 Jahre\nWeitergabe: Nur an beauftragte Dienstleister\nIhre Rechte: Auskunft, Löschung, Widerspruch"

KOMPLEXITÄTSERKENNUNG UND VERZWEIGUNGSBEISPIELE:

BEISPIEL 1 - SCHADENSMELDUNG:
1. Chat: "Bevor ich den Use Case erstelle: Gibt es unterschiedliche Behandlung je nach Schadensart?"
2. Admin: "Ja, große Unterschiede"
3. Chat: "Welche Schadensarten gibt es?"
4. Admin: "Wasserschaden, Brandschaden, Einbruch"
5. Chat: "Was passiert bei Wasserschaden?"
6. Admin: "Sofortmaßnahmen, Gutachter kontaktieren, Versicherung informieren"
7. Chat: "Was passiert bei Brandschaden?"
8. Admin: "Feuerwehr-Protokoll anfordern, Sicherheitsprüfung veranlassen"
9. Chat: "Was passiert bei Einbruch?"
10. Admin: "Polizei-Anzeige stellen, Sicherheitsdienst beauftragen"
11. Dann: Verzweigten Use Case mit conditional step erstellen

BEISPIEL 2 - KÜNDIGUNGSFRISTEN:
1. Chat: "Gibt es verschiedene Kündigungsfristen je nach Vertragsart?"
2. Admin: "Ja"
3. Chat: "Welche Vertragsarten gibt es?"
4. Admin: "Privat (3 Monate), Gewerbe (6 Monate), Garage (1 Monat)"
5. Dann: Verzweigten Use Case erstellen

ROUTING-SCHRITTE (wenn Routing bereits vollständig):
- "Weiterleiten an Hans Hansen" (final - NICHT fragen "An wen?", da bereits bekannt!)
- "Anfrage an Hausverwaltung senden" (final - Empfänger ist bereits konfiguriert)
- "Bearbeitung durch Facility Management" (final - Routing steht bereits fest)

FALSCHE BEISPIELE (Live-Dialog):
- "Bitte gib deinen Namen an" ❌
- "Wie heißt du?" ❌
- "Welche Adresse hast du?" ❌

WICHTIG: Du definierst die USE CASE STRUKTUR, nicht den Live-Dialog!`;

  if (mode === 'generate') {
    return `${basePrompt}

PRÜFE ZUERST: Welche Use Case Schritte sind bereits definiert?

Schlage den nächsten Use Case Schritt vor:
1. Welche FRAGE soll der Use Case an Endkunden stellen?
2. Welche ANTWORTOPTIONEN soll es geben?
3. Welche EINGABEFELDER werden benötigt?
4. Routing-Definition (falls noch nicht vollständig)
5. Abschluss des Use Case Flows

DENKE DARAN: Du definierst die STRUKTUR für spätere Endkunden-Nutzung!

FORMAT: Ein Use Case Struktur-Vorschlag im JSON-Format.`;
  } else if (mode === 'refine') {
    return `${basePrompt}

Im Verfeinerungsmodus sollst du:
1. Den bestehenden Dialog-Flow analysieren
2. Verbesserungsvorschläge machen
3. Lücken oder potenzielle Probleme identifizieren
4. Auf Klarheit und Benutzerfreundlichkeit achten
5. Sicherstellen, dass alle notwendigen Informationen erfasst werden`;
  } else if (mode === 'validate') {
    return `${basePrompt}

Im Validierungsmodus sollst du:
1. Den Dialog-Flow auf Vollständigkeit prüfen
2. Sicherstellen, dass keine kritischen Informationen fehlen
3. Logische Fehler oder Sackgassen im Flow identifizieren
4. Eine klare Ja/Nein-Antwort geben, ob der Flow vollständig und funktionsfähig ist
5. Konkrete Verbesserungsvorschläge machen, falls Probleme gefunden werden`;
  }
  
  return basePrompt;
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json() as DialogRequestPayload;
    const { messages, previousResponseId, mode = 'generate', parameters = {}, customer, current_steps, use_case_description, routing_info } = body;
    
    console.log('Eingehende Anfrage:', { 
      messageCount: messages?.length, 
      previousResponseId, 
      mode,
      parametersKeys: Object.keys(parameters),
      customer
    });
    const openAIApiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openAIApiKey) {
      return new Response(JSON.stringify({
        error: "OpenAI API-Schlüssel fehlt. Bitte setzen Sie die Umgebungsvariable 'OPENAI_API_KEY'."
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500
      });
    }

    if (!messages || !Array.isArray(messages)) {
      return new Response(JSON.stringify({
        error: "Fehlende oder ungültige Nachrichten. Bitte stellen Sie ein Array von Nachrichten bereit."
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400
      });
    }

    const systemPrompt = getSystemPrompt(mode, routing_info);
    
    // Erstelle den Input-Text aus allen Nachrichten
    let conversationText = messages.map(msg => {
      const roleLabel = msg.role === 'user' ? 'Benutzer' : 'Assistent';
      return `${roleLabel}: ${msg.content}`;
    }).join('\n\n');
    
    // Für json_object Format muss das Wort 'json' im Input vorkommen
    if (mode === 'generate') {
      conversationText += '\n\nBitte antworte mit einem strukturierten JSON-Format für den Dialog-Flow.';
    }

    // Extrahiere Kunden- und Brancheninformationen aus den Parametern
    const metadata: Record<string, string> = {};
    
    if (customer?.name) {
      metadata.customer_name = customer.name;
    }
    if (customer?.industry) {
      metadata.customer_industry = customer.industry;
    }
    
    // Erweiterte Komplexitätserkennung - prüfe gesamten Kontext und Use Case Beschreibung
    const fullContext = `${conversationText} ${use_case_description || ''}`;
    const lowerContext = fullContext.toLowerCase();
    
    const complexityKeywords = [
      'meldet', 'melden', 'schaden', 'schadensmeldung',
      'kündigung', 'kündigungsfristen', 'vertragsart',
      'reparatur', 'reparaturanfrage', 'wartung',
      'problem', 'probleme', 'störung',
      'anfrage', 'anfragen', 'antrag',
      'unterschiedlich', 'je nach', 'abhängig von',
      'verschiedene', 'variiert', 'unterscheiden',
      'typ', 'art', 'kategorie', 'sorte'
    ];
    
    const isComplexityCandidate = complexityKeywords.some(keyword => 
      lowerContext.includes(keyword)
    );
    
    // Zusätzlich: Prüfe ob es der erste Use Case Schritt ist (noch keine current_steps)
    const isFirstStep = !current_steps || current_steps.length === 0;
    
    // Bei potentiell komplexen Use Cases Text-Format verwenden für Klärungsfragen
    const useTextFormat = isComplexityCandidate && isFirstStep && mode === 'generate';
    
    console.log('Komplexitätserkennung:', {
      fullContext: fullContext.substring(0, 100),
      isComplexityCandidate,
      isFirstStep,
      useTextFormat
    });
    
    const payload: OpenAIPayload = {
      model: "gpt-4.1-2025-04-14",
      instructions: systemPrompt,
      input: conversationText,
      temperature: 1.0,
      metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
      text: {
        format: {
          type: useTextFormat ? 'text' : (mode === 'generate' ? 'json_object' : 'text')
        }
      }
    };
    
    // Response ID für Thread-Fortsetzung hinzufügen, wenn vorhanden
    if (previousResponseId) {
      payload.previous_response_id = previousResponseId;
    }

    const openAIResponse = await callOpenAI(openAIApiKey, payload);
    console.log('OpenAI Antwort:', JSON.stringify(openAIResponse));
    
    // Response ID extrahieren für Thread-Fortsetzung
    const responseId = openAIResponse.id || openAIResponse.response_id || '';
    
    // Nachricht und Dialog-Flow extrahieren
    let messageContent = '';
    let dialogFlow = null;
    let flowExtracted = false;
    
    // Extrahiere Content aus der Responses API Antwort
    if (openAIResponse.output && openAIResponse.output.length > 0 && 
        openAIResponse.output[0].content && openAIResponse.output[0].content.length > 0 && 
        openAIResponse.output[0].content[0].text) {
      // Responses API Format
      messageContent = openAIResponse.output[0].content[0].text;
      console.log('Extrahierter Content (Responses API):', messageContent);
    } else {
      console.warn('Konnte Content aus Responses API nicht extrahieren:', openAIResponse);
      messageContent = 'Ich konnte keine passende Antwort generieren. Bitte versuche es mit einer anderen Anfrage.';
    }
    
    // Versuche, einen Dialog-Flow aus dem JSON zu extrahieren (nur wenn JSON-Format erwartet wird)
    if (mode === 'generate' && !useTextFormat && messageContent.includes('{') && messageContent.includes('}')) {
      try {
        // Direktes JSON-Parsen versuchen
        const parsedContent = JSON.parse(messageContent);
        
        // Prüfe, ob es ein valider Dialog-Flow ist (hat 'steps' oder 'nodes' Property)
        if (parsedContent.steps || parsedContent.nodes) {
          dialogFlow = parsedContent;
          flowExtracted = true;
          
          // Nur bei echtem Dialog-Flow die Erfolgsnachricht setzen
          messageContent = 'Ich habe einen Dialog-Flow für dich erstellt. Du kannst ihn in der Vorschau-Ansicht sehen.';
        } else {
          // Kein Dialog-Flow, sondern z.B. Nachfragen - originale OpenAI-Antwort beibehalten
          console.log('JSON enthält keinen Dialog-Flow, behalte originale Antwort bei');
          // messageContent bleibt unverändert (originale OpenAI-Antwort)
        }
      } catch (error) {
        console.warn('Dialog-Flow konnte nicht als JSON geparst werden:', error);
        
        // Fallback: Nach JSON in Text suchen
        try {
          dialogFlow = extractDialogFlowFromText(messageContent);
          if (dialogFlow && (dialogFlow.steps || dialogFlow.nodes)) {
            flowExtracted = true;
            messageContent = 'Ich habe einen Dialog-Flow für dich erstellt. Du kannst ihn in der Vorschau-Ansicht sehen.';
          }
        } catch (secondError) {
          console.warn('Dialog-Flow konnte auch nicht extrahiert werden:', secondError);
        }
      }
    }

    return new Response(JSON.stringify({
      message: messageContent,
      response_id: responseId,
      dialog_flow: dialogFlow,
      flow_extracted: flowExtracted
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
    
  } catch (error) {
    console.error('Fehler in der Edge Function:', error);
    return new Response(JSON.stringify({
      error: "Interner Serverfehler",
      message: error instanceof Error ? error.message : String(error)
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
