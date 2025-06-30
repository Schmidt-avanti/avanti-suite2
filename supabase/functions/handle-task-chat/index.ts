import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0';
import OpenAI from 'https://esm.sh/openai@4.20.1';

const sanitizeForTemplateLiteral = (str: string | undefined | null): string => {
  if (str === undefined || str === null) return '';
  // Escape backticks and ${ sequences
  return str.replace(/`/g, '\\`').replace(/\${/g, '\\${');
};

interface RequestBody {
  taskId: string;
  useCaseId?: string;
  message?: string;
  buttonChoice?: string;
  previousResponseId?: string;
  selectedOptions?: string[];
  isAutoInitialization?: boolean;
  generate_summary_on_demand?: boolean;
}

interface TaskMessageFromDB {
  id: string; 
  task_id: string;
  role: 'user' | 'assistant' | 'agent' | 'system' | string; 
  content: string | Record<string, any> | any[]; 
  created_at: string;
  // Add any other relevant fields if known
}

interface EndkundeContact {
  contact_type?: string | null;
  name?: string | null;
  phone?: string | null;
  email?: string | null;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function formatAssistantResponse(content: string): string {
  try {
    const parsed = JSON.parse(content);
    if (parsed && parsed.text) {
      return content; 
    }
  } catch (e) { /* ignore */ }

  try {
    const optionsPattern = /\[(.*?)\]/g;
    const matches = content.match(optionsPattern);
    if (matches && matches.length > 0) {
      const optionsText = matches[0];
      const optionsList = optionsText
        .replace(/[\[\]"]/g, '')
        .split(',')
        .map(option => option.trim());
      return JSON.stringify({
        text: content,
        options: optionsList
      });
    }
  } catch (e) { /* ignore */ }

  if (content.toLowerCase().includes('schlüssel') && 
      (content.toLowerCase().includes('verloren') || content.toLowerCase().includes('art von schlüssel'))) {
    return JSON.stringify({
      text: content,
      options: ["Hausschlüssel", "Wohnungsschlüssel", "Briefkastenschlüssel"]
    });
  }

  return JSON.stringify({
    text: content,
    options: []
  });
}

serve(async (req: Request): Promise<Response> => {
  console.log("%%%%%%% TEST-LOG: NEUE FUNKTIONSVERSION GELADEN (mit On-Demand-Summary) %%%%%%%");
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      taskId, 
      useCaseId, 
      message, 
      buttonChoice, 
      previousResponseId, 
      selectedOptions = [], 
      isAutoInitialization = false, 
      generate_summary_on_demand = false 
    } = await req.json() as RequestBody;

    console.log("Request received:", { 
      taskId, 
      useCaseId, 
      message: message ? "provided" : "empty", 
      buttonChoice,
      isAutoInitialization,
      generate_summary_on_demand
    });

    if (!taskId) {
      throw new Error('Task ID is required');
    }

    const openAIApiKey = Deno.env.get('OPENAI_API_KEY')!;
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase: SupabaseClient = createClient(supabaseUrl, supabaseServiceKey);
    const openai = new OpenAI({ apiKey: openAIApiKey });

    const { data: messagesFromDB, error: messagesError } = await supabase
      .from('task_messages')
      .select('*')
      .eq('task_id', taskId)
      .order('created_at', { ascending: true });

    if (messagesError) throw messagesError;
    const typedMessages: TaskMessageFromDB[] | null = messagesFromDB;

    let conversationMessages: { role: "system" | "user" | "assistant"; content: string; }[] = [];
    let systemPrompt = "";

    if (generate_summary_on_demand) {
      systemPrompt = `Du bist Ava, eine KI-Assistentin für Kundendienst-Agenten.
Der Agent hat entschieden, den aktuellen Vorgang manuell abzuschließen.
Deine Aufgabe ist es, den bisherigen Chat-Verlauf (siehe unten) prägnant und informativ für den Agenten zusammenzufassen.
Die Zusammenfassung sollte die wichtigsten Punkte des Kundenanliegens, die bereits getroffenen Klärungen und die erzielten Ergebnisse oder nächsten Schritte (falls vorhanden) umfassen.
Formuliere die Zusammenfassung so, dass der Agent sie als Grundlage für seinen Abschlusskommentar verwenden kann.
Gib NUR die Zusammenfassung als Text zurück. KEINE Optionen, KEINE zusätzliche Formatierung, KEINE einleitenden oder abschließenden Sätze wie "Hier ist die Zusammenfassung:".
Stelle sicher, dass deine Antwort ein valides JSON-Objekt ist, das nur ein Feld "summary_text" enthält, z.B. { "summary_text": "Deine Zusammenfassung hier." }`;

      conversationMessages.push({
        role: "system",
        content: systemPrompt
      });

      if (typedMessages) {
        typedMessages.forEach((msg: TaskMessageFromDB) => {
          if (msg.role === 'user' || msg.role === 'assistant') {
            const messageContent = typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content);
            if (msg.role === 'assistant') {
                try {
                    const parsedContent = JSON.parse(messageContent);
                    if (parsedContent && parsedContent.text) {
                        conversationMessages.push({ role: msg.role as "assistant", content: parsedContent.text });
                    }
                } catch (e) { /* ignore if not parsable or no .text */ }
            } else {
                 conversationMessages.push({ role: msg.role as "user", content: messageContent });
            }
          }
        });
      }
    } else {
      const { data: task, error: taskError } = await supabase
        .from('tasks')
        .select('*, customer:customers(*), endkunde:endkunden(*)')
        .eq('id', taskId)
        .single();
      if (taskError) throw taskError;
      if (!task) return new Response(JSON.stringify({ error: 'Task not found' }), { status: 404 });

      let useCase = null;
      if (useCaseId) {
        const { data: ucData, error: ucError } = await supabase.from('use_cases').select('*').eq('id', useCaseId).single();
        if (ucError) console.warn("Error fetching use case:", ucError.message); else useCase = ucData;
      }
      
      let endkundeData = null;
      if (task.endkunde_id) {
        const { data: ekData, error: ekError } = await supabase.from('endkunden').select('*').eq('id', task.endkunde_id).single();
        if (ekError) console.warn("Error fetching endkunde data:", ekError.message); else endkundeData = ekData;
      }

      let endkundeContactsData = null;
      if (task.endkunde_id) {
        const { data: ekContactsData, error: ekContactsError } = await supabase.from('endkunde_contacts').select('*').eq('endkunde_id', task.endkunde_id);
        if (ekContactsError) console.warn("Error fetching endkunde contacts:", ekContactsError.message); else endkundeContactsData = ekContactsData;
      }

      systemPrompt = `!!!! GRUNDREGELN FÜR DEINE ROLLE ALS AVA, KI-ASSISTENTIN FÜR KUNDENDIENST-AGENTEN !!!!
Du bist Ava, eine hochentwickelte KI-Assistentin, spezialisiert auf die Unterstützung von Kundendienst-Agenten in einem technischen Service-Unternehmen. Deine Hauptaufgabe ist es, den Agenten durch vordefinierte Use Cases zu führen, um Kundenanliegen effizient und korrekt zu bearbeiten. Du agierst als Werkzeug für den Agenten und sprichst den Agenten direkt an (z.B. "Bitte frage den Kunden..."). Du sprichst NICHT direkt mit dem Endkunden.

DEINE ANTWORTEN MÜSSEN IMMER IM FOLGENDEN JSON-FORMAT SEIN:
{ "text": "Deine Anweisung oder Frage an den Agenten...", "options": ["Option1", "Option2", ...], "action": "next_step" | "propose_completion" | "clarification_needed" | "human_handoff_suggested", "summary_draft": "(Nur bei propose_completion) Entwurf einer Zusammenfassung...", "text_to_agent": "(Optional) Zusätzliche Info nur für den Agenten...", "suggested_confirmation_text": "(Optional) Text für einen einzelnen Bestätigungsbutton, wenn 'options' leer ist und eine klare Handlungsbestätigung vom Agenten sinnvoll ist." }

- "text": Der Haupttext, den der Agent sieht und als Anweisung oder Frage versteht.
- "options": Eine Liste von Antwortmöglichkeiten für den Agenten. Wenn keine spezifischen Optionen sinnvoll sind, gib ein leeres Array [] zurück.
- "action": Definiert den Typ deiner Antwort:
    - "next_step": Standardaktion, du gibst den nächsten Schritt oder die nächste Frage vor.
    - "propose_completion": Du schlägst vor, den aktuellen Use Case abzuschließen, weil alle Informationen gesammelt wurden und das Ziel erreicht scheint. Dies ist ein wichtiger Punkt, den du aktiv erkennen sollst.
    - "clarification_needed": Du benötigst eine Klärung vom Agenten, weil die Eingabe unklar war oder der Use Case nicht eindeutig fortgesetzt werden kann.
    - "human_handoff_suggested": In seltenen, komplexen Fällen, die außerhalb deiner programmierten Fähigkeiten liegen, kannst du vorschlagen, dass der Agent den Fall manuell übernimmt.
- "summary_draft": NUR wenn action="propose_completion", enthält dieses Feld einen prägnanten Entwurf der Zusammenfassung des gesamten Vorgangs. Diese Zusammenfassung sollte das Problem, die wichtigsten Schritte und die Lösung/das Ergebnis umfassen.
- "text_to_agent": Optionale, zusätzliche Informationen, die NUR für den Agenten sichtbar sind und ihm Kontext oder Erklärungen liefern (z.B. warum eine bestimmte Frage gestellt wird).
- "suggested_confirmation_text": Wenn du eine klare Anweisung gibst (z.B. "Informiere den Kunden über X", "Prüfe Y im System") und keine multiplen 'options' anbietest (also 'options' leer ist oder leer sein sollte), kannst du hier einen prägnanten Text für einen einzelnen Bestätigungsbutton vorschlagen. Dieser Text sollte die vom Agenten ausgeführte Handlung widerspiegeln (z.B. "Kunde informiert", "Systemprüfung erfolgt"). Der Agent klickt diesen Button, um die Ausführung zu bestätigen und den Dialog fortzusetzen. Nutze dieses Feld nur, wenn es den Dialogfluss wirklich vereinfacht und eine explizite Bestätigung einer einzelnen Aktion sinnvoll ist.

VERHALTENSREGELN:
1.  **Use Case Führung**: Konzentriere dich darauf, den Agenten durch die Schritte des aktuellen Use Cases zu leiten. Frage die im Use Case definierten 'information_needed' ab.
2.  **Präzise Anweisungen**: Gib klare und unmissverständliche Anweisungen.
3.  **Effizienz**: Vermeide unnötige Fragen oder Wiederholungen. Wenn Informationen bereits aus dem Kontext (z.B. vorherige Nachrichten, Endkundendaten) bekannt sind, nutze sie.
4.  **Abschluss erkennen (propose_completion)**: Dies ist eine Kernfunktion. Wenn du basierend auf dem Use Case ('expected_result', 'steps') und dem Chatverlauf der Meinung bist, dass das Kundenanliegen vollständig bearbeitet wurde und alle notwendigen Informationen gesammelt wurden, SETZE action="propose_completion" UND liefere einen "summary_draft". Bedingungen für "propose_completion":
    *   Alle als 'information_needed' im Use Case definierten Informationen wurden abgefragt und plausible Antworten erhalten.
    *   Das 'expected_result' des Use Cases scheint erreicht.
    *   Die wesentlichen 'steps' des Use Cases wurden durchlaufen.
    *   Der Kunde hat keine weiteren offenen Fragen zum aktuellen Problem.
    *   Formuliere den "summary_draft" Problem- und Lösungsorientiert.
5.  **Kontextnutzung**: Berücksichtige den gesamten bisherigen Chatverlauf und die bereitgestellten Stammdaten (Endkunde, Use Case). Beziehe dich ggf. auf frühere Antworten.
6.  **JSON-Format**: Halte dich strikt an das vorgegebene JSON-Format für deine Antworten. JEDE Antwort muss dieses Format haben.
7.  **Keine direkte Kundenansprache**: Du kommunizierst NUR mit dem Agenten.
8.  **Umgang mit Unklarheiten**: Wenn eine Eingabe des Agenten unklar ist, setze action="clarification_needed" und bitte um Präzisierung.
9.  **Keine Halluzinationen**: Erfinde keine Informationen oder Use Case Schritte.
10. **Anpassung an den Agenten**: Deine Antworten sollten so formuliert sein, dass sie dem Agenten helfen, professionell und effizient mit dem Endkunden zu interagieren.
11. **Buttons/Optionen anbieten**: Nutze das "options"-Feld, um dem Agenten schnelle Antwortmöglichkeiten zu geben, die den Dialog vorantreiben. Dies ist besonders wichtig, um den Agenten effizient durch den Use Case zu führen.
    Wenn du stattdessen eine einzelne, klare Handlungsanweisung gibst, deren Ausführung der Agent bestätigen soll (und für die 'options' leer sein sollte), nutze das Feld "suggested_confirmation_text", um einen passenden Button-Text vorzuschlagen (z.B. "Kunde über Lieferzeit informiert", "Adresse im System korrigiert").
12. **Informationsabgleich**: Vergleiche die vom Agenten erhaltenen Informationen mit den 'information_needed' und dem 'expected_result' des Use Cases. Wenn Abweichungen auftreten oder Informationen fehlen, frage gezielt nach.
13. **Prozesslandkarte nutzen**: Wenn 'useCase.process_map' vorhanden ist, nutze diese strukturierte Information, um die Reihenfolge und Logik der Schritte besser zu verstehen und den Agenten entsprechend zu führen. Die Prozesslandkarte kann dir helfen, Abhängigkeiten zwischen Schritten zu erkennen.

BEISPIEL FÜR KORREKTE ANTWORTEN:

// Frage mit Ja/Nein
{ "text": "Stimmen Name und Adresse mit den gespeicherten Daten überein?", "options": ["Ja", "Nein"] }

// Auswahlfrage
{ "text": "Welchen Schlüssel hat der Kunde verloren?", "options": ["Haustürschlüssel", "Wohnungsschlüssel", "Kellerschlüssel"] }

// Klare Anweisung
{ "text": "Bitte gib dem Kunden nun die E-Mail-Adresse support@example.com bekannt.", "options": [] }

`;

      if (endkundeData) {
        systemPrompt += `

KONTEXT: ENDKUNDENDATEN SIND IM SYSTEM VORHANDEN.
Diese Daten sind für Dich (den Agenten) als Hintergrundinformation gedacht:
- Vorname: ${sanitizeForTemplateLiteral(endkundeData.Vorname)}
- Nachname: ${sanitizeForTemplateLiteral(endkundeData.Nachname)}
- Adresse: ${sanitizeForTemplateLiteral(endkundeData.Adresse)}
Nutze diese Informationen aktiv. Wenn Vorname, Nachname und Adresse des Endkunden bereits bekannt sind, stelle **keine** erneuten Fragen nach diesen spezifischen Daten, es sei denn, der aktuelle Use Case Schritt erfordert explizit eine Verifizierung oder die Klärung einer Abweichung. Diese Daten sollen NICHT direkt von Dir (Ava) dem Kunden genannt werden. Sie dienen Dir (dem Agenten) zur Orientierung und zur Formulierung von Bestätigungsfragen.` + 
        (endkundeContactsData && endkundeContactsData.length > 0 ? `

ZUSÄTZLICHE KONTAKTINFORMATIONEN SIND VERFÜGBAR:
${endkundeContactsData.map((contact: EndkundeContact) => `- ${sanitizeForTemplateLiteral(contact.contact_type || 'Kontakt')}: ${sanitizeForTemplateLiteral(contact.name || '')} (${sanitizeForTemplateLiteral(contact.phone || '')} / ${sanitizeForTemplateLiteral(contact.email || '')})`).join('\n')}
Prüfe zuerst, ob diese Kontakte für den aktuellen Schritt relevant sind (z.B. wenn der Agent nach 'Hausmeister' fragt und ein Hausmeister-Kontakt vorhanden ist), bevor Du generische Anweisungen gibst oder nach diesen Informationen fragst.` : '');
      }
      systemPrompt += `

ARBEITEN MIT USE CASE SCHRITTEN:
Der aktuelle Use Case ist:
- Titel: ${useCase?.title || 'Unbekanntes Anliegen'}
- Typ: ${useCase?.type || 'Unbekannt'}
- Benötigte Informationen vom Kunden laut Use Case ('information_needed'): ${useCase?.information_needed || 'Keine spezifischen Informationen explizit als "benötigt" definiert.'}
- Erwartetes Ergebnis laut Use Case ('expected_result'): ${useCase?.expected_result || 'Kein spezifisches erwartetes Ergebnis definiert. Konzentriere dich auf die Abarbeitung der Schritte.'}
- Vorgegebene Schritte im Use Case ('useCase.steps'): ${useCase?.steps || 'Keine spezifischen Schritte definiert.'}
${useCase?.process_map ? `- Prozessschritte gemäß Prozesslandkarte ('useCase.process_map'):\n${JSON.stringify(useCase.process_map, null, 2)}` : ''}

Führe den Agenten durch die notwendigen Schritte. Wenn alle Informationen gesammelt sind und das 'expected_result' erreicht ist, schlage den Abschluss vor (action: "propose_completion").
ERINNERE DICH AN DAS ZWINGENDE JSON-FORMAT FÜR JEDE ANTWORT: { "text": "Deine Anweisung...", "options": [...] }.`;

      conversationMessages.push({ role: "system", content: systemPrompt });

      if (typedMessages) {
        typedMessages.forEach((msg: TaskMessageFromDB) => {
          const messageContent = typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content);
          conversationMessages.push({ role: msg.role as "user" | "assistant", content: messageContent });
        });
      }

      if (!isAutoInitialization || (typedMessages && typedMessages.length > 0)) {
          if (message) {
              conversationMessages.push({ role: 'user', content: message });
          } else if (buttonChoice) {
              conversationMessages.push({ role: 'user', content: `Agent hat Option gewählt: ${buttonChoice}` });
          }
      }
    } // Ende if (generate_summary_on_demand) else

    console.log("Calling OpenAI with message count:", conversationMessages.length, "Mode:", generate_summary_on_demand ? "On-Demand Summary" : "Chat");

    const completion = await openai.chat.completions.create({
      model: 'gpt-4-1106-preview',
      messages: conversationMessages,
      response_format: { type: "json_object" },
      temperature: 0.2,
      max_tokens: generate_summary_on_demand ? 500 : 1500
    });

    const assistantResponseContent = completion.choices[0]?.message?.content;
    console.log("Raw OpenAI response content:", assistantResponseContent);

    if (!assistantResponseContent) {
      console.error("OpenAI response content is missing after API call.");
      throw new Error("OpenAI response content is missing.");
    }

    let responseToSendToClient = "";
    let assistantMessageContentForDB = assistantResponseContent; // Default to raw OpenAI response for DB saving
    let insertedAssistantMessageId: string | undefined = undefined;

    if (generate_summary_on_demand) {
      // Handle on-demand summary: send raw JSON, do not save to DB
      try {
        const parsedOpenAIResponse = JSON.parse(assistantResponseContent);
        if (parsedOpenAIResponse.summary_text) {
          responseToSendToClient = assistantResponseContent; // Send raw JSON summary
          console.log("Generated on-demand summary. Not saving to DB.");
        } else {
          // This case should ideally not happen if the prompt for summary is correct
          console.warn("On-demand summary requested, but 'summary_text' field missing in OpenAI response. Sending raw response.");
          responseToSendToClient = assistantResponseContent;
        }
      } catch (e) {
        console.error("Error parsing OpenAI response for on-demand summary. Sending raw response.", e);
        responseToSendToClient = assistantResponseContent; // Send raw content if parsing fails
      }
      // No DB operations for on-demand summary
    } else {
      // Handle regular chat interaction or propose_completion
      try {
        const parsedOpenAIResponse = JSON.parse(assistantResponseContent);
        if (parsedOpenAIResponse.action === "propose_completion") {
          responseToSendToClient = assistantResponseContent; // Send raw JSON for propose_completion
          assistantMessageContentForDB = assistantResponseContent; // Save raw JSON for propose_completion
          console.log("Detected 'propose_completion' action from OpenAI.");
        } else {
          // Standard chat response (might be structured JSON or plain text that needs formatting)
          responseToSendToClient = formatAssistantResponse(assistantResponseContent); // Format for client
          assistantMessageContentForDB = assistantResponseContent; // Save raw OpenAI response
        }
      } catch (e) {
        // Parsing failed, assume it's a standard string response from OpenAI that needs formatting
        responseToSendToClient = formatAssistantResponse(assistantResponseContent);
        assistantMessageContentForDB = assistantResponseContent; // Save raw OpenAI response
      }

      // --- Perform DB operations for regular chat --- 
      let insertedAgentMessageId: string | undefined = undefined;

      // 1. Save Agent's Message (if any)
      if (message || buttonChoice) {
        const agentMessageToSave = message || `Agent hat gewählt: "${buttonChoice}"`;
        const agentMessagePayload = {
          task_id: taskId,
          role: 'agent' as const,
          content: agentMessageToSave,
          previous_message_id: previousResponseId || null,
        };
        const { data: insertedAgentMsgArr, error: agentInsertError } = await supabase
          .from('task_messages')
          .insert([agentMessagePayload])
          .select('id')
          .limit(1);

        if (agentInsertError) {
          console.error('Error saving agent message:', agentInsertError);
        }
        if (insertedAgentMsgArr && insertedAgentMsgArr.length > 0) {
          insertedAgentMessageId = insertedAgentMsgArr[0].id;
        }
      }

      // 2. Save Assistant's (OpenAI's) Message
      const assistantMessagePayload = {
        task_id: taskId,
        role: 'assistant' as const,
        content: assistantMessageContentForDB,
        previous_message_id: insertedAgentMessageId || previousResponseId || null,
      };
      const { data: insertedAssistantMsgArr, error: assistantInsertError } = await supabase
        .from('task_messages')
        .insert([assistantMessagePayload])
        .select('id')
        .limit(1);

      if (assistantInsertError) {
        console.error('Error saving assistant message to DB:', assistantInsertError);
      } else if (insertedAssistantMsgArr && insertedAssistantMsgArr.length > 0) {
        insertedAssistantMessageId = insertedAssistantMsgArr[0].id;
        console.log("Assistant message saved to DB with ID:", insertedAssistantMessageId);
      }

      // 3. Update Task with last message info (only if assistant message was saved)
      if (insertedAssistantMessageId) {
        const { error: updateTaskError } = await supabase
          .from('tasks')
          .update({
            last_message_at: new Date().toISOString(),
            last_message_id: insertedAssistantMessageId,
          })
          .eq('id', taskId);

        if (updateTaskError) {
          console.error('Error updating task with last message info:', updateTaskError);
        }
      }
      // --- End of DB operations for regular chat ---
    }

    return new Response(
      JSON.stringify({
        response: responseToSendToClient,
        response_id: insertedAssistantMessageId, // Will be undefined for on-demand summary
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in handle-task-chat function:', error);
    let errorMessage = 'An unknown error occurred';
    let isRateLimitError = false;

    if (error instanceof Error) {
      errorMessage = error.message;
      isRateLimitError = error.message?.includes('rate limit');
    } else if (typeof error === 'string') {
      errorMessage = error;
      isRateLimitError = error.includes('rate limit');
    } else if (error && typeof error === 'object' && 'message' in error) {
      // Handle cases where error is an object with a message property but not an Error instance
      errorMessage = String(error.message);
      if (typeof error.message === 'string') {
        isRateLimitError = error.message.includes('rate limit');
      }
    }

    return new Response(
      JSON.stringify({
        error: errorMessage,
        is_rate_limit: isRateLimitError
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
